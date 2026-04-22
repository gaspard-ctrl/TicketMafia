// Minimal subset of Slack Events API payloads we actually consume.

export type SlackFile = {
  id: string;
  name?: string;
  mimetype?: string;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
};

export type SlackMessageEvent = {
  type: "message";
  subtype?: string;          // e.g. 'channel_join', 'message_changed', 'message_deleted', 'bot_message'
  channel: string;
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
  thread_ts?: string;
  files?: SlackFile[];
  // Set on 'message_changed' subtype
  message?: { ts: string; text?: string; user?: string };
  previous_message?: { ts: string };
  // Set on 'message_deleted' subtype
  deleted_ts?: string;
};

export type SlackReactionEvent = {
  type: "reaction_added" | "reaction_removed";
  user: string;
  reaction: string;          // e.g. 'white_check_mark', 'eyes'
  item: { type: "message"; channel: string; ts: string };
};

export type SlackEventEnvelope =
  | { type: "url_verification"; challenge: string }
  | {
      type: "event_callback";
      event_id: string;
      event: SlackMessageEvent | SlackReactionEvent;
    };

export type TicketCategory = "bugs" | "features";
export type TicketStatus = "todo" | "doing" | "waiting" | "done";

// Emojis that drive status transitions.
export const STATUS_EMOJIS: Record<string, TicketStatus> = {
  white_check_mark: "done",
  heavy_check_mark: "done",
  eyes: "doing",
};

export function categoryForChannel(channelId: string): TicketCategory | null {
  if (channelId === process.env.SLACK_CHANNEL_BUGS_ID) return "bugs";
  if (channelId === process.env.SLACK_CHANNEL_FEATURES_ID) return "features";
  return null;
}
