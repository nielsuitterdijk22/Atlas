// Package quill is a thin client for Quill's REST API
// (https://github.com/.../Quill), used to provision a git repo for an
// org's/user's catalog storage and mint a token to clone/push it.
//
// Every method here is a *user-context* call: it forwards the caller's own
// Zitadel access token as the bearer. Quill and Atlas share one Zitadel
// project, so that token is already valid against Quill's API — no separate
// token exchange or service credential is needed. This is deliberately not a
// service/machine client: per Tempo's quill_integration.md design doc,
// Zitadel machine users are reserved for true backend-to-backend sync (none
// of which exists yet between Atlas and Quill).
package quill

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL          string
	forgejoPublicURL string
	http             *http.Client
}

// NewClient builds a client. forgejoPublicURL is the externally-reachable
// Forgejo host Quill wraps (e.g. "https://git.black-tulip.nl") — Quill's repo
// API doesn't return a ready-made clone URL, only forgejoOwner/forgejoName,
// so we build it ourselves for CloneURL.
func NewClient(baseURL, forgejoPublicURL string) *Client {
	return &Client{baseURL: baseURL, forgejoPublicURL: forgejoPublicURL, http: &http.Client{Timeout: 15 * time.Second}}
}

// Enabled reports whether a Quill base URL is configured.
func (c *Client) Enabled() bool { return c.baseURL != "" }

// CloneURL builds the HTTPS clone URL for a repo Quill created.
func (c *Client) CloneURL(repo Repo) string {
	return fmt.Sprintf("%s/%s/%s.git", c.forgejoPublicURL, repo.ForgejoOwner, repo.ForgejoName)
}

// Error is returned for a non-2xx response, carrying Quill's error envelope
// ({"error": "code", "message": "..."}, see Quill's internal/httpx).
type Error struct {
	Status  int
	Code    string
	Message string
}

func (e *Error) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("quill: %s (%s, %d)", e.Message, e.Code, e.Status)
	}
	return fmt.Sprintf("quill: request failed (%d)", e.Status)
}

func (c *Client) do(ctx context.Context, token, method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		reader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call quill: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var body struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&body)
		return &Error{Status: resp.StatusCode, Code: body.Error, Message: body.Message}
	}
	if out == nil || resp.StatusCode == http.StatusNoContent {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decode quill response: %w", err)
	}
	return nil
}

// --- types (mirroring Quill's internal/server response shapes) ---

type User struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	IsAdmin     bool      `json:"isAdmin"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Project struct {
	ID          string    `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ForgejoOrg  string    `json:"forgejoOrg,omitempty"`
	IsPersonal  bool      `json:"isPersonal"`
	CreatedAt   time.Time `json:"createdAt"`
	// Role is only populated by ListMyProjects.
	Role string `json:"role,omitempty"`
}

type Repo struct {
	ID            string    `json:"id"`
	Slug          string    `json:"slug"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Visibility    string    `json:"visibility"`
	DefaultBranch string    `json:"defaultBranch"`
	ForgejoOwner  string    `json:"forgejoOwner,omitempty"`
	ForgejoName   string    `json:"forgejoName,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

type GitToken struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Token    string `json:"token"`
}

// Me returns the caller's Quill user profile.
func (c *Client) Me(ctx context.Context, token string) (User, error) {
	var out User
	err := c.do(ctx, token, http.MethodGet, "/api/backend/me", nil, &out)
	return out, err
}

// ListMyProjects returns the projects the caller belongs to.
func (c *Client) ListMyProjects(ctx context.Context, token string) ([]Project, error) {
	var out struct {
		Projects []Project `json:"projects"`
	}
	err := c.do(ctx, token, http.MethodGet, "/api/backend/me/projects", nil, &out)
	return out.Projects, err
}

// EnsurePersonalProject provisions (idempotently) the caller's personal
// Quill project and returns its slug.
func (c *Client) EnsurePersonalProject(ctx context.Context, token string) (string, error) {
	var out struct {
		Slug string `json:"slug"`
	}
	err := c.do(ctx, token, http.MethodPost, "/api/backend/me/personal-project", nil, &out)
	return out.Slug, err
}

// CreateProject provisions a new org-owned Quill project.
func (c *Client) CreateProject(ctx context.Context, token, slug, name string) (Project, error) {
	var out Project
	err := c.do(ctx, token, http.MethodPost, "/api/backend/projects/", map[string]string{
		"slug": slug,
		"name": name,
	}, &out)
	return out, err
}

// CreateRepo provisions a new repository under an existing Quill project.
func (c *Client) CreateRepo(ctx context.Context, token, projectSlug, repoSlug, name string) (Repo, error) {
	var out Repo
	err := c.do(ctx, token, http.MethodPost, "/api/backend/projects/"+projectSlug+"/repos/", map[string]string{
		"slug":       repoSlug,
		"name":       name,
		"visibility": "private",
	}, &out)
	return out, err
}

// CreateGitToken mints a new git access token for the caller. The token
// value is shown once — the caller must persist it immediately (encrypted).
func (c *Client) CreateGitToken(ctx context.Context, token, label string) (GitToken, error) {
	var out GitToken
	err := c.do(ctx, token, http.MethodPost, "/api/backend/me/git-token", map[string]string{"name": label}, &out)
	return out, err
}
