package server

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nielsuitterdijk22/atlas/internal/httpx"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
)

const (
	platformEngineerRole = "platform-engineer"
	developerRole        = "developer"
)

var slugInvalidChars = regexp.MustCompile(`[^a-z0-9]+`)

func (s *Server) handleListOrgs(w http.ResponseWriter, r *http.Request) {
	id, ok := identityFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	rows, err := s.store.ListOrganizationsForUser(r.Context(), toNullUUID(id.UserID))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to load organizations")
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, o := range rows {
		out = append(out, map[string]any{"id": o.ID, "name": o.Name, "slug": o.Slug, "role": o.Role})
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (s *Server) handleCreateOrg(w http.ResponseWriter, r *http.Request) {
	id, ok := identityFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "Organization name is required")
		return
	}

	slug, err := s.uniqueSlug(r, body.Name)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to generate slug")
		return
	}

	org, err := s.store.CreateOrganization(r.Context(), db.CreateOrganizationParams{
		Name:            strings.TrimSpace(body.Name),
		Slug:            slug,
		CreatedByUserID: id.UserID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to create organization")
		return
	}
	if _, err := s.store.CreateMembership(r.Context(), db.CreateMembershipParams{
		OrgID:           org.ID,
		UserID:          toNullUUID(id.UserID),
		Username:        id.Username,
		Role:            platformEngineerRole,
		Status:          "active",
		InvitedByUserID: toNullUUID(id.UserID),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to create membership")
		return
	}

	httpx.JSON(w, http.StatusCreated, orgDetail(org, platformEngineerRole, nil))
}

func (s *Server) handleGetOrg(w http.ResponseWriter, r *http.Request) {
	orgID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "organization not found")
		return
	}
	id, ok := identityFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}
	mine, err := s.store.GetActiveMembership(r.Context(), db.GetActiveMembershipParams{OrgID: orgID, UserID: toNullUUID(id.UserID)})
	if err != nil {
		httpx.Error(w, http.StatusForbidden, "You are not a member of this organization")
		return
	}
	org, err := s.store.GetOrganizationByID(r.Context(), orgID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "organization not found")
		return
	}
	members, err := s.store.ListMembershipsByOrg(r.Context(), orgID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to load members")
		return
	}
	httpx.JSON(w, http.StatusOK, orgDetail(org, mine.Role, members))
}

