# User stories

> Owner document. Agents treat it as read-only.

## US-001: Provision Service via Template (F1) — exists

As Engineer, I want to select a service template, fill out the generated form, and execute provisioning, so that I can bootstrap a new service with a Quill repo and Tempo project in a single atomic action.

Acceptance criteria:
- [ ] Given I am authenticated and viewing the template catalog, when I select the 'microservice' template and submit valid form data, then the system returns a 201 Created response with a new service ID
- [ ] Given I have submitted a valid provisioning request, when the request completes, then a repository exists in Quill and a project exists in Tempo linked to the new service ID via the event bus
- [ ] Given I am on the free individual tier and have reached my 50 repository limit, when I attempt to provision a new service, then the system returns a 403 Forbidden error with a message indicating the quota limit is reached
- [ ] Given I submit a provisioning request with an invalid name, when the form is submitted, then the system returns a 400 Bad Request error with specific field validation errors

## US-002: Atomic Provisioning Failure Handling (F1) — exists

As Engineer, I want the provisioning process to be atomic, so that I am not left with half-created resources if one step fails.

Acceptance criteria:
- [ ] Given I submit a valid provisioning request, when the Quill repository creation succeeds but the Tempo project creation fails, then the system triggers a rollback or cleanup of the Quill repository and returns a 500 Internal Server Error
- [ ] Given I submit a provisioning request, when the API call to Quill times out, then the system does not create a Tempo project and returns a 504 Gateway Timeout error
- [ ] Given I submit a provisioning request, when both Quill and Tempo resources are successfully created, then the Atlas database records the service with status 'active' and links to both external IDs

## US-003: Search Service Catalog (F2) — exists

As Engineer, I want to search for existing services by name or tag, so that I can quickly find the owner and artifacts for a specific service.

Acceptance criteria:
- [ ] Given there are 100 services in my tenant, when I search for 'payment', then the API returns only services where the name or tags contain 'payment' within 200ms
- [ ] Given I search for a service name that does not exist, when the search is executed, then the API returns an empty list and a 200 OK status
- [ ] Given I am in Tenant A, when I search for a service that exists in Tenant B, then the service is not included in the results

## US-004: View Service Details with Live Links (F2) — exists

As Engineer, I want to view a service detail page showing ownership and linked artifacts, so that I can see who owns the service and where its current work is being tracked.

Acceptance criteria:
- [ ] Given I click on a service in the catalog, when the detail page loads, then it displays the owner's email address retrieved from the Zitadel identity provider
- [ ] Given a service has 3 active PRs in Quill, when I view the service details, then the UI lists all 3 PRs with their titles and statuses
- [ ] Given a service has 5 open tickets in Tempo, when I view the service details, then the UI lists all 5 tickets with their current state
- [ ] Given the service detail page is loaded, when I click on a linked PR, then I am redirected to the Quill PR page with my existing session

## US-005: Upload YAML Template Definition (F3) — exists

As Platform Admin, I want to upload a YAML file defining a new service template, so that I can standardize onboarding with custom forms and skeleton files.

Acceptance criteria:
- [ ] Given I am a Platform Admin, when I upload a valid YAML template file, then the system parses it and creates a new template entry in the database with status 'draft'
- [ ] Given I upload a YAML file with a syntax error, when the upload is processed, then the system returns a 400 Bad Request error with the line number of the error
- [ ] Given I am a regular Engineer, when I attempt to upload a template, then the system returns a 403 Forbidden error

## US-006: Render Template Form (F3) — exists

As Engineer, I want to see a web form generated from a YAML template, so that I can easily provision services without knowing the underlying schema.

Acceptance criteria:
- [ ] Given a template defines a 'name' field (string) and 'port' field (integer), when I open the template, then the UI renders a text input for name and a number input for port
- [ ] Given a template defines a 'environment' field with enum values ['dev', 'prod'], when I open the template, then the UI renders a dropdown select with these two options
- [ ] Given a template defines a field with a default value, when I open the form, then the input field is pre-filled with that default value

## US-007: Update Existing Template (F3) — exists

As Platform Admin, I want to modify an existing template definition, so that Future provisions inherit the new standards (e.g., security headers).

Acceptance criteria:
- [ ] Given I edit a template to add a new required field, when I save the changes, then the database record is updated and the version number is incremented
- [ ] Given I update a template, when I provision a new service using that template, then the new form includes the newly added field
- [ ] Given I delete a field from a template, when I provision a new service, then the form does not display the deleted field

## US-008: Single Sign-On Login (F4) — exists

As User, I want to log in via the shared Zitadel OIDC provider, so that I can access Atlas with the same identity I use for Quill and Tempo.

Acceptance criteria:
- [ ] Given I am not logged in, when I navigate to the Atlas dashboard, then I am redirected to the Zitadel login page
- [ ] Given I have successfully authenticated with Zitadel, when I return to Atlas, then the session cookie is set and I am redirected to the dashboard
- [ ] Given I have a valid Zitadel token, when I make an API request to Atlas, then the backend validates the token and returns 200 OK if the user exists in the tenant

## US-009: Session Expiration and Logout (F4) — exists

As User, I want my session to expire after inactivity, so that my account is secure if I leave my browser unattended.

Acceptance criteria:
- [ ] Given I have been logged in for 30 minutes of inactivity, when I attempt to access a protected route, then I am redirected to the login page
- [ ] Given I click the logout button, when the request is processed, then the session is invalidated on the server and I am redirected to the login page

## US-010: Sync PR Status from Quill (F5) — planned

As System, I want to consume PR events from the NATS bus, so that the Atlas service catalog reflects the latest PR status in real-time.

Acceptance criteria:
- [ ] Given a PR is merged in Quill, when the NATS bus publishes a 'pr.merged' event, then the Atlas backend updates the linked service's 'last_pr_status' field to 'merged' within 5 seconds
- [ ] Given a PR is opened in Quill, when the NATS bus publishes a 'pr.opened' event, then the Atlas service detail page shows the new PR in the list without a manual refresh
- [ ] Given the NATS connection is lost, when an event is published, then the system logs a warning and retries the connection, ensuring no data is permanently lost

## US-011: Sync Ticket Status from Tempo (F5) — planned

As System, I want to consume ticket events from the NATS bus, so that the Atlas service catalog reflects the latest ticket status in real-time.

Acceptance criteria:
- [ ] Given a ticket is closed in Tempo, when the NATS bus publishes a 'ticket.closed' event, then the Atlas backend updates the linked service's 'active_ticket_count' by decrementing it by 1
- [ ] Given a ticket is created in Tempo and linked to a service, when the event is received, then the service detail page displays the new ticket

## US-012: Enforce Tenant Isolation on Read (F6) — exists

As System, I want all database queries to be filtered by tenant_id, so that users only see data belonging to their organization.

Acceptance criteria:
- [ ] Given I am in Tenant A, when I request the service catalog, then the SQL query includes 'WHERE tenant_id = A' and no rows from Tenant B are returned
- [ ] Given I am in Tenant A, when I request details for a service ID that belongs to Tenant B, then the API returns a 404 Not Found error

## US-013: Enforce Tenant Isolation on Write (F6) — exists

As System, I want all database writes to be scoped by tenant_id, so that data from one tenant cannot be overwritten or corrupted by another.

Acceptance criteria:
- [ ] Given I am in Tenant A, when I attempt to update a service ID that belongs to Tenant B, then the API returns a 404 Not Found error and no database update occurs
- [ ] Given I provision a new service, when the database record is inserted, then the tenant_id column is automatically populated with my current tenant's ID
