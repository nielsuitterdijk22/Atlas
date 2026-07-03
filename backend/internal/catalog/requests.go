package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-git/go-billy/v5/memfs"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/go-git/go-git/v5/storage/memory"
	"github.com/google/uuid"

	"github.com/nielsuitterdijk22/atlas/internal/secret"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
)

// RequestRecord is the git-backed counterpart of a provisioning_requests row
// — committed to <catalog repo>/requests/<template>/<id>.json so submitted
// form answers live in git alongside the catalog forms themselves, not just
// in Postgres.
type RequestRecord struct {
	ID           uuid.UUID      `json:"id"`
	TemplateName string         `json:"templateName"`
	Name         string         `json:"name"`
	Team         string         `json:"team,omitempty"`
	Owner        string         `json:"owner,omitempty"`
	SubmittedBy  string         `json:"submittedBy"`
	Status       string         `json:"status"`
	Values       map[string]any `json:"values"`
	SubmittedAt  time.Time      `json:"submittedAt"`
}

// PushRequestRecord commits rec to the org's linked Quill catalog repo. It
// no-ops when the org hasn't linked a catalog repo — that step of onboarding
// is optional, and callers should treat any error here as best-effort (never
// fail the request submission itself because git was unreachable).
func PushRequestRecord(ctx context.Context, org db.Organization, protector *secret.Protector, rec RequestRecord) error {
	if !org.CatalogRepoUrl.Valid || org.CatalogRepoUrl.String == "" {
		return nil
	}

	auth, err := repoAuth(org, protector)
	if err != nil {
		return fmt.Errorf("decrypt catalog repo token: %w", err)
	}

	storer := memory.NewStorage()
	fs := memfs.New()
	cloneOpts := &git.CloneOptions{URL: org.CatalogRepoUrl.String, Auth: auth, Depth: 1, SingleBranch: true}
	if org.CatalogBranch != "" {
		cloneOpts.ReferenceName = plumbing.NewBranchReferenceName(org.CatalogBranch)
	}
	repo, err := git.CloneContext(ctx, storer, fs, cloneOpts)
	if err != nil {
		return fmt.Errorf("clone catalog repo: %w", err)
	}

	wt, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("open worktree: %w", err)
	}

	payload, err := json.MarshalIndent(rec, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal request record: %w", err)
	}
	relPath := fmt.Sprintf("requests/%s/%s.json", rec.TemplateName, rec.ID)
	f, err := fs.Create(relPath)
	if err != nil {
		return fmt.Errorf("create %s: %w", relPath, err)
	}
	if _, err := f.Write(payload); err != nil {
		_ = f.Close()
		return fmt.Errorf("write %s: %w", relPath, err)
	}
	if err := f.Close(); err != nil {
		return fmt.Errorf("close %s: %w", relPath, err)
	}
	if _, err := wt.Add(relPath); err != nil {
		return fmt.Errorf("stage %s: %w", relPath, err)
	}

	sig := &object.Signature{Name: "Atlas", Email: "atlas@localhost", When: time.Now()}
	msg := fmt.Sprintf("Record request: %s (%s)", rec.Name, rec.TemplateName)
	if _, err := wt.Commit(msg, &git.CommitOptions{Author: sig, Committer: sig}); err != nil {
		return fmt.Errorf("commit: %w", err)
	}

	if err := repo.PushContext(ctx, &git.PushOptions{Auth: auth}); err != nil {
		return fmt.Errorf("push: %w", err)
	}
	return nil
}

func repoAuth(org db.Organization, protector *secret.Protector) (*http.BasicAuth, error) {
	if !org.CatalogRepoTokenEncrypted.Valid || org.CatalogRepoTokenEncrypted.String == "" {
		return nil, nil
	}
	token, err := protector.Unprotect(org.CatalogRepoTokenEncrypted.String)
	if err != nil {
		return nil, err
	}
	if token == "" {
		return nil, nil
	}
	return &http.BasicAuth{Username: token, Password: ""}, nil
}
