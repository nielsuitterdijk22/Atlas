// Package provision owns the render + commit core of executing a template:
// preset resolution, rendering, output dispatch, and writing the execution log.
package provision

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nielsuitterdijk22/atlas/internal/store"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
	"github.com/nielsuitterdijk22/atlas/internal/template"
)

// ExecuteResult is the outcome of rendering + committing a template.
type ExecuteResult struct {
	Success      bool     `json:"success"`
	Message      string   `json:"message"`
	CommitSha    string   `json:"commitSha,omitempty"`
	CommitUrl    string   `json:"commitUrl,omitempty"`
	FilesCreated []string `json:"filesCreated"`
}

// Outcome bundles the render result with the execution log row it produced.
type Outcome struct {
	Result         ExecuteResult
	ExecutionLogID uuid.UUID
}

// OutputService commits rendered files somewhere (local git repo or GitHub).
type OutputService interface {
	CommitFiles(ctx context.Context, files map[string]string, target template.Target, values map[string]any, gh *template.GitHub) ExecuteResult
}

type Service struct {
	store    *store.Store
	logger   *slog.Logger
	gitLocal OutputService
	gitHub   OutputService
}

func NewService(st *store.Store, logger *slog.Logger) *Service {
	return &Service{store: st, logger: logger, gitLocal: NewLocalOutput(logger), gitHub: NewGitHubOutput(logger)}
}

// ValidateRequired returns an error message if a required input is missing, else "".
func ValidateRequired(spec template.Spec, values map[string]any) string {
	for _, input := range spec.Inputs {
		if !input.Required {
			continue
		}
		v, ok := values[input.ID]
		if !ok || v == nil {
			return fmt.Sprintf("Required field '%s' is missing", input.ID)
		}
		if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
			return fmt.Sprintf("Required field '%s' is missing", input.ID)
		}
	}
	return ""
}

// Run renders the template and commits the result. Writes an ExecutionLog
// regardless of outcome.
func (s *Service) Run(
	ctx context.Context,
	orgID uuid.UUID,
	def template.Definition,
	basePath string,
	values map[string]any,
	presetName string,
) (Outcome, error) {
	start := time.Now()
	spec := def.Spec

	// Fill defaults for any input not explicitly supplied.
	for _, input := range spec.Inputs {
		if _, ok := values[input.ID]; !ok && input.Default != nil {
			values[input.ID] = input.Default
		}
	}
	valuesJSON, _ := json.Marshal(values)

	target := spec.Output.Target
	gh := spec.Output.GitHub

	resolvedPreset := presetName
	if resolvedPreset == "" {
		resolvedPreset = spec.Output.Preset
	}
	if resolvedPreset != "" {
		preset, err := s.store.GetPresetByName(ctx, db.GetPresetByNameParams{OrgID: orgID, Name: resolvedPreset})
		if err != nil {
			msg := fmt.Sprintf("Preset '%s' not found", resolvedPreset)
			log, logErr := s.writeLog(ctx, orgID, def, "failed", msg, nil, string(valuesJSON), "", "", "", "", time.Since(start))
			if logErr != nil {
				return Outcome{}, logErr
			}
			return Outcome{Result: ExecuteResult{Success: false, Message: msg}, ExecutionLogID: log.ID}, nil
		}
		commitMsg := spec.Output.Target.CommitMessage
		if preset.CommitMessageTemplate.Valid && preset.CommitMessageTemplate.String != "" {
			commitMsg = preset.CommitMessageTemplate.String
		}
		target = template.Target{
			Type:          preset.Type,
			Repo:          preset.Repo,
			Branch:        preset.Branch,
			Path:          preset.Path,
			CommitMessage: commitMsg,
		}
		tokenEnv := "GITHUB_TOKEN"
		if preset.GitHubTokenEnv.Valid && preset.GitHubTokenEnv.String != "" {
			tokenEnv = preset.GitHubTokenEnv.String
		} else if gh != nil && gh.TokenEnv != "" {
			tokenEnv = gh.TokenEnv
		}
		gh = &template.GitHub{TokenEnv: tokenEnv}
	}

	outputRepo, _ := template.Render(target.Repo, values)

	skeletonPath := filepath.Join(basePath, spec.Output.Template)
	files, err := template.RenderFolder(skeletonPath, values)
	if err != nil {
		log, logErr := s.writeLog(ctx, orgID, def, "failed", err.Error(), nil, string(valuesJSON), target.Type, outputRepo, "", "", time.Since(start))
		if logErr != nil {
			return Outcome{}, logErr
		}
		return Outcome{Result: ExecuteResult{Success: false, Message: err.Error()}, ExecutionLogID: log.ID}, nil
	}

	var out OutputService
	switch strings.ToLower(target.Type) {
	case "github":
		out = s.gitHub
	case "local":
		out = s.gitLocal
	default:
		msg := fmt.Sprintf("Unknown target type: %s", target.Type)
		log, logErr := s.writeLog(ctx, orgID, def, "failed", msg, nil, string(valuesJSON), target.Type, outputRepo, "", "", time.Since(start))
		if logErr != nil {
			return Outcome{}, logErr
		}
		return Outcome{Result: ExecuteResult{Success: false, Message: msg}, ExecutionLogID: log.ID}, nil
	}

	result := out.CommitFiles(ctx, files, target, values, gh)

	status := "failed"
	errMsg := result.Message
	if result.Success {
		status = "success"
		errMsg = ""
	}
	log, err := s.writeLog(ctx, orgID, def, status, errMsg, result.FilesCreated, string(valuesJSON), target.Type, outputRepo, result.CommitSha, result.CommitUrl, time.Since(start))
	if err != nil {
		return Outcome{}, err
	}

	return Outcome{Result: result, ExecutionLogID: log.ID}, nil
}

func (s *Service) writeLog(
	ctx context.Context,
	orgID uuid.UUID,
	def template.Definition,
	status, errMessage string,
	filesCreated []string,
	valuesJSON, outputTarget, outputRepo, commitSha, commitURL string,
	duration time.Duration,
) (db.ExecutionLog, error) {
	filesJSON := []byte("[]")
	if filesCreated != nil {
		filesJSON, _ = json.Marshal(filesCreated)
	}
	return s.store.CreateExecutionLog(ctx, db.CreateExecutionLogParams{
		OrgID:         orgID,
		TemplateName:  def.Metadata.Name,
		TemplateTitle: def.Metadata.Title,
		Status:        status,
		CommitSha:     pgtype.Text{String: commitSha, Valid: commitSha != ""},
		CommitUrl:     pgtype.Text{String: commitURL, Valid: commitURL != ""},
		ErrorMessage:  pgtype.Text{String: errMessage, Valid: errMessage != ""},
		ValuesJson:    []byte(valuesJSON),
		FilesCreated:  filesJSON,
		OutputTarget:  pgtype.Text{String: outputTarget, Valid: outputTarget != ""},
		OutputRepo:    pgtype.Text{String: outputRepo, Valid: outputRepo != ""},
		DurationMs:    float64(duration.Milliseconds()),
	})
}

// NormalizeValues is a no-op in Go (unlike the old C# path, JSON decoding
// already gives us plain Go types — no JsonElement boxing to unwrap).
func NormalizeValues(values map[string]any) map[string]any { return values }
