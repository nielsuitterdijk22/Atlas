package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jws"
	"github.com/lestrrat-go/jwx/v3/jwt"

	"github.com/nielsuitterdijk22/atlas/internal/config"
	"github.com/nielsuitterdijk22/atlas/internal/quill"
	"github.com/nielsuitterdijk22/atlas/internal/store"
	"github.com/nielsuitterdijk22/atlas/internal/store/db"
)

// Verifier verifies Zitadel-issued RS256 access-token JWTs against the
// instance JWKS and provisions Atlas users on first login. Ported from Quill's
// internal/auth/zitadel.go, dropped the tenant-resolution and Forgejo
// provisioning bits — Atlas's org membership isn't derived from Zitadel org
// claims, and there's no Forgejo mirror here.
//
// Requires the Zitadel application's Access Token Type to be set to "JWT"
// (not the default "Bearer token"/opaque) — see Application > Token Settings
// in the Zitadel console. Without that, access tokens are opaque reference
// strings with nothing to verify a signature against, and every request
// would need a network round-trip to Zitadel just to check validity.
type Verifier struct {
	store    *store.Store
	logger   *slog.Logger
	issuer   string
	jwksURL  string
	userinfo string
	quill    *quill.Client
	mu       sync.RWMutex
	keySet   jwk.Set
}

// NewVerifier builds a verifier from configuration. Call Start to fetch the
// initial JWKS and begin background refresh. quillClient is used to mirror
// the caller's Quill user id on first login (best-effort, see
// mirrorQuillUser) — pass one with an empty base URL to disable it.
func NewVerifier(cfg config.ZitadelConfig, st *store.Store, logger *slog.Logger, quillClient *quill.Client) *Verifier {
	issuer := strings.TrimSuffix(cfg.Issuer, "/")
	return &Verifier{
		store:    st,
		logger:   logger,
		issuer:   issuer,
		jwksURL:  issuer + "/oauth/v2/keys",
		userinfo: issuer + "/oidc/v1/userinfo",
		quill:    quillClient,
	}
}

// Enabled reports whether Zitadel authentication is configured.
func (v *Verifier) Enabled() bool { return v.issuer != "" }

// Start fetches the initial JWKS synchronously and refreshes it every 15 minutes.
func (v *Verifier) Start(ctx context.Context) {
	if !v.Enabled() {
		return
	}
	if err := v.refresh(ctx); err != nil {
		v.logger.Warn("initial Zitadel JWKS fetch failed — auth will fail until retry", "error", err)
	}
	go func() {
		t := time.NewTicker(15 * time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if err := v.refresh(context.WithoutCancel(ctx)); err != nil {
					v.logger.Warn("Zitadel JWKS refresh failed", "error", err)
				}
			}
		}
	}()
}

func (v *Verifier) refresh(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	set, err := jwk.Fetch(ctx, v.jwksURL)
	if err != nil {
		return fmt.Errorf("jwks fetch %s: %w", v.jwksURL, err)
	}
	v.mu.Lock()
	v.keySet = set
	v.mu.Unlock()
	return nil
}

// Verify validates a Zitadel access-token JWT and returns the resolved Atlas identity.
func (v *Verifier) Verify(ctx context.Context, token string) (Identity, error) {
	v.mu.RLock()
	ks := v.keySet
	v.mu.RUnlock()
	if ks == nil {
		if err := v.refresh(ctx); err != nil {
			v.logger.Warn("zitadel jwks unavailable", "error", err)
			return Identity{}, ErrInvalidCredentials
		}
		v.mu.RLock()
		ks = v.keySet
		v.mu.RUnlock()
	}

	tok, err := jwt.Parse(
		[]byte(token),
		jwt.WithKeySet(ks, jws.WithInferAlgorithmFromKey(true)),
		jwt.WithIssuer(v.issuer),
		jwt.WithValidate(true),
		jwt.WithAcceptableSkew(30*time.Second),
	)
	if err != nil {
		v.logger.Warn("zitadel token signature/claims verification failed", "error", err)
		return Identity{}, ErrInvalidCredentials
	}

	sub, ok := tok.Subject()
	if !ok || sub == "" {
		return Identity{}, ErrInvalidCredentials
	}

	return v.resolveIdentity(ctx, token, sub)
}

