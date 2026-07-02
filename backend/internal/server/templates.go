package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/nielsuitterdijk22/yaly/internal/httpx"
	"github.com/nielsuitterdijk22/yaly/internal/provision"
)

func (s *Server) handleListTemplates(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	httpx.JSON(w, http.StatusOK, s.catalog.GetAll(acc.OrgID()))
}

func (s *Server) handleGetTemplate(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	name := chi.URLParam(r, "name")
	entry, found := s.catalog.Get(acc.OrgID(), name)
	if !found {
		httpx.Error(w, http.StatusNotFound, "Template '"+name+"' not found")
		return
	}
	httpx.JSON(w, http.StatusOK, entry.Definition)
}

func (s *Server) handleExecuteTemplate(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	name := chi.URLParam(r, "name")
	entry, found := s.catalog.Get(acc.OrgID(), name)
	if !found {
		httpx.Error(w, http.StatusNotFound, "Template '"+name+"' not found")
		return
	}

	var body struct {
		Values map[string]any `json:"values"`
		Preset string         `json:"preset"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	values := provision.NormalizeValues(body.Values)
	if values == nil {
		values = map[string]any{}
	}

	if msg := provision.ValidateRequired(entry.Definition.Spec, values); msg != "" {
		httpx.Error(w, http.StatusBadRequest, msg)
		return
	}

	outcome, err := s.provision.Run(r.Context(), acc.OrgID(), entry.Definition, entry.BasePath, values, body.Preset)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "provisioning failed")
		return
	}
	if !outcome.Result.Success {
		httpx.JSON(w, http.StatusInternalServerError, outcome.Result)
		return
	}
	httpx.JSON(w, http.StatusOK, outcome.Result)
}
