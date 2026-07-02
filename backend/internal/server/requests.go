package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nielsuitterdijk22/yaly/internal/httpx"
	"github.com/nielsuitterdijk22/yaly/internal/provision"
	"github.com/nielsuitterdijk22/yaly/internal/store/db"
	"github.com/nielsuitterdijk22/yaly/internal/template"
)

func (s *Server) handleListRequests(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	rows, err := s.store.ListRequests(r.Context(), db.ListRequestsParams{OrgID: acc.OrgID(), Status: r.URL.Query().Get("status")})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to load requests")
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

func (s *Server) handleGetRequest(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	req, err := s.store.GetRequestByID(r.Context(), db.GetRequestByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	httpx.JSON(w, http.StatusOK, req)
}

func (s *Server) handleCreateRequest(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	var body struct {
		TemplateName string         `json:"templateName"`
		Name         string         `json:"name"`
		Team         string         `json:"team"`
		Owner        string         `json:"owner"`
		Values       map[string]any `json:"values"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	entry, found := s.catalog.Get(acc.OrgID(), body.TemplateName)
	if !found {
		httpx.Error(w, http.StatusNotFound, "Template '"+body.TemplateName+"' not found")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "Service name is required")
		return
	}

	def := entry.Definition
	spec := def.Spec
	values := provision.NormalizeValues(body.Values)
	if values == nil {
		values = map[string]any{}
	}
	if nameInput := resolveNameInput(spec); nameInput != "" {
		values[nameInput] = body.Name
	}
	values["name"] = body.Name
	values["team"] = body.Team
	values["owner"] = body.Owner

	if msg := provision.ValidateRequired(spec, values); msg != "" {
		httpx.Error(w, http.StatusBadRequest, msg)
		return
	}

	valuesJSON, _ := json.Marshal(values)
	status := "provisioning"
	if spec.ApprovalRequired {
		status = "pending-approval"
	}
	owner := body.Owner
	if strings.TrimSpace(owner) == "" {
		owner = acc.Identity.Username
	}

	req, err := s.store.CreateRequest(r.Context(), db.CreateRequestParams{
		OrgID:            acc.OrgID(),
		TemplateName:     def.Metadata.Name,
		TemplateTitle:    def.Metadata.Title,
		Name:             body.Name,
		Team:             pgtype.Text{String: body.Team, Valid: body.Team != ""},
		Owner:            pgtype.Text{String: owner, Valid: true},
		SubmittedBy:      pgtype.Text{String: acc.Identity.Username, Valid: true},
		RequiresApproval: spec.ApprovalRequired,
		ValuesJson:       pgtype.Text{String: string(valuesJSON), Valid: true},
		Status:           status,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to create request")
		return
	}

	if !spec.ApprovalRequired {
		req = s.provisionRequest(r.Context(), req, def, entry.BasePath, values)
	}
	httpx.JSON(w, http.StatusCreated, req)
}

func (s *Server) handleApproveRequest(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	req, err := s.store.GetRequestByID(r.Context(), db.GetRequestByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	if req.Status != "pending-approval" {
		httpx.Error(w, http.StatusBadRequest, "Request is not awaiting approval (status: "+req.Status+")")
		return
	}
	entry, found := s.catalog.Get(acc.OrgID(), req.TemplateName)
	if !found {
		httpx.Error(w, http.StatusBadRequest, "Template '"+req.TemplateName+"' no longer exists")
		return
	}

	req, err = s.store.ApproveRequest(r.Context(), db.ApproveRequestParams{ID: id, ApprovedBy: pgtype.Text{String: acc.Identity.Username, Valid: true}})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to approve request")
		return
	}

	values := deserializeValues(req.ValuesJson)
	req = s.provisionRequest(r.Context(), req, entry.Definition, entry.BasePath, values)
	httpx.JSON(w, http.StatusOK, req)
}

func (s *Server) handleRejectRequest(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, true)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	req, err := s.store.GetRequestByID(r.Context(), db.GetRequestByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	if req.Status != "pending-approval" {
		httpx.Error(w, http.StatusBadRequest, "Request is not awaiting approval (status: "+req.Status+")")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	_ = httpx.Decode(r, &body)
	reason := strings.TrimSpace(body.Reason)
	if reason == "" {
		reason = "No reason given"
	}

	req, err = s.store.RejectRequest(r.Context(), db.RejectRequestParams{
		ID:              id,
		RejectionReason: pgtype.Text{String: reason, Valid: true},
		ApprovedBy:      pgtype.Text{String: acc.Identity.Username, Valid: true},
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to reject request")
		return
	}
	httpx.JSON(w, http.StatusOK, req)
}

func (s *Server) handleRetryRequest(w http.ResponseWriter, r *http.Request) {
	acc, ok := s.requireOrg(w, r, false)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	req, err := s.store.GetRequestByID(r.Context(), db.GetRequestByIDParams{ID: id, OrgID: acc.OrgID()})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "request not found")
		return
	}
	if req.Status != "failed" {
		httpx.Error(w, http.StatusBadRequest, "Only failed requests can be retried (status: "+req.Status+")")
		return
	}
	entry, found := s.catalog.Get(acc.OrgID(), req.TemplateName)
	if !found {
		httpx.Error(w, http.StatusBadRequest, "Template '"+req.TemplateName+"' no longer exists")
		return
	}

	req, err = s.store.StartRetry(r.Context(), id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to retry request")
		return
	}

	values := deserializeValues(req.ValuesJson)
	req = s.provisionRequest(r.Context(), req, entry.Definition, entry.BasePath, values)
	httpx.JSON(w, http.StatusOK, req)
}

// provisionRequest runs provisioning for a request, updates its status, and
// registers a Service on success. Errors are swallowed into the request's
// failed state (matching the old .NET behavior of always completing the HTTP
// response with the request's resulting status).
func (s *Server) provisionRequest(ctx context.Context, req db.ProvisioningRequest, def template.Definition, basePath string, values map[string]any) db.ProvisioningRequest {
	outcome, err := s.provision.Run(ctx, req.OrgID, def, basePath, values, "")
	if err != nil {
		s.logger.Error("failed to provision request", "requestId", req.ID, "error", err)
		updated, uerr := s.store.CompleteRequest(ctx, db.CompleteRequestParams{
			ID:             req.ID,
			Status:         "failed",
			ExecutionLogID: uuid.NullUUID{},
			CommitSha:      pgtype.Text{},
			CommitUrl:      pgtype.Text{},
			ErrorMessage:   pgtype.Text{String: err.Error(), Valid: true},
		})
		if uerr != nil {
			return req
		}
		return updated
	}

	result := outcome.Result
	status := "failed"
	var errMsg pgtype.Text
	if result.Success {
		status = "completed"
	} else {
		errMsg = pgtype.Text{String: result.Message, Valid: result.Message != ""}
	}

	updated, err := s.store.CompleteRequest(ctx, db.CompleteRequestParams{
		ID:             req.ID,
		Status:         status,
		ExecutionLogID: uuid.NullUUID{UUID: outcome.ExecutionLogID, Valid: true},
		CommitSha:      pgtype.Text{String: result.CommitSha, Valid: result.CommitSha != ""},
		CommitUrl:      pgtype.Text{String: result.CommitUrl, Valid: result.CommitUrl != ""},
		ErrorMessage:   errMsg,
	})
	if err != nil {
		s.logger.Error("failed to record request completion", "requestId", req.ID, "error", err)
		return req
	}

	if result.Success {
		var description pgtype.Text
		if d, ok := values["description"]; ok {
			if ds, ok := d.(string); ok {
				description = pgtype.Text{String: ds, Valid: ds != ""}
			}
		}
		if _, err := s.store.CreateService(ctx, db.CreateServiceParams{
			OrgID:        req.OrgID,
			Name:         req.Name,
			TemplateName: pgtype.Text{String: def.Metadata.Name, Valid: true},
			ServiceType:  pgtype.Text{String: def.Metadata.ServiceType, Valid: true},
			Team:         req.Team,
			Owner:        req.Owner,
			Lifecycle:    resolveLifecycle(values),
			Description:  description,
			RepoUrl:      pgtype.Text{String: result.CommitUrl, Valid: result.CommitUrl != ""},
			RequestID:    req.ID,
		}); err != nil {
			s.logger.Error("failed to register service", "requestId", req.ID, "error", err)
		}
	}

	return updated
}

// resolveNameInput mirrors RequestsController.ResolveNameInput on the old .NET
// backend: which input id the submitted service name should be written to.
func resolveNameInput(spec template.Spec) string {
	if spec.NameInput != "" {
		return spec.NameInput
	}
	for _, i := range spec.Inputs {
		if i.ID == "name" {
			return "name"
		}
	}
	for _, i := range spec.Inputs {
		if i.ID == "service_name" {
			return "service_name"
		}
	}
	for _, i := range spec.Inputs {
		if i.Required && i.Type == "string" {
			return i.ID
		}
	}
	return ""
}

func resolveLifecycle(values map[string]any) string {
	env, _ := values["environment"].(string)
	if env == "" {
		env, _ = values["env"].(string)
	}
	switch strings.ToLower(env) {
	case "prod", "production":
		return "production"
	case "staging", "test", "tst":
		return "staging"
	case "dev", "development":
		return "development"
	case "experimental":
		return "experimental"
	case "":
		return "production"
	default:
		return strings.ToLower(env)
	}
}

func deserializeValues(valuesJSON pgtype.Text) map[string]any {
	if !valuesJSON.Valid || valuesJSON.String == "" {
		return map[string]any{}
	}
	var values map[string]any
	if err := json.Unmarshal([]byte(valuesJSON.String), &values); err != nil {
		return map[string]any{}
	}
	return provision.NormalizeValues(values)
}
