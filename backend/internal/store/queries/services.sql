-- name: ListServices :many
SELECT * FROM services
WHERE org_id = $1
  AND (sqlc.arg(team)::text = '' OR team = sqlc.arg(team))
  AND (
    sqlc.arg(search)::text = ''
    OR name ILIKE '%' || sqlc.arg(search) || '%'
    OR description ILIKE '%' || sqlc.arg(search) || '%'
  )
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountServices :one
SELECT count(*) FROM services
WHERE org_id = $1
  AND (sqlc.arg(team)::text = '' OR team = sqlc.arg(team))
  AND (
    sqlc.arg(search)::text = ''
    OR name ILIKE '%' || sqlc.arg(search) || '%'
    OR description ILIKE '%' || sqlc.arg(search) || '%'
  );

-- name: GetServiceByID :one
SELECT * FROM services WHERE id = $1 AND org_id = $2;

-- name: CreateService :one
INSERT INTO services (org_id, name, template_name, service_type, team, owner, lifecycle, description, repo_url, request_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;
