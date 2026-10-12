# Feedback

The owner writes here at check-ins. Agents read this first, every session. Newest at the top.
Delete items once they are handled. The loop commits your edits automatically.

## 2026-10-12 — from the owner, via the CTO (high priority)
The build system is confirmed to use plain JavaScript with Vite; do not attempt to add TypeScript, tsconfig.json, or tsc steps. The ./check script is fixed and green. Tasks T-000, T-016, and T-017 are obsolete and have been dropped. Proceed immediately to T-002 (Zitadel OIDC Authentication) as the next priority.

> The owner's words: Atlas ./check is green on main now (fixed by the harness in f8c9263: it builds the Vite frontend; the frontend is plain JavaScript, so there is no tsconfig and no tsc step). Atlas T-000, T-016, T-017 and T-001 (make ./check pass / fix TypeScript config / fix the check script) are obsolete: drop them and let Atlas move on to its feature work (T-002 should no longer need T-017).
