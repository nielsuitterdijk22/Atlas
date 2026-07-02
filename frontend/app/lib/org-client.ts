"use client";

// Client-side counterpart to session.ts's ORG_COOKIE handling — next/headers
// only works in Server Components, so client fetches read/write the same
// cookie via document.cookie instead.
export const ORG_COOKIE = "atlas_org";

export function getActiveOrgId(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ORG_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function setActiveOrgId(orgId: string): void {
  document.cookie = `${ORG_COOKIE}=${encodeURIComponent(orgId)}; path=/; max-age=31536000; samesite=lax`;
}
