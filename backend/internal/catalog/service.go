// Package catalog loads per-organization templates from a local cache
// directory populated by SyncService from each org's catalog Git repo.
package catalog

import (
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
	"gopkg.in/yaml.v3"

	"github.com/nielsuitterdijk22/atlas/internal/template"
)

// Entry pairs a parsed template definition with the directory it was loaded
// from (needed to resolve its skeleton path at execute time).
type Entry struct {
	Definition template.Definition
	BasePath   string
}

// Service is an in-memory, per-org template cache backed by
// <cacheRoot>/<orgId>/, one form.yaml per template directory.
type Service struct {
	cacheRoot string
	logger    *slog.Logger
	mu        sync.RWMutex
	byOrg     map[uuid.UUID]map[string]Entry
}

func NewService(cacheRoot string, logger *slog.Logger) *Service {
	return &Service{cacheRoot: cacheRoot, logger: logger, byOrg: make(map[uuid.UUID]map[string]Entry)}
}

// OrgCachePath is the local directory holding an org's cloned catalog.
func (s *Service) OrgCachePath(orgID uuid.UUID) string {
	abs, _ := filepath.Abs(filepath.Join(s.cacheRoot, orgID.String()))
	return abs
}

func (s *Service) GetAll(orgID uuid.UUID) []template.Definition {
	s.mu.Lock()
	defer s.mu.Unlock()
	entries := s.ensureLoaded(orgID)
	out := make([]template.Definition, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.Definition)
	}
	return out
}

func (s *Service) Get(orgID uuid.UUID, name string) (Entry, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entries := s.ensureLoaded(orgID)
	e, ok := entries[name]
	return e, ok
}

// Reload discards the cached templates for an org so the next access re-reads disk.
func (s *Service) Reload(orgID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.byOrg[orgID] = s.loadFromDisk(orgID)
}

func (s *Service) ensureLoaded(orgID uuid.UUID) map[string]Entry {
	entries, ok := s.byOrg[orgID]
	if !ok {
		entries = s.loadFromDisk(orgID)
		s.byOrg[orgID] = entries
	}
	return entries
}

func (s *Service) loadFromDisk(orgID uuid.UUID) map[string]Entry {
	entries := make(map[string]Entry)
	catalogDir := s.OrgCachePath(orgID)

	if _, err := os.Stat(catalogDir); os.IsNotExist(err) {
		s.logger.Info("no catalog cache for org yet", "orgId", orgID)
		return entries
	}

	_ = filepath.WalkDir(catalogDir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || d.Name() != "form.yaml" {
			return nil
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			s.logger.Error("failed to read template", "file", path, "error", err)
			return nil
		}
		var def template.Definition
		if err := yaml.Unmarshal(raw, &def); err != nil {
			s.logger.Error("failed to parse template", "file", path, "error", err)
			return nil
		}
		entries[def.Metadata.Name] = Entry{Definition: def, BasePath: filepath.Dir(path)}
		return nil
	})

	s.logger.Info("loaded templates for org", "count", len(entries), "orgId", orgID)
	return entries
}
