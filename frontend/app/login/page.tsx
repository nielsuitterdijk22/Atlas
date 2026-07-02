import { redirect } from "next/navigation";

import { ZitadelSignInButton } from "../components/ZitadelSignInButton";
import { getSession } from "../lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="dot" style={{ width: 28, height: 28, borderRadius: 8 }} />
          <span>Yaly</span>
        </div>
        <p className="login-tagline">Self-service developer portal. Sign in to continue.</p>
        <ZitadelSignInButton label="Sign in" />
      </div>
    </div>
  );
}
