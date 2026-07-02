-- name: GetUserByZitadelSubject :one
SELECT * FROM users WHERE zitadel_subject = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE lower(username) = lower($1);

-- name: CreateUser :one
INSERT INTO users (zitadel_subject, username, display_name, email)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: TouchUserLogin :one
UPDATE users
SET username = $2, display_name = $3, email = $4, last_login_at = now()
WHERE id = $1
RETURNING *;

-- name: SetQuillUserID :exec
UPDATE users SET quill_user_id = $2 WHERE id = $1 AND quill_user_id IS NULL;
