package server

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/nielsuitterdijk22/atlas/internal/auth"
	"github.com/nielsuitterdijk22/atlas/internal/httpx"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
)

// accessContext is the per-request access context: who is calling, which
// organization is active (from the X-Atlas-Org header), and their role within
// it. Mirrors the old .NET AccessContext/UserContext.
type accessContext struct {
	Identity   auth.Identity
	Membership db.Membership
	HasOrg     bool
}

func (a accessContext) OrgID() uuid.UUID         { return a.Membership.OrgID }
func (a accessContext) Role() string             { return a.Membership.Role }
func (a accessContext) IsPlatformEngineer() bool { return a.Membership.Role == "platform-engineer" }

// requireOrg resolves the caller's access context for org-scoped endpoints,
// writing an error response and returning ok=false when the caller is
// unauthenticated, has no valid active organization, or (when
// platformEngineer is true) lacks the platform-engineer role.
func (s *Server) requireOrg(w http.ResponseWriter, r *http.Request, platformEngineer bool) (accessContext, bool) {
	id, ok := identityFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "authentication required")
		return accessContext{}, false
	}

	orgHeader := r.Header.Get("X-Atlas-Org")
	orgID, err := uuid.Parse(orgHeader)
	if err != nil {
		httpx.Error(w, http.StatusForbidden, "No active organization — send a valid X-Atlas-Org header.")
		return accessContext{}, false
	}

	membership, err := s.store.GetActiveMembership(r.Context(), db.GetActiveMembershipParams{
		OrgID:  orgID,
		UserID: toNullUUID(id.UserID),
	})
	if err != nil {
		httpx.Error(w, http.StatusForbidden, "You are not a member of this organization")
		return accessContext{}, false
	}
	if platformEngineer && membership.Role != "platform-engineer" {
		httpx.Error(w, http.StatusForbidden, "Platform engineer role required")
		return accessContext{}, false
	}

	return accessContext{Identity: id, Membership: membership, HasOrg: true}, true
}
