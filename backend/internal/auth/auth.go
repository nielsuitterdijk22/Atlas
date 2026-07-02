// Package auth verifies Zitadel-issued bearer tokens and resolves the Yaly
// user behind them. Zitadel only answers "who is this person" — which
// organizations they belong to and their role there is Yaly's own
// Organization/Membership model (see internal/server), not a Zitadel concept.
package auth

import (
	"errors"

	"github.com/google/uuid"
)

// Identity is the authenticated Yaly principal returned by Verify.
type Identity struct {
	UserID      uuid.UUID
	Username    string
	Email       string
	DisplayName string
}

// ErrInvalidCredentials is returned for any verification failure (expired,
// malformed, or unrecognized token) so the HTTP layer can return a single,
// non-enumerating 401.
var ErrInvalidCredentials = errors.New("invalid credentials")
