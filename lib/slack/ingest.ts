import { createServiceClient } from "@/lib/supabase/service";
import { getChannelName, getPermalink, getUserInfo, resolveMentions } from "./api";
import { slackToPlainText } from "./text";
import {
  STATUS_EMOJIS,
  categoryForChannel,
  type SlackMessageEvent,
  type SlackReactionEvent,
  type TicketStatus,
} from "./types";

// Slack subtypes we ignore (system messages, bot echoes, etc.)
const IGNORED_SUBTYPES = new Set([
  "channel_join",
  "channel_leave",
  "channel_topic",
  "channel_purpose",
  "channel_name",
  "bot_message",
  "thread_broadcast",
]);

function makeTitle(text: string): string {
  const cleaned = slackToPlainText(text);
  const firstLine = cleaned.split("\n")[0]?.trim() ?? "";
  if (firstLine.length === 0) return "(sans titre)";
  return firstLine.length > 120 ? firstLine.slice(0, 117) + "…" : firstLine;
}

export async function handleMessageEvent(event: SlackMessageEvent): Promise<void> {
  if (event.bot_id) return;
  if (event.subtype && IGNORED_SUBTYPES.has(event.subtype)) return;

  // Only ingest from the two configured channels.
  const category = categoryForChannel(event.channel);
  if (!category) return;

  // Edits / deletes: handle later if needed. For MVP we keep the original.
  if (event.subtype === "message_changed" || event.subtype === "message_deleted") {
    return;
  }

  const isThreadReply = !!event.thread_ts && event.thread_ts !== event.ts;

  if (isThreadReply) {
    await ingestThreadReply(event);
  } else {
    await ingestTopLevelMessage(event, category);
  }
}

async function ingestTopLevelMessage(
  event: SlackMessageEvent,
  category: "bugs" | "features"
): Promise<void> {
  const rawText = event.text ?? "";
  const supabase = createServiceClient();

  const [author, permalink, channelName, text] = await Promise.all([
    event.user ? getUserInfo(event.user) : Promise.resolve(null),
    getPermalink(event.channel, event.ts),
    getChannelName(event.channel),
    resolveMentions(rawText),
  ]);

  const { data: ticket, error } = await supabase
    .from("tickets")
    .upsert(
      {
        slack_channel_id: event.channel,
        slack_channel_name: channelName,
        slack_ts: event.ts,
        category,
        title: makeTitle(text),
        body: text,
        slack_author_id: event.user ?? null,
        author_name: author?.name ?? null,
        author_avatar: author?.avatar ?? null,
        slack_permalink: permalink,
      },
      { onConflict: "slack_channel_id,slack_ts", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (error) {
    console.error("ingest ticket failed", error);
    return;
  }

  if (event.files?.length && ticket) {
    const rows = event.files.map((f) => ({
      ticket_id: ticket.id,
      slack_file_id: f.id,
      url: f.url_private ?? f.url_private_download ?? f.permalink ?? "",
      name: f.name ?? null,
      mimetype: f.mimetype ?? null,
    }));

    const { error: attErr } = await supabase
      .from("ticket_attachments")
      .upsert(rows, { onConflict: "ticket_id,slack_file_id", ignoreDuplicates: true });

    if (attErr) console.error("ingest attachments failed", attErr);
  }
}

async function ingestThreadReply(event: SlackMessageEvent): Promise<void> {
  if (!event.thread_ts) return;
  const supabase = createServiceClient();

  // Find the parent ticket. If the parent message predates the bot we won't
  // have it — silently skip.
  const { data: parent } = await supabase
    .from("tickets")
    .select("id")
    .eq("slack_channel_id", event.channel)
    .eq("slack_ts", event.thread_ts)
    .maybeSingle();

  if (!parent) return;

  const [author, body] = await Promise.all([
    event.user ? getUserInfo(event.user) : Promise.resolve(null),
    resolveMentions(event.text ?? ""),
  ]);

  const { error } = await supabase.from("ticket_comments").upsert(
    {
      ticket_id: parent.id,
      source: "slack",
      slack_ts: event.ts,
      slack_user_id: event.user ?? null,
      author_name: author?.name ?? null,
      author_avatar: author?.avatar ?? null,
      body,
    },
    { onConflict: "ticket_id,slack_ts", ignoreDuplicates: true }
  );

  if (error) console.error("ingest comment failed", error);
}

export async function handleReactionEvent(event: SlackReactionEvent): Promise<void> {
  if (event.item.type !== "message") return;

  // Only act on tracked emojis.
  if (!STATUS_EMOJIS[event.reaction]) return;

  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("slack_channel_id", event.item.channel)
    .eq("slack_ts", event.item.ts)
    .maybeSingle();

  if (!ticket) return;

  if (event.type === "reaction_added") {
    await supabase.from("ticket_reactions").upsert(
      {
        ticket_id: ticket.id,
        slack_user_id: event.user,
        emoji: event.reaction,
      },
      { onConflict: "ticket_id,slack_user_id,emoji", ignoreDuplicates: true }
    );
  } else {
    await supabase
      .from("ticket_reactions")
      .delete()
      .eq("ticket_id", ticket.id)
      .eq("slack_user_id", event.user)
      .eq("emoji", event.reaction);
  }

  await recomputeStatus(ticket.id, ticket.status as TicketStatus);
}

// Status priority: any ✅ → done; else any 👀 → doing; else leave alone
// (the user may have set it manually to 'todo' or 'waiting').
async function recomputeStatus(ticketId: string, currentStatus: TicketStatus): Promise<void> {
  const supabase = createServiceClient();

  const { data: reactions } = await supabase
    .from("ticket_reactions")
    .select("emoji")
    .eq("ticket_id", ticketId);

  const emojis = new Set((reactions ?? []).map((r) => r.emoji));

  let nextStatus: TicketStatus = currentStatus;
  if (emojis.has("white_check_mark") || emojis.has("heavy_check_mark")) {
    nextStatus = "done";
  } else if (emojis.has("eyes")) {
    nextStatus = "doing";
  } else if (currentStatus === "done" || currentStatus === "doing") {
    // The reaction that drove the status was just removed → revert to 'todo'.
    nextStatus = "todo";
  }

  if (nextStatus !== currentStatus) {
    await supabase.from("tickets").update({ status: nextStatus }).eq("id", ticketId);
  }
}
