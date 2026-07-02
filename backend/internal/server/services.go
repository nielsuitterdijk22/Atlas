package server

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nielsuitterdijk22/atlas/internal/httpx"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
)

func (s *Server) handleListServices(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	q := r.URL.Query()
	page := atoiDefault(q.Get("page"), 1)
	if page < 1 {
		page = 1
	}
	pageSize := atoiDefault(q.Get("pageSize"), 12)
	if pageSize < 1 {
		pageSize = 1
	}
	if pageSize > 100 {
		pageSize = 100
	}
	team := q.Get("team")
	search := q.Get("search")

	rows, err := s.store.ListServices(r.Context(), db.ListServicesParams{
		OrgID:  acc.OrgID(),
		Team:   team,
		Search: search,
		Limit:  int32(pageSize),
		Offset: int32((page - 1) * pageSize),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to load services")
		return
	}
	total, err := s.store.CountServices(r.Context(), db.CountServicesParams{OrgID: acc.OrgID(), Team: team, Search: search})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to count services")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"items":    rows,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (s *Server) handleGetService(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "service not found")
		return
	}
	svc, err := s.store.GetServiceByID(r.Context(), db.GetServiceByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "service not found")
		return
	}
	httpx.JSON(w, http.StatusOK, svc)
}

func atoiDefault(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return n
}
