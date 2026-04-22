import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, isValidSessionCookie } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(COOKIES.session)?.value;
  if (isValidSessionCookie(session)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run only on protected routes. Excluded:
    //  - Next internals + static assets (default)
    //  - /api/slack/*  → verified by Slack signature, not by session
    //  - /login        → static page served from CDN, no function invocation
    "/((?!_next/static|_next/image|favicon.ico|api/slack|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
