Personas

Developer — wants to ship, not learn CAF. Primary consumer.
Team lead / PO — wants visibility of their team's services, owners, drift.
Platform engineer (you / CCoE) — owns golden-path templates, approves gated requests, proves adoption.

User stories (the ones that matter)
Self-service provisioning — the core

As a developer, I can create a new service from an approved template so I get a compliant repo, pipeline, and infra without reading the landing-zone docs.
As a developer, I can provision a standard Azure resource (storage, SQL DB, Key Vault) into my team's subscription so I don't file a ticket and wait.
As a developer, I can see a plan of exactly what will be created — resources, tags, target subscription, est. cost — before I submit.
As a developer, I can track a provisioning request's status so I know when it's done or stuck.
As a developer, I'm required to assign an owner and team at creation, so nothing becomes orphaned.

Catalog & visibility

As a team lead, I see every service my team owns, with owner, lifecycle, and compliance, in one place.
As a developer, I open a service and find its repo, pipeline, dashboards, docs, and Azure resources without hunting.
As anyone, I see a service's policy/compliance status so I know if it's out of standard.

Governance (your side)

As a platform engineer, I publish and version golden-path templates so teams self-serve compliantly by default.
As a platform engineer, I review/approve only the gated requests (new subscription, prod database) so governance holds without me being a bottleneck.
As a platform engineer, I see adoption metrics (services via templates vs. drift) so I can show CCoE value.

Screens (MVP — 6)

Home — personalized: my services, my open requests, compliance snapshot, one big "Create" CTA.
Catalog — searchable/filterable list of all services.
Service detail — overview, ownership, links, Azure resources, scorecard.
Create — gallery of golden-path templates.
Scaffolder wizard — the guided multi-step flow. This is where "how to guide" lives.
My requests — status tracking of provisioning runs and approvals.

(Admin/template management is screen 7 — defer it; manage templates as Git repos at first.)
How to guide users (UX principles)

Golden paths, never a blank canvas. Every "create" starts from a curated template — no blank Bicep file.
Defaults baked in, advanced collapsed. Region, naming, tags, networking pre-filled from the landing zone. Show 3–5 fields; hide the rest under "Advanced." Lock the ones governance owns (show a lock icon + one-line reason).
Explain the "why" inline. A short helper line per field beats a separate docs trip.
Always show a plan before submit. What resources, which subscription, what tags, est. cost. This builds trust and kills surprises.
Be async-aware. Provisioning takes minutes — submit creates a request with live status; never block the UI.
Close the loop. After success, deep-link straight to the repo, pipeline, and Azure portal.

Here's a working prototype of all six screens:Synthesized prototype overview, design rationale, and implementation roadmapSynthesized prototype overview, design rationale, and implementation roadmapThe prototype is clickable — try Create → any template → walk the wizard. That flow is the whole product; everything else is supporting cast.
A few decisions baked in that are worth calling out:

The "plan" step is the trust-builder. Step 3 of the wizard shows the target subscription, naming prefix, resources, tags, and est. cost before anything happens. This is what makes teams comfortable self-serving — and what keeps you out of tickets.
Locked fields, visibly. Things the CCoE owns (private endpoints, Entra-only auth, ingress) show as locked with a one-line reason rather than being hidden. Teams learn the guardrails instead of fighting them.
Approval is per-template, not per-request. Storage and microservices flow straight through; SQL prod and new subscriptions queue for you. That's the bottleneck-vs-governance balance.
Catalog is a byproduct. Nothing is hand-registered — a service exists because someone created it through a template, so ownership and tags are never stale.

Two things I deliberately left out of the MVP and you should resist for v1: a plugin system (the Backstage trap), and a generic "import any existing repo" flow (kills the golden-path discipline — better to onboard legacy services through a one-off migration template later).
Where I made assumptions you might want to redirect: I modelled this as provisioning-first with Azure resources as first-class templates. If your teams' bigger pain is actually discovery (finding what exists, docs, on-call) rather than provisioning, the catalog and TechDocs become the centre of gravity and the wizard shrinks.
Want me to take any of these further — a backlog with these stories estimated and sequenced into sprints, the template-management/admin screen for your CCoE side, or a written one-pager you can put in front of stakeholders?
