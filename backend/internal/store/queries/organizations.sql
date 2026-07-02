-- name: CreateOrganization :one
INSERT INTO organizations (name, slug, created_by_user_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetOrganizationByID :one
SELECT * FROM organizations WHERE id = $1;

-- name: OrganizationSlugExists :one
SELECT EXISTS(SELECT 1 FROM organizations WHERE slug = $1);

-- name: UpdateOrganization :one
-- Callers resolve the final catalog_repo_token_encrypted value themselves
-- (encrypt / clear / keep-existing) before calling this — see server/orgs.go.
UPDATE organizations
SET name = $2,
    catalog_repo_url = $3,
    catalog_branch = $4,
    catalog_repo_token_encrypted = $5
WHERE id = $1
RETURNING *;

-- name: SetOrganizationCatalogSynced :exec
UPDATE organizations SET last_catalog_sync_at = $2 WHERE id = $1;

-- name: ListOrganizationsForUser :many
SELECT o.id, o.name, o.slug, m.role
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = $1 AND m.status = 'active'
ORDER BY o.name;
