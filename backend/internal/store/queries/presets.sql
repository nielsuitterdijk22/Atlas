-- name: ListPresets :many
SELECT * FROM output_presets WHERE org_id = $1 ORDER BY name;

-- name: GetPresetByID :one
SELECT * FROM output_presets WHERE id = $1 AND org_id = $2;

-- name: GetPresetByName :one
SELECT * FROM output_presets WHERE org_id = $1 AND name = $2;

-- name: CreatePreset :one
INSERT INTO output_presets (org_id, name, description, type, repo, branch, path, commit_message_template, git_hub_token_env)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdatePreset :one
UPDATE output_presets
SET name = $3, description = $4, type = $5, repo = $6, branch = $7, path = $8,
    commit_message_template = $9, git_hub_token_env = $10, updated_at = now()
WHERE id = $1 AND org_id = $2
RETURNING *;

-- name: DeletePreset :exec
DELETE FROM output_presets WHERE id = $1 AND org_id = $2;
