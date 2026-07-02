// Route protection middleware, backed by NextAuth's Zitadel session (app/auth.ts).
import { NextResponse } from "next/server";

import { auth } from "./app/auth";

// /api/* (other than /api/auth, NextAuth's own routes) proxies to the Go
// backend — those calls carry their own bearer token (see lib/api.ts) and must
// not be redirected to /login by this page-level gate; the backend already
// returns 401 for unauthenticated calls.
const PUBLIC_ROUTES = [/^\/login(?:\/.*)?$/, /^\/api\/(?:auth|me|orgs|templates|services|requests|admin|quill)(?:\/.*)?$/];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((re) => re.test(pathname));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname) || req.auth?.user) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
