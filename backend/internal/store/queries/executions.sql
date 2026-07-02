-- name: ListExecutions :many
SELECT * FROM execution_logs
WHERE org_id = $1
  AND (sqlc.arg(template)::text = '' OR template_name = sqlc.arg(template))
  AND (sqlc.arg(status)::text = '' OR status = sqlc.arg(status))
ORDER BY executed_at DESC
LIMIT $2 OFFSET $3;

-- name: CountExecutions :one
SELECT count(*) FROM execution_logs
WHERE org_id = $1
  AND (sqlc.arg(template)::text = '' OR template_name = sqlc.arg(template))
  AND (sqlc.arg(status)::text = '' OR status = sqlc.arg(status));

-- name: GetExecutionByID :one
SELECT * FROM execution_logs WHERE id = $1 AND org_id = $2;

-- name: CreateExecutionLog :one
INSERT INTO execution_logs
    (org_id, template_name, template_title, status, commit_sha, commit_url, error_message,
     values_json, files_created, output_target, output_repo, duration_ms)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;
