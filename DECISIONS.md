# Decisions

Append-only log of design decisions: date, decision, why, alternatives rejected.

## 2026-10-12 — T-002: Zitadel OIDC via ASP.NET Core OpenIdConnect, GitHub kept as dev fallback
- **Decision**: Add the `Zitadel` OpenIdConnect scheme (authority/client id/secret from `ZITADEL_AUTHORITY` / `ZITADEL_CLIENT_ID` / `ZITADEL_CLIENT_SECRET`) alongside the existing GitHub OAuth scheme. The default challenge scheme is Zitadel when both env vars are set, otherwise GitHub. `/api/auth/login` accepts `?provider=github|zitadel`.
- **Why**: The suite standard is one shared Zitadel identity across all four products (SUITE.md), while the existing GitHub flow must keep working for local dev where no Zitadel instance exists.
- **Alternatives rejected**: (a) Replacing GitHub with Zitadel outright — breaks local dev with no IdP. (b) A Go backend with hand-rolled JWT validation — the repo's backend is C#/.NET (`Yaly.Api`); the task text's Go/NextAuth references do not match this codebase. (c) NextAuth v5 in the frontend — the frontend is a plain-JS Vite SPA with cookie sessions; a server-side OIDC flow in the API is simpler and matches the existing GitHub pattern.

## 2026-10-12 — T-002: generalize `User` identity to (Provider, ProviderId)
- **Decision**: `User` gains `Provider` ("zitadel" | "github") and `ProviderId` (the IdP subject string), unique together. `GitHubId` becomes nullable and is kept only for legacy rows; the unique index moves from `GitHubId` to `(Provider, ProviderId)`. Migration `20261012000000_ZitadelAuth` backfills `ProviderId` from `GitHubId` for existing users.
- **Why**: Zitadel subjects are strings (e.g. `users/...`), not numeric GitHub ids, so the old `long GitHubId` key cannot hold them.
- **Alternatives rejected**: (a) A separate `ZitadelId` string column with two unique indexes — duplicates identity logic and complicates every lookup. (b) Dropping `GitHubId` — loses the numeric id some legacy queries may rely on; keeping it nullable is cheaper.

## 2026-10-12 — T-002: `Membership.GitHubLogin` is a generic "login handle"
- **Decision**: The membership invite key (`GitHubLogin`) is treated as a provider-neutral login handle. GitHub logins store the GitHub login; Zitadel users store their `preferred_username` (or email if absent). Pending invites for Zitadel users are matched by email.
- **Why**: Renaming the column would churn the API, frontend and migrations for no user-visible gain; the column already means "the string a human types to invite someone".
- **Alternatives rejected**: (a) Renaming to `LoginHandle` across entity/API/frontend — larger diff, same behavior. (b) Matching invites by the Zitadel subject — humans don't know their subject strings; email is the practical invite key.

## 2026-10-12 — FEEDBACK: Forge tenant resolution uses `tenant_id` UUID
- **Decision**: No Atlas code change required.
- **Why**: Searched `Yaly.Api` for `installation_id` / `tenant` references — Atlas does not interact with Forge at all (no Forge client, no tenant resolution); provisioning talks to Quill/Tempo only. The FEEDBACK item is recorded as verified-no-op.
- **Alternatives rejected**: none — nothing to change.
