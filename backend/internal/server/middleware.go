package server

import (
	"context"
	"net/http"
	"strings"

	"github.com/nielsuitterdijk22/atlas/internal/auth"
	"github.com/nielsuitterdijk22/atlas/internal/httpx"
)

type ctxKey int

const (
	identityKey ctxKey = iota
	rawTokenKey
)

// requireAuth verifies the bearer token and attaches the resulting Identity
// (and the raw token itself, needed to call Quill on the user's behalf — see
// internal/quill) to the request context. Responds 401 when the token is
// missing or invalid.
func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		if token == "" {
			httpx.Error(w, http.StatusUnauthorized, "authentication required")
			return
		}
		id, err := s.verifier.Verify(r.Context(), token)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		ctx := context.WithValue(r.Context(), identityKey, id)
		ctx = context.WithValue(ctx, rawTokenKey, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func identityFrom(ctx context.Context) (auth.Identity, bool) {
	id, ok := ctx.Value(identityKey).(auth.Identity)
	return id, ok
}

// tokenFrom returns the raw Zitadel bearer token verified by requireAuth —
// the same token is forwarded to Quill's API (shared Zitadel project).
func tokenFrom(ctx context.Context) (string, bool) {
	t, ok := ctx.Value(rawTokenKey).(string)
	return t, ok
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(h) > len(prefix) && strings.EqualFold(h[:len(prefix)], prefix) {
		return strings.TrimSpace(h[len(prefix):])
	}
	return ""
}
