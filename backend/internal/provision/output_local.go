package provision

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"

	"github.com/nielsuitterdijk22/atlas/internal/template"
)

type LocalOutput struct {
	logger *slog.Logger
}

func NewLocalOutput(logger *slog.Logger) *LocalOutput { return &LocalOutput{logger: logger} }

func (o *LocalOutput) CommitFiles(_ context.Context, files map[string]string, target template.Target, values map[string]any, _ *template.GitHub) ExecuteResult {
	repoPath, err := template.Render(target.Repo, values)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		if err := os.MkdirAll(repoPath, 0o755); err != nil {
			return ExecuteResult{Success: false, Message: err.Error()}
		}
		repo, err = git.PlainInit(repoPath, false)
		if err != nil {
			return ExecuteResult{Success: false, Message: err.Error()}
		}
		o.logger.Info("initialized new local repo", "path", repoPath)
	}

	wt, err := repo.Worktree()
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	basePath := strings.TrimPrefix(target.Path, "/")
	created := make([]string, 0, len(files))
	for relativePath, content := range files {
		full := filepath.Join(repoPath, basePath, relativePath)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			return ExecuteResult{Success: false, Message: err.Error()}
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			return ExecuteResult{Success: false, Message: err.Error()}
		}
		staged := filepath.ToSlash(filepath.Join(basePath, relativePath))
		if _, err := wt.Add(staged); err != nil {
			return ExecuteResult{Success: false, Message: err.Error()}
		}
		created = append(created, relativePath)
	}
	sort.Strings(created)

	commitMessage, err := template.Render(target.CommitMessage, values)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}
	sig := &object.Signature{Name: "Atlas", Email: "atlas@localhost", When: time.Now()}
	sha, err := wt.Commit(commitMessage, &git.CommitOptions{Author: sig, Committer: sig})
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	return ExecuteResult{
		Success:      true,
		Message:      fmt.Sprintf("Committed %d files to local repo", len(files)),
		CommitSha:    sha.String(),
		FilesCreated: created,
	}
}
