-- name: ListRequests :many
SELECT * FROM provisioning_requests
WHERE org_id = $1
  AND (sqlc.arg(status)::text = '' OR status = sqlc.arg(status))
ORDER BY created_at DESC;

-- name: GetRequestByID :one
SELECT * FROM provisioning_requests WHERE id = $1 AND org_id = $2;

-- name: CreateRequest :one
INSERT INTO provisioning_requests
    (org_id, template_name, template_title, name, team, owner, submitted_by, requires_approval, values_json, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ApproveRequest :one
UPDATE provisioning_requests
SET status = 'provisioning', approved_by = $2, approved_at = now()
WHERE id = $1
RETURNING *;

-- name: RejectRequest :one
UPDATE provisioning_requests
SET status = 'rejected', rejection_reason = $2, approved_by = $3, completed_at = now()
WHERE id = $1
RETURNING *;

-- name: StartRetry :one
UPDATE provisioning_requests
SET status = 'provisioning', error_message = NULL
WHERE id = $1
RETURNING *;

-- name: CompleteRequest :one
UPDATE provisioning_requests
SET status = $2,
    execution_log_id = $3,
    commit_sha = $4,
    commit_url = $5,
    completed_at = now(),
    error_message = $6
WHERE id = $1
RETURNING *;
