import { NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/slack/signature";
import { handleMessageEvent, handleReactionEvent } from "@/lib/slack/ingest";
import type { SlackEventEnvelope } from "@/lib/slack/types";

// Slack expects a 200 within ~3 seconds. We respond fast and let processing
// finish in the background — Netlify functions stay alive long enough.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!verifySlackRequest({ rawBody, timestamp, signature })) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: SlackEventEnvelope;
  try {
    payload = JSON.parse(rawBody) as SlackEventEnvelope;
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // 1. Slack sends this once when you save the Events URL.
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type === "event_callback") {
    const evt = payload.event;
    try {
      if (evt.type === "message") {
        await handleMessageEvent(evt);
      } else if (evt.type === "reaction_added" || evt.type === "reaction_removed") {
        await handleReactionEvent(evt);
      }
    } catch (err) {
      // Log but always 200 — Slack retries on non-2xx.
      console.error("slack event handling failed", err);
    }
  }

  return new NextResponse("ok", { status: 200 });
}
