import { redirect } from "next/navigation";

import { AppTile } from "../components/icons/AppMarks";
import { ZitadelSignInButton } from "../components/ZitadelSignInButton";
import { getSession } from "../lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <AppTile app="atlas" size={28} />
          <span>Atlas</span>
        </div>
        <p className="login-tagline">Self-service developer portal. Sign in to continue.</p>
        <ZitadelSignInButton label="Sign in" />
      </div>
    </div>
  );
}
