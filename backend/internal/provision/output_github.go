package provision

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"strings"

	"github.com/google/go-github/v67/github"

	"github.com/nielsuitterdijk22/atlas/internal/template"
)

type GitHubOutput struct {
	logger *slog.Logger
}

func NewGitHubOutput(logger *slog.Logger) *GitHubOutput { return &GitHubOutput{logger: logger} }

func (o *GitHubOutput) CommitFiles(ctx context.Context, files map[string]string, target template.Target, values map[string]any, gh *template.GitHub) ExecuteResult {
	tokenEnv := "GITHUB_TOKEN"
	if gh != nil && gh.TokenEnv != "" {
		tokenEnv = gh.TokenEnv
	}

	var token string
	if strings.HasPrefix(tokenEnv, "ghp_") || strings.HasPrefix(tokenEnv, "github_pat_") || strings.HasPrefix(tokenEnv, "gho_") {
		// User provided the token value directly instead of an env var name.
		o.logger.Warn("token value provided directly in preset; use an environment variable name instead")
		token = tokenEnv
	} else {
		token = os.Getenv(tokenEnv)
		if token == "" {
			return ExecuteResult{Success: false, Message: fmt.Sprintf(
				"Environment variable '%s' is not set. Set it with: export %s=ghp_your_token", tokenEnv, tokenEnv)}
		}
	}

	client := github.NewClient(nil).WithAuthToken(token)

	repoFullName, err := template.Render(target.Repo, values)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}
	parts := strings.SplitN(repoFullName, "/", 2)
	if len(parts) != 2 {
		return ExecuteResult{Success: false, Message: fmt.Sprintf("Invalid repo format: %s. Expected 'owner/repo'.", repoFullName)}
	}
	owner, repoName := parts[0], parts[1]
	branch := target.Branch
	basePath := strings.TrimPrefix(target.Path, "/")

	ref, _, err := client.Git.GetRef(ctx, owner, repoName, "refs/heads/"+branch)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}
	baseCommit, _, err := client.Git.GetCommit(ctx, owner, repoName, ref.GetObject().GetSHA())
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	relPaths := make([]string, 0, len(files))
	for p := range files {
		relPaths = append(relPaths, p)
	}
	sort.Strings(relPaths)

	entries := make([]*github.TreeEntry, 0, len(files))
	for _, relPath := range relPaths {
		filePath := relPath
		if basePath != "" {
			filePath = basePath + "/" + relPath
		}
		content := files[relPath]
		entries = append(entries, &github.TreeEntry{
			Path:    github.String(filePath),
			Mode:    github.String("100644"),
			Type:    github.String("blob"),
			Content: github.String(content),
		})
	}

	tree, _, err := client.Git.CreateTree(ctx, owner, repoName, baseCommit.GetTree().GetSHA(), entries)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	commitMessage, err := template.Render(target.CommitMessage, values)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}
	newCommit, _, err := client.Git.CreateCommit(ctx, owner, repoName, &github.Commit{
		Message: github.String(commitMessage),
		Tree:    tree,
		Parents: []*github.Commit{{SHA: baseCommit.SHA}},
	}, nil)
	if err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	if _, _, err := client.Git.UpdateRef(ctx, owner, repoName, &github.Reference{
		Ref:    github.String("refs/heads/" + branch),
		Object: &github.GitObject{SHA: newCommit.SHA},
	}, false); err != nil {
		return ExecuteResult{Success: false, Message: err.Error()}
	}

	return ExecuteResult{
		Success:      true,
		Message:      fmt.Sprintf("Committed %d files to %s", len(files), repoFullName),
		CommitSha:    newCommit.GetSHA(),
		CommitUrl:    fmt.Sprintf("https://github.com/%s/%s/commit/%s", owner, repoName, newCommit.GetSHA()),
		FilesCreated: relPaths,
	}
}
