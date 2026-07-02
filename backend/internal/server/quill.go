package server

import (
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nielsuitterdijk22/yaly/internal/httpx"
	"github.com/nielsuitterdijk22/yaly/internal/store/db"
)

// handleListQuillProjects lists the caller's Quill projects, used by the org
// onboarding step to offer "attach to an existing Quill project".
func (s *Server) handleListQuillProjects(w http.ResponseWriter, r *http.Request) {
	if !s.quill.Enabled() {
		httpx.Error(w, http.StatusServiceUnavailable, "Quill integration is not configured")
		return
	}
	token, ok := tokenFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	projects, err := s.quill.ListMyProjects(r.Context(), token)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "failed to reach Quill: "+err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, projects)
}

type linkQuillCatalogRequest struct {
	// Mode is "personal" (use/create the caller's Quill personal project),
	// "existing" (attach to QuillProjectSlug, which the caller must already
	// belong to), or "new" (create a Quill project first).
	Mode             string `json:"mode"`
	QuillProjectSlug string `json:"quillProjectSlug"`
	QuillProjectName string `json:"quillProjectName"`
	RepoSlug         string `json:"repoSlug"`
}

// handleLinkQuillCatalog provisions (or attaches to) a Quill project + repo
// and mints a git token for it, then stores the resulting clone URL and
// encrypted token on the organization — the same fields the manual
// "paste a repo URL and PAT" flow in org settings already writes to, so
// internal/catalog.SyncService needs no changes to consume it.
func (s *Server) handleLinkQuillCatalog(w http.ResponseWriter, r *http.Request) {
	if !s.quill.Enabled() {
		httpx.Error(w, http.StatusServiceUnavailable, "Quill integration is not configured")
		return
	}
	orgID, org, errResp := s.requirePlatformEngineerOrg(w, r)
	if errResp {
		return
	}
	token, ok := tokenFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var body linkQuillCatalogRequest
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	repoSlug := strings.TrimSpace(body.RepoSlug)
	if repoSlug == "" {
		repoSlug = "yaly-catalog"
	}

	var projectSlug string
	switch body.Mode {
	case "personal":
		slug, err := s.quill.EnsurePersonalProject(r.Context(), token)
		if err != nil {
			httpx.Error(w, http.StatusBadGateway, "failed to provision Quill personal project: "+err.Error())
			return
		}
		projectSlug = slug
	case "existing":
		if strings.TrimSpace(body.QuillProjectSlug) == "" {
			httpx.Error(w, http.StatusBadRequest, "quillProjectSlug is required")
			return
		}
		projectSlug = body.QuillProjectSlug
	case "new":
		if strings.TrimSpace(body.QuillProjectSlug) == "" || strings.TrimSpace(body.QuillProjectName) == "" {
			httpx.Error(w, http.StatusBadRequest, "quillProjectSlug and quillProjectName are required")
			return
		}
		project, err := s.quill.CreateProject(r.Context(), token, body.QuillProjectSlug, body.QuillProjectName)
		if err != nil {
			httpx.Error(w, http.StatusBadGateway, "failed to create Quill project: "+err.Error())
			return
		}
		projectSlug = project.Slug
	default:
		httpx.Error(w, http.StatusBadRequest, "mode must be 'personal', 'existing', or 'new'")
		return
	}

	repo, err := s.quill.CreateRepo(r.Context(), token, projectSlug, repoSlug, repoSlug)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "failed to create Quill repo: "+err.Error())
		return
	}
	gitToken, err := s.quill.CreateGitToken(r.Context(), token, "yaly-"+org.Slug)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "failed to mint Quill git token: "+err.Error())
		return
	}
	encToken, err := s.protector.Protect(gitToken.Token)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to encrypt git token")
		return
	}

	updated, err := s.store.UpdateOrganization(r.Context(), db.UpdateOrganizationParams{
		ID:                        orgID,
		Name:                      org.Name,
		CatalogRepoUrl:            pgtype.Text{String: s.quill.CloneURL(repo), Valid: true},
		CatalogBranch:             org.CatalogBranch,
		CatalogRepoTokenEncrypted: pgtype.Text{String: encToken, Valid: true},
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to save organization")
		return
	}
	httpx.JSON(w, http.StatusOK, orgDetail(updated, platformEngineerRole, nil))
}
