import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("ghm_session");

  if (req.nextUrl.pathname.startsWith("/dashboard") && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
