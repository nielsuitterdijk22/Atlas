import { redirect } from "next/navigation";

import { signOutAction } from "../lib/actions";
import { requireSession } from "../lib/session";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  const me = await requireSession();
  if (me.memberships.length > 0) redirect("/");

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Welcome to Atlas</h1>
        <p>
          Hi {me.user.displayName}. Is this workspace just for you, or for your team? Either way you&apos;ll be its
          first platform engineer.
        </p>
        <OnboardingFlow displayName={me.user.displayName} />
        <form action={signOutAction}>
          <button
            type="submit"
            className="btn"
            style={{ width: "100%", marginTop: 16, justifyContent: "center", background: "none", border: "none" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
