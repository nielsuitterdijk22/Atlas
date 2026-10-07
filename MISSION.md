# Mission

Atlas is the self-service onboarding and discovery layer of the suite, allowing engineers to provision services via templates that atomically create the corresponding Quill repository and Tempo project. It ensures every new service has a clear owner and immediate visibility within the unified, sovereign engineering environment.

> Owner document. Agents read it first and treat it as read-only.

## Problem
New engineers and teams lack a simple, integrated way to bootstrap new services, leading to inconsistent ownership, manual setup friction, and fragmented visibility across version control and planning tools.

## Users
Daily user: The engineer or team lead who needs to spin up a new service or discover existing ones. Buyer: VP Eng / Platform lead who wants to enforce ownership and standardize onboarding via a low-friction, EU-hosted portal.

## Core workflows
- New engineer browses the template catalog in Atlas, fills out the form, and executes provisioning which creates the Quill repo and Tempo project in one flow.
- Engineer searches the service catalog to find the owner and linked artifacts for any existing service.
- Platform admin defines new service templates using YAML forms and skeleton files to standardize onboarding.

## Examples
- A new joiner uses Atlas to provision a 'microservice' template, instantly receiving a configured Quill repo with branch policies and a Tempo project with a default board.
- A platform team updates the 'API Gateway' template in Atlas to include a new security header, ensuring all future provisions inherit the change.

## Done looks like (first version)
- A new customer can provision a service via Atlas that creates the matching Quill and Tempo objects in a single atomic action.
- The service catalog displays live ownership and links to the active Quill PRs and Tempo tickets for each service.
- Atlas templates render correctly using the shared dark design system and authenticate via the shared Zitadel identity.

## Out of scope
- Version control logic, PR management, or branch policy enforcement (Quill's responsibility).
- Sprint planning, ticket lifecycle management, or Agile board views (Tempo's responsibility).
- CI pipeline execution, runner provisioning, or build logs (Forge's responsibility).
- Complex service mesh configuration or infrastructure-as-code management beyond simple scaffolding.

## Must never happen
- Never let Atlas call Quill or Tempo databases directly; only via the NATS event bus or their REST APIs.
- Never allow direct database writes to other products' Postgres instances.
- Never offer a self-hosted or on-prem build of the Atlas portal.

## Constraints
- Must use the shared Zitadel OIDC for identity and the shared NATS event bus for real-time cross-product linking.
- Must adhere to the shared dark design system (purple accent, sidebar shell) to feel like one product.
- Must run on the single shared multi-tenant instance with tenant_id as the isolation boundary.
- Must be built with a Go backend and Next.js frontend, sharing the suite's design system and identity infrastructure.
