"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signOut } from "../auth";
import { createOrganization, linkQuillCatalog, listQuillProjects, type LinkQuillCatalogBody, type QuillProject } from "./api";
import { getToken, ORG_COOKIE } from "./session";

export async function signOutAction(): Promise<void> {
  cookies().delete(ORG_COOKIE);
  await signOut({ redirectTo: "/login" });
}

type CreateOrgResult = { orgId?: string; orgName?: string; error?: string };

/** Creates an organization — used by both onboarding paths (personal: name
 * derived from the user; team: user-chosen name). Deliberately does NOT set
 * ORG_COOKIE yet: doing so here would mutate cookies mid-flow, which makes
 * Next.js refresh the /onboarding route, re-run its `memberships.length > 0`
 * guard (now true), and redirect to "/" before the user ever sees the
 * catalog/Quill-linking step. The cookie is set in finishOnboardingAction
 * instead, once onboarding is actually done. */
async function createOrgAndActivate(name: string): Promise<CreateOrgResult> {
  const token = await getToken();
  try {
    const org = await createOrganization(name, { token });
    return { orgId: org.id, orgName: org.name };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create organization" };
  }
}

export async function startPersonalOnboarding(displayName: string): Promise<CreateOrgResult> {
  const first = displayName.trim().split(/\s+/)[0] || "My";
  return createOrgAndActivate(`${first}'s workspace`);
}

export async function startTeamOnboarding(name: string): Promise<CreateOrgResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Organization name is required" };
  return createOrgAndActivate(trimmed);
}

export async function fetchQuillProjectsAction(): Promise<{ projects?: QuillProject[]; error?: string }> {
  const token = await getToken();
  try {
    const projects = await listQuillProjects({ token });
    return { projects };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reach Quill" };
  }
}

export async function linkQuillCatalogAction(
  orgId: string,
  body: LinkQuillCatalogBody,
): Promise<{ ok?: boolean; error?: string }> {
  const token = await getToken();
  try {
    await linkQuillCatalog(orgId, body, { orgId, token });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to set up catalog storage in Quill" };
  }
}

export async function finishOnboardingAction(orgId: string): Promise<void> {
  cookies().set(ORG_COOKIE, orgId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}
