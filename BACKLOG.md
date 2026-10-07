# Backlog

Ordered: agents take the top task under **Todo**, one per run. Foundry moves tasks
to **Parked** or **Done** itself — keep the `### T-NNN: Title` headings and fields intact.

## Todo

### T-000: Make ./check pass on main
- Story: (infrastructure)
- Accept: `./check` exits 0
- Tests may change: yes

Fix the code (preferred) or the check script so every step passes. Do not
delete tests to get green; if a test is genuinely obsolete, explain it in summary.md.
Last output:
```
1.weakref/esnext.weakref, es2021.intl, es2022.array, es2022.error, es2022.intl, es2022.object, es2022.sharedmemory, es2022.string, es2022.regexp, es2023.array, es2023.collection, es2023.intl, esnext.array, esnext.collection, esnext.intl, esnext.disposable, esnext.string, esnext.promise, esnext.decorators, esnext.object, esnext.regexp, esnext.iterator, decorators, decorators.legacy
default: undefined

--allowJs
Allow JavaScript files to be a part of your program. Use the 'checkJS' option to get errors from these files.
type: boolean
default: false

--checkJs
Enable error reporting in type-checked JavaScript files.
type: boolean
default: false

--jsx
Specify what JSX code is generated.
one of: preserve, react, react-native, react-jsx, react-jsxdev
default: undefined

--outFile
Specify a file that bundles all outputs into one JavaScript file. If 'declaration' is true, also designates a file that bundles all .d.ts output.

--outDir
Specify an output folder for all emitted files.

--removeComments
Disable emitting comments.
type: boolean
default: false

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

```

### T-001: Establish Foundation: Make ./check Pass
- Story: US-008
- Accept: Run `./check` in the repository root; exit code must be 0.
- Tests may change: no

Fix any failing Go tests, linting errors, or TypeScript build errors in the backend and frontend to ensure the baseline is green before adding new features.

### T-002: Implement Zitadel OIDC Authentication
- Story: US-008
- Accept: 1. `go test ./internal/auth/...` passes.
2. `npm run build` in frontend passes.
3. Mock Zitadel token validation returns 200 for valid JWT, 401 for invalid.
- Tests may change: no
- Needs: T-000

Backend: Add JWT validation middleware for Zitadel tokens, extract user/tenant claims. Frontend: Configure NextAuth v5 with Zitadel provider, set up session handling and middleware for protected routes.

### T-003: Implement Session Expiration and Logout
- Story: US-009
- Accept: 1. `go test ./internal/auth/... -run TestSessionExpiry` passes.
2. `npm run test` in frontend passes for logout flow.
- Tests may change: no
- Needs: T-001

Backend: Implement session invalidation endpoint and inactivity check. Frontend: Add logout button that calls backend invalidation and clears local session, redirecting to login.

### T-004: Implement Tenant Isolation on Read Operations
- Story: US-012
- Accept: 1. `go test ./internal/handlers/... -run TestTenantIsolationRead` passes.
2. Query for Tenant A service in Tenant B returns 404.
- Tests may change: no
- Needs: T-001

Backend: Add `tenant_id` filtering to all SQL queries in the service catalog and detail endpoints. Ensure the `tenant_id` is derived from the authenticated user's claims, not user input.

### T-005: Implement Tenant Isolation on Write Operations
- Story: US-013
- Accept: 1. `go test ./internal/handlers/... -run TestTenantIsolationWrite` passes.
2. Attempting to update a service in Tenant B while in Tenant A returns 404 and no DB write occurs.
- Tests may change: no
- Needs: T-004

Backend: Ensure all INSERT and UPDATE statements for services and templates include `tenant_id` in the WHERE clause and data payload. Validate that the target resource belongs to the current tenant before writing.

### T-006: Implement Search Service Catalog
- Story: US-003
- Accept: 1. `go test ./internal/handlers/... -run TestSearchCatalog` passes.
2. Searching for 'payment' returns only matching services within 200ms.
- Tests may change: no
- Needs: T-004

Backend: Add `/api/services/search?q=...` endpoint. Use Postgres full-text search or ILIKE for name and tags. Ensure results are filtered by `tenant_id`.

