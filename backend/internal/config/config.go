// Package config loads Atlas backend configuration from environment variables.
//
// All settings have development-friendly defaults so the server can boot with
// no configuration beyond a database URL. Production deployments must set
// ZITADEL_ISSUER for auth to work at all.
package config

import (
	"os"
	"strings"
	"time"
)

// Config holds all runtime configuration for the backend.
type Config struct {
	Env      string
	HTTPAddr string

	LogLevel  string
	LogFormat string

	ReadTimeout  time.Duration
	WriteTimeout time.Duration

	DatabaseURL string

	Zitadel ZitadelConfig

	// FrontendURL is used for CORS.
	FrontendURL string

	// CatalogCachePath is the local directory catalog repos are cloned into,
	// one subdirectory per org (see internal/catalog).
	CatalogCachePath string

	// SecretKeyPath points at the AES-GCM key file used to encrypt catalog repo
	// tokens (see internal/secret). Generated on first run if absent.
	SecretKeyPath string

	Quill QuillConfig
}

// QuillConfig points at the sibling Quill instance Atlas integrates with
// (shared Zitadel project — see internal/quill).
type QuillConfig struct {
	// APIBaseURL is Quill's backend API (e.g. "https://quill.black-tulip.nl").
	// Empty disables the integration entirely.
	APIBaseURL string
	// ForgejoPublicURL is the externally-reachable Forgejo host Quill wraps,
	// used to build git clone URLs (Quill's repo API doesn't return one).
	ForgejoPublicURL string
}

// ZitadelConfig holds settings for self-hosted Zitadel OIDC authentication.
type ZitadelConfig struct {
	// Issuer is the Zitadel instance base URL (e.g. "https://auth.example.com").
	// It is the JWT issuer; the JWKS lives at <Issuer>/oauth/v2/keys.
	Issuer string
	// ManagementToken is a Zitadel service-account token used for the
	// Management API. Optional — when empty, those calls are skipped.
	ManagementToken string
}

// Load reads configuration from the environment.
func Load() (*Config, error) {
	cfg := &Config{
		Env:          getenv("ATLAS_ENV", "development"),
		HTTPAddr:     getenv("ATLAS_HTTP_ADDR", ":8080"),
		LogLevel:     getenv("ATLAS_LOG_LEVEL", "info"),
		LogFormat:    getenv("ATLAS_LOG_FORMAT", "json"),
		ReadTimeout:  getdur("ATLAS_HTTP_READ_TIMEOUT", 15*time.Second),
		WriteTimeout: getdur("ATLAS_HTTP_WRITE_TIMEOUT", 30*time.Second),
		DatabaseURL:  getenv("ATLAS_DATABASE_URL", "postgres://atlas:atlas_dev@localhost:5432/atlas?sslmode=disable"),
		Zitadel: ZitadelConfig{
			Issuer:          strings.TrimSuffix(getenv("ZITADEL_ISSUER", ""), "/"),
			ManagementToken: getenv("ZITADEL_MANAGEMENT_TOKEN", ""),
		},
		FrontendURL:      getenv("ATLAS_FRONTEND_URL", "http://localhost:3003"),
		CatalogCachePath: getenv("ATLAS_CATALOG_CACHE_PATH", "./catalog-cache"),
		SecretKeyPath:    getenv("ATLAS_SECRET_KEY_PATH", "./data-protection-keys/key"),
		Quill: QuillConfig{
			APIBaseURL:       strings.TrimSuffix(getenv("QUILL_API_BASE_URL", ""), "/"),
			ForgejoPublicURL: strings.TrimSuffix(getenv("QUILL_FORGEJO_PUBLIC_URL", ""), "/"),
		},
	}
	return cfg, nil
}

// IsProduction reports whether the server runs in a production environment.
func (c *Config) IsProduction() bool { return strings.EqualFold(c.Env, "production") }

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getdur(key string, fallback time.Duration) time.Duration {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
