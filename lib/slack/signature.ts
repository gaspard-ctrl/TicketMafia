import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SECONDS = 60 * 5; // Slack's recommendation — reject older requests

export function verifySlackRequest(opts: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
}): boolean {
  const { rawBody, timestamp, signature } = opts;
  const secret = process.env.SLACK_SIGNING_SECRET;

  if (!secret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + createHmac("sha256", secret).update(base).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