### T-007: Implement View Service Details with Live Links
- Story: US-004
- Accept: 1. `go test ./internal/handlers/... -run TestServiceDetails` passes.
2. `npm run build` in frontend passes.
3. API returns owner email, linked PRs, and tickets for a service.
- Tests may change: no
- Needs: T-004

Backend: Add `/api/services/{id}` endpoint returning service details, owner info (from Zitadel), and lists of linked PRs and tickets. Frontend: Build service detail page displaying these live links with correct cross-product URLs.

### T-008: Implement Upload YAML Template Definition
- Story: US-005
- Accept: 1. `go test ./internal/handlers/... -run TestUploadTemplate` passes.
2. Uploading invalid YAML returns 400 with line number.
3. Non-admin user returns 403.
- Tests may change: no
- Needs: T-002

Backend: Add `/api/admin/templates` POST endpoint. Parse YAML, validate schema, check user role (Platform Admin), and store in database with status 'draft'.

### T-009: Implement Render Template Form
- Story: US-006
- Accept: 1. `npm run build` in frontend passes.
2. `npm run test` in frontend passes for form rendering logic.
3. Form inputs match YAML definitions (string, number, select, default values).
- Tests may change: no
- Needs: T-001

Frontend: Create a dynamic form component that reads the template's `spec.inputs` and renders appropriate HTML inputs (text, number, select, toggle) with pre-filled defaults.

### T-010: Implement Update Existing Template
- Story: US-007
- Accept: 1. `go test ./internal/handlers/... -run TestUpdateTemplate` passes.
2. Updating a template increments version number and persists changes.
- Tests may change: no
- Needs: T-008

Backend: Add `/api/admin/templates/{name}` PUT endpoint. Validate YAML, update database record, increment version, and ensure changes are visible in new provisioning forms.

### T-011: Implement Provisioning Quota Enforcement
- Story: US-001
- Accept: 1. `go test ./internal/handlers/... -run TestProvisioningQuota` passes.
2. Free tier user at 50 repos receives 403 when attempting to provision.
- Tests may change: no
- Needs: T-002, Quill/T-001

Backend: Before provisioning, check the user's current tier and repository count. If limit is reached, return 403 with a specific error message. Coordinate with Quill's quota API if necessary.

### T-012: Implement Atomic Provisioning Execution
- Story: US-001
- Accept: 1. `go test ./internal/handlers/... -run TestAtomicProvisioning` passes.
2. Provisioning creates Quill repo and Tempo project, returning 201 with service ID.
- Tests may change: no
- Needs: T-010, Quill/T-000, Tempo/T-008

Backend: Implement `/api/templates/{name}/execute`. Call Quill REST API to create repo, then Tempo REST API to create project. Publish events to NATS. Record service in Atlas DB with status 'active'.

### T-013: Implement Provisioning Failure Handling and Rollback
- Story: US-002
- Accept: 1. `go test ./internal/handlers/... -run TestProvisioningRollback` passes.
2. If Tempo creation fails, Quill repo is deleted and 500 is returned.
3. If Quill times out, 504 is returned and no Tempo project is created.
- Tests may change: no
- Needs: T-011

Backend: Add error handling to the provisioning flow. If Quill succeeds but Tempo fails, call Quill delete API to rollback. Handle timeouts explicitly with 504 responses. Ensure no partial state remains.

### T-014: Implement Sync PR Status from Quill
- Story: US-010
- Accept: 1. `go test ./internal/events/... -run TestPRSync` passes.
2. Upon 'pr.merged' event, service's 'last_pr_status' updates to 'merged' within 5s.
- Tests may change: no
- Needs: T-004, Quill/T-013

Backend: Subscribe to NATS 'quill.pr' subject. Handle 'pr.merged' and 'pr.opened' events by updating the linked service's status and PR list in the database. Implement reconnection logic for NATS.

### T-015: Implement Sync Ticket Status from Tempo
- Story: US-011
- Accept: 1. `go test ./internal/events/... -run TestTicketSync` passes.
2. Upon 'ticket.closed' event, service's 'active_ticket_count' decrements by 1.
- Tests may change: no
- Needs: T-004, Tempo/T-001

Backend: Subscribe to NATS 'tempo.ticket' subject. Handle 'ticket.closed' and 'ticket.created' events by updating the linked service's ticket counts and lists in the database.

## Parked

## Done
