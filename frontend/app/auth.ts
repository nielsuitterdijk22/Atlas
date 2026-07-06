// NextAuth (Auth.js v5) configuration for the Zitadel OIDC provider — ported
// from Quill's frontend/app/auth.ts. Zitadel is a public PKCE client (no
// secret); the access token from the auth-code exchange is surfaced on the
// session and forwarded to the Atlas backend as the bearer.
import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";

const issuer = process.env.NEXT_PUBLIC_ZITADEL_ISSUER ?? "";
const clientId = process.env.NEXT_PUBLIC_ZITADEL_CLIENT_ID ?? "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: true,
  pages: { signIn: "/login" },
  providers: issuer
    ? [
        Zitadel({
          issuer,
          clientId,
          // Public PKCE client — no secret. Tell the OIDC client not to
          // authenticate at the token endpoint and to use PKCE + state.
          clientSecret: "",
          client: { token_endpoint_auth_method: "none" },
          checks: ["pkce", "state"],
          authorization: {
            params: {
              scope: `openid profile email offline_access urn:zitadel:iam:org:project:id:${process.env.NEXT_PUBLIC_ZITADEL_PROJECT_ID ?? "zitadel"}:aud`,
              // Sign-out only ends Atlas's own session, not Zitadel's IdP
              // session (see signOutAction in lib/actions.ts) — without this,
              // a live Zitadel session silently re-authenticates on sign-in
              // with no UI at all. select_account forces Zitadel's account
              // chooser every time instead.
              prompt: "select_account",
            },
          },
        }),
      ]
    : [],
  callbacks: {
    // Persist the Zitadel access + id tokens onto the NextAuth JWT so they can
    // be forwarded to the Atlas backend as the bearer.
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      return token;
    },
    // Expose the access + id tokens on the session for client + server reads.
    // idToken is needed as the id_token_hint on Zitadel's RP-initiated logout
    // (see signOutAction in lib/actions.ts) so signing out of Atlas also ends
    // the Zitadel IdP session instead of just the local app session.
    async session({ session, token }) {
      (session as { accessToken?: string; idToken?: string }).accessToken = token.accessToken as string | undefined;
      (session as { accessToken?: string; idToken?: string }).idToken = token.idToken as string | undefined;
      return session;
    },
    // Used by the NextAuth middleware: a signed-in user is authorized.
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});

// Builds the URL for Zitadel's RP-initiated logout
// (https://openid.net/specs/openid-connect-rpinitiated-1_0.html), looked up
// via discovery rather than hardcoded since the endpoint path has moved
// between Zitadel API versions. Returns undefined if the issuer isn't
// configured or discovery fails, so the caller can fall back to a plain
// local sign-out.
export async function getZitadelEndSessionUrl(
  idToken: string | undefined,
  postLogoutRedirectUri: string,
): Promise<string | undefined> {
  if (!issuer) return undefined;
  try {
    const res = await fetch(`${issuer}/.well-known/openid-configuration`);
    const config = (await res.json()) as { end_session_endpoint?: string };
    if (!config.end_session_endpoint) return undefined;
    const url = new URL(config.end_session_endpoint);
    if (idToken) url.searchParams.set("id_token_hint", idToken);
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
    return url.toString();
  } catch {
    return undefined;
  }
}
