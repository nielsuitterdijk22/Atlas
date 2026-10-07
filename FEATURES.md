# Features

> Owner document. Agents treat it as read-only.

## F1: Service Provisioning via Templates (must) — exists

Allows engineers to select a template, fill out a generated form, and execute provisioning to atomically create a new service. This action triggers the creation of the corresponding Quill repository and Tempo project via API calls. It ensures new services are bootstrapped with consistent configuration and ownership in a single step.

## F2: Service Catalog Discovery (must) — exists

Provides a searchable and browsable catalog of all existing services within the organization. Each service entry displays live ownership information and provides direct links to active Quill pull requests and Tempo tickets. This ensures engineers can quickly identify who owns a service and where its current work is being tracked.

## F3: Template Catalog Management (must) — exists

Enables platform admins to define, upload, and manage service templates using YAML form definitions and skeleton files. The system renders these definitions into modern web forms for end-users. This allows for standardized onboarding and ensures that all future provisions inherit the latest organizational standards and security headers.

## F4: Unified Identity Authentication (must) — exists

Integrates with the shared Zitadel OIDC provider to handle single sign-on for all Atlas users. This ensures that the user's identity is consistent across Atlas, Quill, Tempo, and Forge. It eliminates the need for separate credentials and enforces access control based on the shared identity provider.

## F5: Real-Time Cross-Product Linking (should) — planned

Consumes events from the shared NATS event bus to maintain real-time synchronization between Atlas service records and Quill/Tempo artifacts. This ensures that when a PR is merged or a ticket is updated in sibling products, the Atlas service catalog reflects these changes immediately without manual refreshes.

## F6: Tenant Isolation and Multi-tenancy (should) — exists

Enforces strict data isolation using tenant_id as the boundary for all catalog entries and provisioning requests. This ensures that in the shared multi-tenant instance, one organization's services, templates, and ownership data are completely invisible to other organizations, maintaining sovereignty and security.
