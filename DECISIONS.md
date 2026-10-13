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

## 2026-10-13 — T-003: server-side session row + middleware enforcement for inactivity expiry (US-009)
- **Decision**: Add a `Session` entity (one row per user: `LastActivityAt`, `InvalidatedAt?`) with a scoped `SessionService`. Middleware after `UseAuthentication` calls `TouchAsync` on every authenticated request: it refreshes `LastActivityAt` and, if the session is inactive longer than the timeout (default 30 min, `SESSION_INACTIVITY_TIMEOUT_MINUTES`) or invalidated, signs the cookie out and returns 401. `POST /api/auth/logout` calls `InvalidateAsync` + `SignOutAsync`; `GET /api/auth/me` returns `session.expiresInSeconds` so the client can arm its own countdown. The session cookie's `ExpireTimeSpan` was cut from 7 days to 24 h — the inactivity timeout is the real lifetime; the cookie just needs to outlive it.
- **Why**: US-009 requires the session to expire after inactivity AND to be killable on logout. A cookie-only sliding expiration cannot enforce an inactivity cap server-side, and an invalidated session must stop working even if the cookie is still presented.
- **Alternatives rejected**: (a) Stateless JWT with `exp` — cannot be revoked on logout. (b) Cookie-only with a short `ExpireTimeSpan` — the browser keeps the cookie until it lapses; a stolen cookie stays valid for the whole window and logout cannot kill it. (c) Per-session rows keyed by cookie (many rows per user) — one row per user is enough because a user has one concurrent portal session; `InvalidatedAt` is the kill switch.

## 2026-10-13 — T-003: client-side inactivity timer in `AuthContext`, auto-logout on expiry
- **Decision**: `AuthContext` arms a countdown from `session.expiresInSeconds` (from `/api/auth/me`, 30-min fallback) and resets it on activity (mousemove/mousedown/keydown/scroll/touchstart). On expiry it runs the same `signOut` as the button: POST `/api/auth/logout`, clear `yaly.activeOrg` + user state, redirect to `/`. The sign-out button in `Sidebar.jsx` (already present) calls this `signOut`.
- **Why**: The user should be logged out smoothly at the moment of inactivity expiry without waiting for their next request to get a 401; the server-side check remains the authoritative enforcement.
- **Alternatives rejected**: (a) Relying solely on the 401 middleware — works but the user sees an error flash mid-interaction instead of a clean redirect. (b) A global "session expired" modal with a re-login button — extra UI for a flow the story describes as automatic logout.

## 2026-10-13 — T-003: vitest + jsdom + Testing Library for the frontend logout tests
- **Decision**: Add `vitest`, `jsdom`, `@testing-library/react|dom|jest-dom` as devDependencies, a `test` block in `vite.config.js` (jsdom, globals, `src/test/setup.js`), and `"test": "vitest run"` in package.json so `./check` picks it up. The test file mocks `fetch` and patches `window._document._location`'s impl prototype to capture `href` assignments (jsdom makes `location.href` non-configurable).
- **Why**: The task's acceptance requires `npm run test` to pass for the logout flow, and the repo had no frontend test infrastructure at all.
- **Alternatives rejected**: (a) Jest + CRA-style setup — the repo is Vite; vitest reuses the Vite transform pipeline. (b) Asserting `window.location.href === 'http://localhost/'` — jsdom normalizes `href = '/'` to `'/'`; the test asserts the normalized value.
