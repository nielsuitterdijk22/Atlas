// NextAuth (Auth.js v5) configuration for the Zitadel OIDC provider — ported
// from Quill's frontend/app/auth.ts. Zitadel is a public PKCE client (no
// secret); the access token from the auth-code exchange is surfaced on the
// session and forwarded to the Yaly backend as the bearer.
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
            },
          },
        }),
      ]
    : [],
  callbacks: {
    // Persist the Zitadel access token onto the NextAuth JWT so it can be
    // forwarded to the Yaly backend as the bearer.
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // Expose the access token on the session for client + server reads.
    async session({ session, token }) {
      (session as { accessToken?: string }).accessToken = token.accessToken as string | undefined;
      return session;
    },
    // Used by the NextAuth middleware: a signed-in user is authorized.
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});
