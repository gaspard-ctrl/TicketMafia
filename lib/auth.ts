import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const APP_USERS = ["gaspard", "arthur"] as const;
export type AppUser = (typeof APP_USERS)[number];

const SESSION_COOKIE = "tm_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function appPassword(): string {
  return process.env.APP_PASSWORD ?? "Coachello123";
}

// Token derived from the password — knowing the token = knowing the password.
// Keyed HMAC so the cookie isn't a plain hash that could be precomputed.
function sessionToken(): string {
  const pwd = appPassword();
  return createHmac("sha256", pwd).update("tm-session-v1").digest("hex");
}

export function isAppUser(value: unknown): value is AppUser {
  return typeof value === "string" && (APP_USERS as readonly string[]).includes(value);
}

export function checkPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(appPassword());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  return isValidSessionCookie(session);
}

// Used by the proxy — needs to validate without next/headers.
export function isValidSessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  return value === sessionToken();
}

export const COOKIES = {
  session: SESSION_COOKIE,
};
