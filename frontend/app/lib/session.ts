// Server-only session helpers. Identity comes from Zitadel via NextAuth
// (app/auth.ts); the Zitadel access token is forwarded to the Go backend as
// the bearer, which verifies it against Zitadel's JWKS (mirrors Quill's
// lib/session.ts). Atlas's own Organization/Membership model still governs
// which orgs a user belongs to and their role there — Zitadel only answers
// "who is this person."
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../auth";
import { fetchMe, type Me, type Membership } from "./api";

export const ORG_COOKIE = "atlas_org";

export async function getToken(): Promise<string | undefined> {
  const session = await auth();
  return (session as { accessToken?: string } | null)?.accessToken;
}

export function getOrgId(): string | undefined {
  return cookies().get(ORG_COOKIE)?.value || undefined;
}

export async function getSession(): Promise<Me | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return await fetchMe({ token });
  } catch {
    return null;
  }
}

/** Redirects to /login when there is no signed-in user. */
export async function requireSession(): Promise<Me> {
  const me = await getSession();
  if (!me) redirect("/login");
  return me;
}

/** The org the caller currently has selected, falling back to their first
 * membership when the cookie is unset or points at an org they've left. */
export function resolveActiveOrg(me: Me, orgIdCookie?: string): Membership | null {
  const valid = me.memberships.find((m) => m.orgId === orgIdCookie);
  return valid ?? me.memberships[0] ?? null;
}

/** Gates a route on having both a session and an active org membership,
 * redirecting to /login or /onboarding as appropriate. */
export async function requireOrg(): Promise<{ me: Me; org: Membership; token: string }> {
  const me = await requireSession();
  if (me.memberships.length === 0) redirect("/onboarding");
  const org = resolveActiveOrg(me, getOrgId())!;
  const token = (await getToken())!;
  return { me, org, token };
}
