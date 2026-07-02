CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    zitadel_subject text NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL DEFAULT '',
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_zitadel_subject_idx ON users (zitadel_subject);

CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    catalog_repo_url text,
    catalog_branch text NOT NULL DEFAULT 'main',
    last_catalog_sync_at timestamptz,
    catalog_repo_token_encrypted text,
    created_by_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX organizations_slug_idx ON organizations (slug);

CREATE TABLE memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    username text NOT NULL,
    role text NOT NULL DEFAULT 'developer',
    status text NOT NULL DEFAULT 'active',
    invited_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX memberships_org_username_idx ON memberships (org_id, username);
CREATE INDEX memberships_user_id_idx ON memberships (user_id);

CREATE TABLE services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    name text NOT NULL,
    template_name text,
    service_type text,
    team text,
    owner text,
    lifecycle text NOT NULL DEFAULT 'production',
    description text,
    repo_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    request_id uuid NOT NULL
);
CREATE INDEX services_created_at_idx ON services (created_at);
CREATE INDEX services_team_idx ON services (team);
CREATE INDEX services_org_id_idx ON services (org_id);

CREATE TABLE provisioning_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    template_name text NOT NULL,
    template_title text NOT NULL,
    name text NOT NULL,
    team text,
    owner text,
    status text NOT NULL DEFAULT 'pending-approval',
    requires_approval boolean NOT NULL DEFAULT false,
    values_json text,
    submitted_by text,
    approved_by text,
    approved_at timestamptz,
    rejection_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    error_message text,
    commit_sha text,
    commit_url text,
    execution_log_id uuid
);
CREATE INDEX provisioning_requests_created_at_idx ON provisioning_requests (created_at);
CREATE INDEX provisioning_requests_status_idx ON provisioning_requests (status);
CREATE INDEX provisioning_requests_org_id_idx ON provisioning_requests (org_id);

CREATE TABLE execution_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    template_name text NOT NULL,
    template_title text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    commit_sha text,
    commit_url text,
    error_message text,
    values_json jsonb,
    files_created jsonb NOT NULL DEFAULT '[]',
    output_target text,
    output_repo text,
    executed_at timestamptz NOT NULL DEFAULT now(),
    duration_ms double precision NOT NULL DEFAULT 0
);
CREATE INDEX execution_logs_executed_at_idx ON execution_logs (executed_at);
CREATE INDEX execution_logs_template_name_idx ON execution_logs (template_name);
CREATE INDEX execution_logs_org_id_idx ON execution_logs (org_id);

CREATE TABLE output_presets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL DEFAULT 'local',
    repo text NOT NULL,
    branch text NOT NULL DEFAULT 'main',
    path text NOT NULL DEFAULT '/',
    commit_message_template text,
    git_hub_token_env text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX output_presets_org_name_idx ON output_presets (org_id, name);
