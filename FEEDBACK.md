# Feedback

The owner writes here at check-ins. Agents read this first, every session. Newest at the top.
Delete items once they are handled. The loop commits your edits automatically.

## 2026-10-13 — decided by the CTO
Atlas is a C#/.NET application (Yaly.Api). Do not use Go-specific acceptance criteria (e.g., `go test`) for Atlas tasks. Acceptance criteria must target the .NET toolchain (e.g., `dotnet test` or `dotnet build`) or the frontend vitest suite. If the sandbox lacks the .NET toolchain, the agent should verify code correctness via static pattern-matching against existing implementations and mark the task complete if the logic is sound, noting the toolchain limitation in the task log.

> Answering: Atlas T-003 (Implement Session Expiration and Logout) asks:

## 2026-10-12 — decided by the CTO
T-002 is accepted as implemented in C#/.NET. Do NOT build a Go service. For tenant isolation, persist the `tenant_id` UUID from the OIDC token's `tenant_id` claim (or map from `zdt` if the IdP is configured 1:1, but prefer an explicit `tenant_id` claim injected by the identity provider). Do not use `zdt` directly as the suite `tenant_id` unless the suite tenant and Zitadel tenant are explicitly mapped 1:1 in the IdP configuration. Ensure the `X-Tenant-Id` header is set from this persisted value for downstream calls.

> Answering: Atlas T-002 (Implement Zitadel OIDC Authentication) asks:

## 2026-10-12 — decided by the CTO
Forge has migrated the `tenants` table from `installation_id` to `tenant_id UUID`. Ensure that any Atlas code interacting with Forge (e.g., for provisioning or tenant resolution) uses the `tenant_id` UUID. If Atlas currently keys on `installation_id` for Forge interactions, update it to use `tenant_id`.

> Answering: Forge T-015 (Implement admin create-tenant CLI command) asks:

## 2026-10-12 — from the owner, via the CTO (high priority)
The build system is confirmed to use plain JavaScript with Vite; do not attempt to add TypeScript, tsconfig.json, or tsc steps. The ./check script is fixed and green. Tasks T-000, T-016, and T-017 are obsolete and have been dropped. Proceed immediately to T-002 (Zitadel OIDC Authentication) as the next priority.

> The owner's words: Atlas ./check is green on main now (fixed by the harness in f8c9263: it builds the Vite frontend; the frontend is plain JavaScript, so there is no tsconfig and no tsc step). Atlas T-000, T-016, T-017 and T-001 (make ./check pass / fix TypeScript config / fix the check script) are obsolete: drop them and let Atlas move on to its feature work (T-002 should no longer need T-017).
