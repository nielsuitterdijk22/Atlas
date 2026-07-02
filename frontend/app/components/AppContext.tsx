"use client";

import { createContext, useContext } from "react";

import type { Membership, User } from "../lib/api";

export type AppCtx = {
  user: User;
  memberships: Membership[];
  orgId: string;
  orgName: string;
  role: "developer" | "platform-engineer";
  isPlatformEngineer: boolean;
  /** Zitadel access token, forwarded to the backend as the bearer on every call. */
  token: string;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ value, children }: { value: AppCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Resolved once per navigation by (app)/layout.tsx from the session + active-org
 * cookie — client pages read it here instead of re-deriving it themselves. */
export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within the (app) route group");
  return ctx;
}
