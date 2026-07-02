package catalog

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport/http"

	"github.com/nielsuitterdijk22/yaly/internal/secret"
	"github.com/nielsuitterdijk22/yaly/internal/store/db"
)

// SyncService clones an organization's catalog Git repo into its local cache directory.
type SyncService struct {
	catalog   *Service
	protector *secret.Protector
	logger    *slog.Logger
}

func NewSyncService(catalog *Service, protector *secret.Protector, logger *slog.Logger) *SyncService {
	return &SyncService{catalog: catalog, protector: protector, logger: logger}
}

// Sync fresh-clones the org's catalog repo and reloads its templates. Returns
// the template count.
func (s *SyncService) Sync(ctx context.Context, org db.Organization) (int, error) {
	if !org.CatalogRepoUrl.Valid || org.CatalogRepoUrl.String == "" {
		return 0, fmt.Errorf("organization has no catalog repository URL")
	}

	path := s.catalog.OrgCachePath(org.ID)
	if _, err := os.Stat(path); err == nil {
		if err := os.RemoveAll(path); err != nil {
			return 0, fmt.Errorf("clear existing cache: %w", err)
		}
	}

	cloneOpts := &git.CloneOptions{URL: org.CatalogRepoUrl.String}
	if org.CatalogRepoTokenEncrypted.Valid && org.CatalogRepoTokenEncrypted.String != "" {
		token, err := s.protector.Unprotect(org.CatalogRepoTokenEncrypted.String)
		if err == nil && token != "" {
			cloneOpts.Auth = &http.BasicAuth{Username: token, Password: ""}
		}
	}

	s.logger.Info("cloning catalog", "repo", org.CatalogRepoUrl.String, "orgId", org.ID)
	repo, err := git.PlainCloneContext(ctx, path, false, cloneOpts)
	if err != nil {
		return 0, fmt.Errorf("clone: %w", err)
	}

	// Switch to the requested branch only when it differs from the default.
	wanted := org.CatalogBranch
	if wanted != "" {
		head, err := repo.Head()
		if err == nil && head.Name().Short() != wanted {
			ref, err := repo.Reference(plumbing.NewRemoteReferenceName("origin", wanted), true)
			if err != nil {
				return 0, fmt.Errorf("branch '%s' not found in the repository", wanted)
			}
			wt, err := repo.Worktree()
			if err != nil {
				return 0, err
			}
			localRef := plumbing.NewBranchReferenceName(wanted)
			if err := repo.Storer.SetReference(plumbing.NewHashReference(localRef, ref.Hash())); err != nil {
				return 0, err
			}
			if err := wt.Checkout(&git.CheckoutOptions{Branch: localRef}); err != nil {
				return 0, fmt.Errorf("checkout branch '%s': %w", wanted, err)
			}
		}
	}

	s.catalog.Reload(org.ID)
	return len(s.catalog.GetAll(org.ID)), nil
}