// resolveIdentity looks up or provisions the Atlas user for a Zitadel subject.
// rawToken is the bearer used to read the OIDC userinfo profile.
func (v *Verifier) resolveIdentity(ctx context.Context, rawToken, subject string) (Identity, error) {
	profile, err := v.fetchUserInfo(ctx, rawToken)
	if err != nil {
		v.logger.Error("zitadel userinfo fetch failed", "subject", subject, "error", err)
		return Identity{}, ErrInvalidCredentials
	}

	username := deriveUsername(profile)
	displayName := strings.TrimSpace(profile.Name)
	if displayName == "" {
		displayName = username
	}

	user, err := v.store.GetUserByZitadelSubject(ctx, subject)
	if err == nil {
		// Existing user — refresh profile fields in case they changed upstream.
		user, err = v.store.TouchUserLogin(ctx, db.TouchUserLoginParams{
			ID:          user.ID,
			Username:    username,
			DisplayName: displayName,
			Email:       pgtype.Text{String: profile.Email, Valid: profile.Email != ""},
		})
		if err != nil {
			return Identity{}, err
		}
		v.mirrorQuillUser(ctx, user, rawToken)
		return Identity{UserID: user.ID, Username: user.Username, Email: profile.Email, DisplayName: user.DisplayName}, nil
	}

	// First login — create the user and activate any pending invites addressed
	// to this username (mirrors the old GitHubLoginHandler.OnCreatingTicket).
	user, err = v.store.CreateUser(ctx, db.CreateUserParams{
		ZitadelSubject: subject,
		Username:       username,
		DisplayName:    displayName,
		Email:          pgtype.Text{String: profile.Email, Valid: profile.Email != ""},
	})
	if err != nil {
		v.logger.Error("user provisioning failed", "subject", subject, "error", err)
		return Identity{}, ErrInvalidCredentials
	}

	pending, err := v.store.ListPendingMembershipsByUsername(ctx, username)
	if err == nil {
		for _, m := range pending {
			_ = v.store.ActivateMembership(ctx, db.ActivateMembershipParams{
				ID:     m.ID,
				UserID: uuid.NullUUID{UUID: user.ID, Valid: true},
			})
		}
	}

	v.mirrorQuillUser(ctx, user, rawToken)
	return Identity{UserID: user.ID, Username: user.Username, Email: profile.Email, DisplayName: user.DisplayName}, nil
}

// mirrorQuillUser best-effort records the caller's Quill user id on their
// Atlas user row (Tempo's quill_user_id pattern — see
// ~/Documents/Repos/Tempo/quill_integration.md). Quill and Atlas share one
// Zitadel project, so rawToken is already valid against Quill's API. This
// must never fail or slow down login: Quill being unreachable is not Atlas's
// problem, so errors are logged and swallowed, and it only runs when the
// column isn't already set (SetQuillUserID is a no-op update otherwise).
func (v *Verifier) mirrorQuillUser(ctx context.Context, user db.User, rawToken string) {
	if v.quill == nil || !v.quill.Enabled() || user.QuillUserID.Valid {
		return
	}
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		me, err := v.quill.Me(bgCtx, rawToken)
		if err != nil {
			v.logger.Warn("quill user mirror skipped", "userId", user.ID, "error", err)
			return
		}
		if err := v.store.SetQuillUserID(bgCtx, db.SetQuillUserIDParams{
			ID:          user.ID,
			QuillUserID: pgtype.Text{String: me.ID, Valid: me.ID != ""},
		}); err != nil {
			v.logger.Warn("quill user mirror failed to persist", "userId", user.ID, "error", err)
		}
	}()
}

// userInfo holds the OIDC userinfo fields Atlas needs.
type userInfo struct {
	Sub               string `json:"sub"`
	Email             string `json:"email"`
	PreferredUsername string `json:"preferred_username"`
	Name              string `json:"name"`
	GivenName         string `json:"given_name"`
	FamilyName        string `json:"family_name"`
}

func (v *Verifier) fetchUserInfo(ctx context.Context, rawToken string) (userInfo, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.userinfo, nil)
	if err != nil {
		return userInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+rawToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return userInfo{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return userInfo{}, fmt.Errorf("zitadel userinfo returned %d", resp.StatusCode)
	}
	var info userInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return userInfo{}, err
	}
	return info, nil
}

// deriveUsername picks a stable handle: preferred_username's local part (it's
// often "user@domain" under Zitadel), falling back to the email local part,
// falling back to the subject itself so a username is never empty.
func deriveUsername(info userInfo) string {
	seed := info.PreferredUsername
	if seed == "" {
		seed = info.Email
	}
	if seed == "" {
		seed = info.Sub
	}
	if i := strings.IndexByte(seed, '@'); i > 0 {
		seed = seed[:i]
	}
	return seed
}
