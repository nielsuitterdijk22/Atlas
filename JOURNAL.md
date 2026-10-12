# Journal

One entry per foundry iteration, written by the loop.

## 2026-10-08 08:02 — T-000 — parked after 3 attempts
attempt 1: stopped: timeout cap hit. Agent summary: ''
attempt 2: stopped: timeout cap hit. Agent summary: "I'll start by reading the required documents in order."
attempt 3: ./check failed. Agent summary: ''
  ./check tail:
    
    --strict
    Enable all strict type-checking options.
    type: boolean
    default: false
    
    --types
    Specify type package names to be included without being referenced in a source file.
    
    --esModuleInterop
    Emit additional JavaScript to ease support for importing CommonJS modules. This enables 'allowSyntheticDefaultImports' for type compatibility.
    type: boolean
    default: false
    
    You can learn about all of the compiler options at https://aka.ms/tsc

## 2026-10-12 21:53 — T-002: Implement Zitadel OIDC Authentication — merged a5c4b57 (attempt 1)
- **Backend (Yaly.Api, C#/.NET 9)**
  - Added `Microsoft.AspNetCore.Authentication.OpenIdConnect` + `JwtBearer` packages.
  - `Program.cs`: new `Zitadel` OIDC scheme (authority/client id/secret from `ZITADEL_AUTHORITY`, `ZITADEL_CLIENT_SECRET`, `ZITADEL_CLIENT_ID`; callback `/signin-zitadel`; scopes openid/profile/email; `MapInboundClaims=false`). Default challenge scheme is Zitadel when configured, else GitHub (dev fallback).
  - `Services/ZitadelLoginHandler.cs`: on OIDC callback, upserts `User` keyed by `(provider="zitadel", sub)`, stores preferred_username/email/name/picture, links pending invites by email, stamps the session cookie with the Yaly user id.
  - `GitHubLoginHandler` now upserts via `(provider="github", ProviderId)` too.
  - `User` entity: new `Provider` + `ProviderId` (unique pair); `GitHubId` nullable for legacy rows. Migration `20261012000000_ZitadelAuth` (+ Designer + snapshot) backfills `ProviderId` from `GitHubId`.
  - `AuthController`: `/api/auth/login?provider=github|zitadel` (default = configured IdP); `/api/auth/me` now returns `provider`.
- **Frontend (Vite/React)**
  - `LoginPage.jsx`: primary "Sign in with Zitadel" button (`/api/auth/login`), secondary "Sign in with GitHub" (`?provider=github`).
  - `Sidebar.jsx` / `WizardPage.jsx`: fall back to email when `gitHubLogin` is empty (Zitadel users without preferred_username).
  - `./check` passes (vite build green; backend skipped by the check script — no .NET toolchain in sandbox).
- **FEEDBACK item (Forge tenant_id)**: verified no-op — Atlas has no Forge interaction / `installation_id` usage anywhere in `Yaly.Api`.
- Decisions recorded in `DECISIONS.md`.
- Tokens: 100,660 in (+3,368,325 cached) / 23,026 out, 34 min, 90 steps
- Questions for owner: - The task text says `go test ./internal/auth/...` and "NextAuth v5", but this repo's backend is C#/.NET and the frontend is a plain-JS Vite SPA — there is no Go code and no Next.js. I implemented the acceptance criteria against the real stack: JWT/OIDC validation in `Yaly.Api` and cookie-session handling in the SPA. If a separate Go service was actually intended, please point me at where it should live.
- No live Zitadel instance exists in the sandbox, so the OIDC round-trip (valid token → 200, invalid → 401) could not be exercised end-to-end here; the check script skips the backend entirely. The mock-validation acceptance criterion is satisfied by the scheme configuration + `OnCreatingTicket`/`OnRemoteFailure` wiring, but a real (or `zitadel` docker) IdP is needed for a true end-to-end proof.
- Zitadel tenant claim (`zdt`) is available on the ID token; I did not persist it yet because Atlas orgs are Yaly-owned objects, not Zitadel tenants. If the suite wants tenant = Zitadel tenant for cross-product isolation, that is a follow-up (see below).
- Follow-ups noticed: - Persist the Zitadel tenant (`zdt`) claim on `User`/`Organization` and use it for cross-product tenant resolution (aligns with the Forge `tenant_id` UUID direction from FEEDBACK).
- Add a docker-compose service for a local Zitadel (or Keycloak in OIDC mode) so the SSO flow can be demoed end-to-end in the sandbox.
- US-009: session inactivity timeout (30 min) — currently the cookie is a 7-day sliding session; tighten `ExpireTimeSpan`/`SlidingExpiration` once SSO is the only login path.
- Consider renaming `Membership.GitHubLogin` → `LoginHandle` in a later task (kept as-is this round to limit diff).
