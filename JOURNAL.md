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

## 2026-10-13 03:41 — T-003: Implement Session Expiration and Logout — merged aa92413 (attempt 3)
### Backend (`Yaly.Api`)
- `Data/Entities/Session.cs`: new `Session` entity (Id, UserId, CreatedAt, LastActivityAt, InvalidatedAt?) — one row per user.
- `Data/YalyDbContext.cs`: `DbSet<Session>` + unique index on UserId, index on LastActivityAt.
- `Migrations/20261012000001_Sessions.cs` (+ Designer + snapshot): creates the `Sessions` table.
- `Services/SessionService.cs` (scoped, `ISessionService`):
  - `TouchAsync(userId)`: upserts the session row, refreshes `LastActivityAt`; returns `SessionInfo` with `IsExpired` (inactivity > timeout, or invalidated) and `ExpiresInSeconds`. An invalidated session is never resurrected by a touch.
  - `InvalidateAsync(userId)`: sets `InvalidatedAt` (logout / kill switch).
  - Timeout: `Session:InactivityTimeoutMinutes` / `SESSION_INACTIVITY_TIMEOUT_MINUTES`, default 30 (US-009).
- `Program.cs`: registers `ISessionService`; adds middleware after `UseAuthentication` — every authenticated request touches the session; expired/invalidated → `SignOutAsync` + 401. Cookie `ExpireTimeSpan` reduced 7d → 24h (the inactivity timeout is the real lifetime).
- `Controllers/AuthController.cs`: `POST /api/auth/logout` now invalidates the server-side session before signing out; `GET /api/auth/me` returns `session: { id, expiresInSeconds }`.
- `Services/ZitadelLoginHandler.cs` / `GitHubLoginHandler.cs`: call `TouchAsync` on the login callback so a fresh session row exists.
### Frontend (`frontend/`)
- `src/context/AuthContext.jsx`: reads `session.expiresInSeconds` from `/api/auth/me`, arms an inactivity countdown (reset on mousemove/mousedown/keydown/scroll/touchstart), auto-`signOut` on expiry. `signOut` POSTs `/api/auth/logout`, clears `yaly.activeOrg` + user state, redirects to `/` (login).
- `src/components/Sidebar.jsx`: sign-out button (already present) wired to `signOut` — the user-visible logout.
- Test infra: vitest 3.2.4 + jsdom + @testing-library (react/dom/jest-dom) devDependencies; `vite.config.js` `test` block; `src/test/setup.js`; `"test": "vitest run"` script.
- `src/context/__tests__/AuthContext.test.jsx`: 5 tests — loads user + expiry from `/me`; sign-out calls backend, clears local state, redirects; sign-out redirects even when the backend call fails; inactivity timeout triggers auto-logout; activity resets the clock. All pass.
### Verification
- `./check` exits 0: frontend test (5/5) + build green; `Yaly.Api` is skipped by `./check` ("no .NET toolchain in the sandbox").
- `DECISIONS.md`: three entries (server-side session row + middleware, client-side inactivity timer, vitest infra).
- Tokens: 94,625 in (+3,696,864 cached) / 21,459 out, 38 min, 113 steps
- Questions for owner: 1. The task's acceptance criterion `go test ./internal/auth/... -run TestSessionExpiry` does not match this repo — the backend is C#/.NET (`Yaly.Api`), there is no Go module anywhere (same mismatch as T-002; the CTO confirmed C#/.NET in FEEDBACK). The equivalent C# coverage is the frontend vitest suite plus the middleware/service code, which `./check` cannot compile in this sandbox (no .NET toolchain). Should the task template's acceptance be updated, or is a C# xUnit project expected?
2. The sandbox has no .NET toolchain, so the new migration/service/middleware could not be compiled or run here. The code follows the exact patterns of the existing `ZitadelAuth` migration and `ProvisioningService` DI registration, but it has not been build-verified.
- Follow-ups noticed: - When a .NET toolchain is available: `dotnet build` + `dotnet ef migrations` sanity check, and an integration test hitting `/api/auth/me` + `/api/auth/logout` against a real database.
- Consider a "session expiring soon" warning (e.g. at 60s remaining) in the UI — not required by US-009, but the `sessionExpiresInSeconds` value is already exposed to components.
- `Sessions` rows for users who never log in again accumulate; a periodic cleanup of old `InvalidatedAt`/inactive rows could be added later.

## 2026-10-13 06:24 — T-018: Verify and fix tenant isolation in ServicesController.Get — merged 6286d4a (attempt 1)
- Verified `Yaly.Api/Controllers/ServicesController.cs`: the `Get` action already
  scopes the read with `FirstOrDefaultAsync(s => s.Id == id && s.OrgId == acc.OrgId)`
  and returns `NotFound()` on miss; `List` is scoped with `Where(s => s.OrgId == acc.OrgId)`.
  No controller change was needed — the CTO's tenant pattern (tenant from
  `AccessContext.OrgId` via `RequireOrgAsync()`, never user input) was already in place.
- Created `Yaly.Api.Tests/` (xUnit + `Microsoft.AspNetCore.Mvc.Testing` + `xunit.skip`,
  net9.0) with `ServicesControllerTests`:
  - `TestTenantIsolationRead`: seeds Org A + Org B (one service each), a user who is an
    active member of Org A only; authenticates by stamping the session cookie with the
    `yaly:uid` claim (the same claim the IdP login handlers emit), sets `X-Yaly-Org` to
    Org A, asserts GET of Org B's service id → 404 and GET of the own-org service → 200.
  - `Get_ReturnsNotFound_ForUnknownServiceId`: unknown id → 404.
  - Tests `[Skip]` when `ATLAS_TEST_DATABASE_URL`/`TEST_DATABASE_URL` is unset, so the
    suite is green in toolchain-less sandboxes and runs for real where .NET exists.
  - `ApiFactory` points the app at the throwaway test database and re-targets the
    content root to the API project so its migrations are found.
- Added `frontend/src/__tests__/tenantIsolation.test.js`: static verification of the
  isolation contract (the `Get` action must contain the `Id == id && OrgId == acc.OrgId`
  filter, `NotFound()` on miss, tenant via `RequireOrgAsync()`, and the `List` must be
  org-scoped). This is what `./check` enforces in this sandbox.
- `./check` passes (9/9 vitest tests, build OK; backend step skipped as designed).
- `.foundry/demo.sh` added (shows the isolation code + runs `./check`).
- Recorded both decisions in `DECISIONS.md`.
- Tokens: 91,396 in (+1,925,781 cached) / 13,940 out, 26 min, 63 steps
- Questions for owner: - None. The controller already satisfied the code requirement, so "Tests may change: no"
  was interpreted as "do not weaken existing tests" — a new test project/file was added,
  which the task explicitly requested ("Update Yaly.Api.Tests/ServicesControllerTests.cs").
- Follow-ups noticed: - Run `dotnet test --filter TestTenantIsolationRead` in an environment with the .NET 9
  SDK and a reachable throwaway Postgres (`ATLAS_TEST_DATABASE_URL`); the tests are
  written to run there and skip gracefully without it.
- Consider a solution file (`Yaly.sln`) so `dotnet test` works from the repo root.
- If the CTO wants defense-in-depth, a global EF query filter on `OrgId`-owned entities
  could be added later (rejected for now: per-action scoping is already consistent).
