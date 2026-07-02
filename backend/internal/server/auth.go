package server

import (
	"net/http"

	"github.com/nielsuitterdijk22/yaly/internal/httpx"
)

type userDTO struct {
	ID          string  `json:"id"`
	Username    string  `json:"username"`
	DisplayName string  `json:"displayName"`
	Email       *string `json:"email"`
}

type membershipDTO struct {
	OrgID   string `json:"orgId"`
	OrgName string `json:"orgName"`
	OrgSlug string `json:"orgSlug"`
	Role    string `json:"role"`
}

// handleMe returns the signed-in user and the organizations they belong to.
// requireAuth has already verified the token and (via the Zitadel verifier)
// upserted the Yaly user record, so this only needs to load memberships.
func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
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

	memberships := make([]membershipDTO, 0, len(rows))
	for _, row := range rows {
		memberships = append(memberships, membershipDTO{
			OrgID:   row.ID.String(),
			OrgName: row.Name,
			OrgSlug: row.Slug,
			Role:    row.Role,
		})
	}

	var email *string
	if id.Email != "" {
		email = &id.Email
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"user": userDTO{
			ID:          id.UserID.String(),
			Username:    id.Username,
			DisplayName: id.DisplayName,
			Email:       email,
		},
		"memberships": memberships,
	})
}
