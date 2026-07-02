-- name: GetActiveMembership :one
SELECT * FROM memberships WHERE org_id = $1 AND user_id = $2 AND status = 'active';

-- name: GetMembershipByID :one
SELECT * FROM memberships WHERE id = $1 AND org_id = $2;

-- name: MembershipExists :one
SELECT EXISTS(SELECT 1 FROM memberships WHERE org_id = $1 AND lower(username) = lower($2));

-- name: CreateMembership :one
INSERT INTO memberships (org_id, user_id, username, role, status, invited_by_user_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListMembershipsByOrg :many
SELECT * FROM memberships WHERE org_id = $1 ORDER BY username;

-- name: UpdateMembershipRole :one
UPDATE memberships SET role = $2 WHERE id = $1 RETURNING *;

-- name: DeleteMembership :exec
DELETE FROM memberships WHERE id = $1;

-- name: CountActivePlatformEngineers :one
SELECT count(*) FROM memberships WHERE org_id = $1 AND role = 'platform-engineer' AND status = 'active';

-- name: ListPendingMembershipsByUsername :many
SELECT * FROM memberships WHERE lower(username) = lower($1) AND user_id IS NULL;

-- name: ActivateMembership :exec
UPDATE memberships SET user_id = $2, status = 'active' WHERE id = $1;