func (s *Server) handleUpdateOrg(w http.ResponseWriter, r *http.Request) {
	orgID, org, errResp := s.requirePlatformEngineerOrg(w, r)
	if errResp {
		return
	}

	var body struct {
		Name             *string `json:"name"`
		CatalogRepoURL   *string `json:"catalogRepoUrl"`
		CatalogBranch    *string `json:"catalogBranch"`
		CatalogRepoToken *string `json:"catalogRepoToken"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := org.Name
	if body.Name != nil && strings.TrimSpace(*body.Name) != "" {
		name = strings.TrimSpace(*body.Name)
	}
	repoURL := org.CatalogRepoUrl
	if body.CatalogRepoURL != nil {
		repoURL = pgtype.Text{String: strings.TrimSpace(*body.CatalogRepoURL), Valid: true}
	}
	branch := org.CatalogBranch
	if body.CatalogBranch != nil && strings.TrimSpace(*body.CatalogBranch) != "" {
		branch = strings.TrimSpace(*body.CatalogBranch)
	}
	tokenEnc := org.CatalogRepoTokenEncrypted
	if body.CatalogRepoToken != nil {
		// Empty string clears the token; a value is encrypted before storing.
		if strings.TrimSpace(*body.CatalogRepoToken) == "" {
			tokenEnc = pgtype.Text{}
		} else {
			enc, err := s.protector.Protect(strings.TrimSpace(*body.CatalogRepoToken))
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "failed to encrypt token")
				return
			}
			tokenEnc = pgtype.Text{String: enc, Valid: true}
		}
	}

	updated, err := s.store.UpdateOrganization(r.Context(), db.UpdateOrganizationParams{
		ID:                        orgID,
		Name:                      name,
		CatalogRepoUrl:            repoURL,
		CatalogBranch:             branch,
		CatalogRepoTokenEncrypted: tokenEnc,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to update organization")
		return
	}
	httpx.JSON(w, http.StatusOK, orgDetail(updated, platformEngineerRole, nil))
}

func (s *Server) handleInviteMember(w http.ResponseWriter, r *http.Request) {
	orgID, _, errResp := s.requirePlatformEngineerOrg(w, r)
	if errResp {
		return
	}
	var body struct {
		Username string `json:"username"`
		Role     string `json:"role"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	username := strings.TrimSpace(body.Username)
	if username == "" {
		httpx.Error(w, http.StatusBadRequest, "Username is required")
		return
	}
	role := developerRole
	if body.Role == platformEngineerRole {
		role = platformEngineerRole
	}

	exists, err := s.store.MembershipExists(r.Context(), db.MembershipExistsParams{OrgID: orgID, Lower: username})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to check membership")
		return
	}
	if exists {
		httpx.Error(w, http.StatusConflict, "'"+username+"' is already a member or invited")
		return
	}

	existingUser, err := s.store.GetUserByUsername(r.Context(), username)
	status := "pending"
	var userID uuid.NullUUID
	if err == nil {
		status = "active"
		userID = toNullUUID(existingUser.ID)
	}

	id, _ := identityFrom(r.Context())
	membership, err := s.store.CreateMembership(r.Context(), db.CreateMembershipParams{
		OrgID:           orgID,
		UserID:          userID,
		Username:        username,
		Role:            role,
		Status:          status,
		InvitedByUserID: toNullUUID(id.UserID),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to create membership")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"id": membership.ID, "username": username, "role": role, "status": status})
}

func (s *Server) handleUpdateMember(w http.ResponseWriter, r *http.Request) {
	orgID, _, errResp := s.requirePlatformEngineerOrg(w, r)
	if errResp {
		return
	}
	membershipID, err := uuid.Parse(chi.URLParam(r, "membershipID"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "membership not found")
		return
	}
	var body struct {
		Role string `json:"role"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	role := developerRole
	if body.Role == platformEngineerRole {
		role = platformEngineerRole
	}

	membership, err := s.store.GetMembershipByID(r.Context(), db.GetMembershipByIDParams{ID: membershipID, OrgID: orgID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "membership not found")
		return
	}
	if role != platformEngineerRole && s.isLastPlatformEngineer(r, orgID, membership) {
		httpx.Error(w, http.StatusBadRequest, "An organization must keep at least one platform engineer")
		return
	}

	updated, err := s.store.UpdateMembershipRole(r.Context(), db.UpdateMembershipRoleParams{ID: membershipID, Role: role})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to update membership")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"id": updated.ID, "username": updated.Username, "role": updated.Role, "status": updated.Status})
}

func (s *Server) handleRemoveMember(w http.ResponseWriter, r *http.Request) {
	orgID, _, errResp := s.requirePlatformEngineerOrg(w, r)
	if errResp {
		return
	}
	membershipID, err := uuid.Parse(chi.URLParam(r, "membershipID"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "membership not found")
		return
	}
	membership, err := s.store.GetMembershipByID(r.Context(), db.GetMembershipByIDParams{ID: membershipID, OrgID: orgID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "membership not found")
		return
	}
	if s.isLastPlatformEngineer(r, orgID, membership) {
		httpx.Error(w, http.StatusBadRequest, "An organization must keep at least one platform engineer")
		return
	}
	if err := s.store.DeleteMembership(r.Context(), membershipID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to remove membership")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleSyncCatalog(w http.ResponseWriter, r *http.Request) {
	orgID, org, errResp := s.requirePlatformEngineerOrg(w, r)
	if errResp {
		return
	}
	if !org.CatalogRepoUrl.Valid || org.CatalogRepoUrl.String == "" {
		httpx.Error(w, http.StatusBadRequest, "Set a catalog repository URL first")
		return
	}

	count, err := s.catalogSync.Sync(r.Context(), org)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Sync failed: "+err.Error())
		return
	}
	if err := s.store.SetOrganizationCatalogSynced(r.Context(), db.SetOrganizationCatalogSyncedParams{
		ID:                orgID,
		LastCatalogSyncAt: pgtype.Timestamptz{Time: nowUTC(), Valid: true},
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "failed to record sync time")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"templateCount": count})
}

// --- helpers ---

func (s *Server) requirePlatformEngineerOrg(w http.ResponseWriter, r *http.Request) (uuid.UUID, db.Organization, bool) {
	orgID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "organization not found")
		return uuid.UUID{}, db.Organization{}, true
	}
	id, ok := identityFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return uuid.UUID{}, db.Organization{}, true
	}
	mine, err := s.store.GetActiveMembership(r.Context(), db.GetActiveMembershipParams{OrgID: orgID, UserID: toNullUUID(id.UserID)})
	if err != nil {
		httpx.Error(w, http.StatusForbidden, "You are not a member of this organization")
		return uuid.UUID{}, db.Organization{}, true
	}
	if mine.Role != platformEngineerRole {
		httpx.Error(w, http.StatusForbidden, "Only a platform engineer can do this")
		return uuid.UUID{}, db.Organization{}, true
	}
	org, err := s.store.GetOrganizationByID(r.Context(), orgID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "organization not found")
		return uuid.UUID{}, db.Organization{}, true
	}
	return orgID, org, false
}

func (s *Server) isLastPlatformEngineer(r *http.Request, orgID uuid.UUID, candidate db.Membership) bool {
	if candidate.Role != platformEngineerRole {
		return false
	}
	count, err := s.store.CountActivePlatformEngineers(r.Context(), orgID)
	if err != nil {
		return true // fail closed
	}
	return count <= 1
}

func (s *Server) uniqueSlug(r *http.Request, name string) (string, error) {
	base := strings.Trim(slugInvalidChars.ReplaceAllString(strings.ToLower(name), "-"), "-")
	if base == "" {
		base = "org"
	}
	slug := base
	for n := 2; ; n++ {
		exists, err := s.store.OrganizationSlugExists(r.Context(), slug)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
		slug = base + "-" + uuid.NewString()[:6]
		if n > 20 {
			return slug, nil
		}
	}
}

func orgDetail(org db.Organization, role string, members []db.Membership) map[string]any {
	var memberDTOs []map[string]any
	if members != nil {
		memberDTOs = make([]map[string]any, 0, len(members))
		for _, m := range members {
			memberDTOs = append(memberDTOs, map[string]any{
				"id": m.ID, "username": m.Username, "role": m.Role, "status": m.Status,
			})
		}
	}
	return map[string]any{
		"id":                org.ID,
		"name":              org.Name,
		"slug":              org.Slug,
		"catalogRepoUrl":    textOrNil(org.CatalogRepoUrl),
		"catalogBranch":     org.CatalogBranch,
		"lastCatalogSyncAt": timeOrNil(org.LastCatalogSyncAt),
		"hasCatalogToken":   org.CatalogRepoTokenEncrypted.Valid && org.CatalogRepoTokenEncrypted.String != "",
		"role":              role,
		"members":           memberDTOs,
	}
}
