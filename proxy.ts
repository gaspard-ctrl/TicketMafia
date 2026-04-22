import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, isValidSessionCookie } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/api/slack");

  const session = request.cookies.get(COOKIES.session)?.value;
  const authed = isValidSessionCookie(session);

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/slack|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
