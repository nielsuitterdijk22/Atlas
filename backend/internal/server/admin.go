package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nielsuitterdijk22/atlas/internal/httpx"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
)

func (s *Server) handleListExecutions(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	q := r.URL.Query()
	page := atoiDefault(q.Get("page"), 1)
	if page < 1 {
		page = 1
	}
	pageSize := atoiDefault(q.Get("pageSize"), 20)
	template := q.Get("template")
	status := q.Get("status")

	rows, err := s.store.ListExecutions(r.Context(), db.ListExecutionsParams{
		OrgID:    acc.OrgID(),
		Template: template,
		Status:   status,
		Limit:    int32(pageSize),
		Offset:   int32((page - 1) * pageSize),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to load executions")
		return
	}
	total, err := s.store.CountExecutions(r.Context(), db.CountExecutionsParams{OrgID: acc.OrgID(), Template: template, Status: status})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to count executions")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": rows, "total": total, "page": page, "pageSize": pageSize})
}

func (s *Server) handleGetExecution(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "execution not found")
		return
	}
	log, err := s.store.GetExecutionByID(r.Context(), db.GetExecutionByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "execution not found")
		return
	}
	httpx.JSON(w, http.StatusOK, log)
}

func (s *Server) handleListPresets(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	rows, err := s.store.ListPresets(r.Context(), acc.OrgID())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to load presets")
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

func (s *Server) handleGetPreset(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "preset not found")
		return
	}
	preset, err := s.store.GetPresetByID(r.Context(), db.GetPresetByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "preset not found")
		return
	}
	httpx.JSON(w, http.StatusOK, preset)
}

type presetBody struct {
	Name                  string `json:"name"`
	Description           string `json:"description"`
	Type                  string `json:"type"`
	Repo                  string `json:"repo"`
	Branch                string `json:"branch"`
	Path                  string `json:"path"`
	CommitMessageTemplate string `json:"commitMessageTemplate"`
	GitHubTokenEnv        string `json:"gitHubTokenEnv"`
}

func (s *Server) handleCreatePreset(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	var body presetBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Name == "" {
		httpx.Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if body.Repo == "" {
		httpx.Error(w, http.StatusBadRequest, "Repo is required")
		return
	}

	if _, err := s.store.GetPresetByName(r.Context(), db.GetPresetByNameParams{OrgID: acc.OrgID(), Name: body.Name}); err == nil {
		httpx.Error(w, http.StatusConflict, "Preset '"+body.Name+"' already exists")
		return
	}

	branch := body.Branch
	if branch == "" {
		branch = "main"
	}
	path := body.Path
	if path == "" {
		path = "/"
	}
	presetType := body.Type
	if presetType == "" {
		presetType = "local"
	}

	preset, err := s.store.CreatePreset(r.Context(), db.CreatePresetParams{
		OrgID:                 acc.OrgID(),
		Name:                  body.Name,
		Description:           pgtype.Text{String: body.Description, Valid: body.Description != ""},
		Type:                  presetType,
		Repo:                  body.Repo,
		Branch:                branch,
		Path:                  path,
		CommitMessageTemplate: pgtype.Text{String: body.CommitMessageTemplate, Valid: body.CommitMessageTemplate != ""},
		GitHubTokenEnv:        pgtype.Text{String: body.GitHubTokenEnv, Valid: body.GitHubTokenEnv != ""},
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to create preset")
		return
	}
	httpx.JSON(w, http.StatusCreated, preset)
}

func (s *Server) handleUpdatePreset(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "preset not found")
		return
	}
	existing, err := s.store.GetPresetByID(r.Context(), db.GetPresetByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "preset not found")
		return
	}
	var body presetBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := existing.Name
	if body.Name != "" {
		name = body.Name
	}
	repo := existing.Repo
	if body.Repo != "" {
		repo = body.Repo
	}
	presetType := existing.Type
	if body.Type != "" {
		presetType = body.Type
	}
	branch := existing.Branch
	if body.Branch != "" {
		branch = body.Branch
	}
	path := existing.Path
	if body.Path != "" {
		path = body.Path
	}

	updated, err := s.store.UpdatePreset(r.Context(), db.UpdatePresetParams{
		ID:                    id,
		OrgID:                 acc.OrgID(),
		Name:                  name,
		Description:           pgtype.Text{String: body.Description, Valid: body.Description != ""},
		Type:                  presetType,
		Repo:                  repo,
		Branch:                branch,
		Path:                  path,
		CommitMessageTemplate: pgtype.Text{String: body.CommitMessageTemplate, Valid: body.CommitMessageTemplate != ""},
		GitHubTokenEnv:        pgtype.Text{String: body.GitHubTokenEnv, Valid: body.GitHubTokenEnv != ""},
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to update preset")
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

func (s *Server) handleDeletePreset(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "preset not found")
		return
	}
	if _, err := s.store.GetPresetByID(r.Context(), db.GetPresetByIDParams{ID: id, OrgID: acc.OrgID()}); err != nil {
		httpx.Error(w, http.StatusNotFound, "preset not found")
		return
	}
	if err := s.store.DeletePreset(r.Context(), db.DeletePresetParams{ID: id, OrgID: acc.OrgID()}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to delete preset")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
