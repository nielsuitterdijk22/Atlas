// Package secret encrypts/decrypts small secrets (catalog repo tokens).
//
// ASP.NET Data Protection's on-disk key ring has no Go equivalent; Protector
// generates a random 32-byte key into a file on first run (mirroring the
// original "data-protection-keys" folder's role) and uses it directly for
// AES-GCM. This is functionally equivalent (symmetric, rotatable by replacing
// the file) but not byte-compatible with tokens encrypted by the old .NET
// backend — those need to be re-entered once after cutover.
package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
)

type Protector struct {
	key []byte
}

// NewProtector loads the AES-256 key from keyPath, generating and persisting
// a new random one if the file doesn't exist yet.
func NewProtector(keyPath string) *Protector {
	key, err := loadOrCreateKey(keyPath)
	if err != nil {
		// A missing/unwritable key file shouldn't crash the whole server —
		// catalog token encryption is a secondary feature (public repos need no
		// token at all). Fall back to an ephemeral in-memory key; existing
		// encrypted tokens just won't decrypt until the file is fixed.
		key = make([]byte, 32)
		_, _ = rand.Read(key)
	}
	return &Protector{key: key}
}

func loadOrCreateKey(path string) ([]byte, error) {
	if raw, err := os.ReadFile(path); err == nil {
		key, err := base64.StdEncoding.DecodeString(string(raw))
		if err == nil && len(key) == 32 {
			return key, nil
		}
	}
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, []byte(base64.StdEncoding.EncodeToString(key)), 0o600); err != nil {
		return nil, err
	}
	return key, nil
}

// Protect encrypts plaintext, returning a base64-encoded nonce+ciphertext.
func (p *Protector) Protect(plaintext string) (string, error) {
	block, err := aes.NewCipher(p.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Unprotect decrypts a value produced by Protect.
func (p *Protector) Unprotect(cipherB64 string) (string, error) {
	if cipherB64 == "" {
		return "", nil
	}
	data, err := base64.StdEncoding.DecodeString(cipherB64)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(p.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(data) < gcm.NonceSize() {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce, ct := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}
