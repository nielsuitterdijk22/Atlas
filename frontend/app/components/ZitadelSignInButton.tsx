"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function ZitadelSignInButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="login-btn"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("zitadel", { callbackUrl: "/" });
      }}
    >
      {pending ? "Redirecting…" : label}
    </button>
  );
}
