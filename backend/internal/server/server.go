// Package server wires the HTTP router, middleware, and route handlers.
package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/nielsuitterdijk22/atlas/internal/auth"
	"github.com/nielsuitterdijk22/atlas/internal/catalog"
	"github.com/nielsuitterdijk22/atlas/internal/config"
	"github.com/nielsuitterdijk22/atlas/internal/provision"
	"github.com/nielsuitterdijk22/atlas/internal/quill"
	"github.com/nielsuitterdijk22/atlas/internal/secret"
	"github.com/nielsuitterdijk22/atlas/internal/store"
)

// Server is the root HTTP handler for the Atlas backend.
type Server struct {
	cfg         *config.Config
	logger      *slog.Logger
	store       *store.Store
	verifier    *auth.Verifier
	catalog     *catalog.Service
	catalogSync *catalog.SyncService
	provision   *provision.Service
	protector   *secret.Protector
	quill       *quill.Client
	router      chi.Router
}

// New constructs a Server with middleware and routes configured.
func New(cfg *config.Config, logger *slog.Logger, st *store.Store) *Server {
	protector := secret.NewProtector(cfg.SecretKeyPath)
	catalogSvc := catalog.NewService(cfg.CatalogCachePath, logger)
	catalogSync := catalog.NewSyncService(catalogSvc, protector, logger)
	provisionSvc := provision.NewService(st, logger)
	quillClient := quill.NewClient(cfg.Quill.APIBaseURL, cfg.Quill.ForgejoPublicURL)

	s := &Server{
		cfg:         cfg,
		logger:      logger,
		store:       st,
		verifier:    auth.NewVerifier(cfg.Zitadel, st, logger, quillClient),
		catalog:     catalogSvc,
		catalogSync: catalogSync,
		provision:   provisionSvc,
		protector:   protector,
		quill:       quillClient,
		router:      chi.NewRouter(),
	}
	s.setupMiddleware()
	s.setupRoutes()
	return s
}

// StartAuth begins background JWKS refresh. Must be called once the server's
// context is available (i.e. after New).
func (s *Server) StartAuth(ctx context.Context) { s.verifier.Start(ctx) }

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.router.ServeHTTP(w, r) }

func (s *Server) setupMiddleware() {
	s.router.Use(chimw.RequestID)
	s.router.Use(chimw.RealIP)
	s.router.Use(chimw.Logger)
	s.router.Use(chimw.Recoverer)
	s.router.Use(chimw.Timeout(60 * time.Second))
	s.router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{s.cfg.FrontendURL},
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Atlas-Org"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
}

func (s *Server) setupRoutes() {
	s.router.Get("/healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	s.router.Route("/api", func(r chi.Router) {
		// Not under /api/auth — that prefix is reserved for NextAuth's own
		// route handler on the frontend (see next.config.mjs's rewrite comment).
		r.With(s.requireAuth).Get("/me", s.handleMe)

		r.Group(func(r chi.Router) {
			r.Use(s.requireAuth)

			r.Route("/orgs", func(r chi.Router) {
				r.Get("/", s.handleListOrgs)
				r.Post("/", s.handleCreateOrg)
				r.Route("/{id}", func(r chi.Router) {
					r.Get("/", s.handleGetOrg)
					r.Put("/", s.handleUpdateOrg)
					r.Post("/members", s.handleInviteMember)
					r.Put("/members/{membershipID}", s.handleUpdateMember)
					r.Delete("/members/{membershipID}", s.handleRemoveMember)
					r.Post("/catalog/sync", s.handleSyncCatalog)
					r.Post("/catalog/link-quill", s.handleLinkQuillCatalog)
				})
			})

			r.Get("/quill/projects", s.handleListQuillProjects)

			r.Route("/templates", func(r chi.Router) {
				r.Get("/", s.handleListTemplates)
				r.Get("/{name}", s.handleGetTemplate)
				r.Post("/{name}/execute", s.handleExecuteTemplate)
			})

			r.Route("/services", func(r chi.Router) {
				r.Get("/", s.handleListServices)
				r.Get("/{id}", s.handleGetService)
			})

			r.Route("/requests", func(r chi.Router) {
				r.Get("/", s.handleListRequests)
				r.Post("/", s.handleCreateRequest)
				r.Route("/{id}", func(r chi.Router) {
					r.Get("/", s.handleGetRequest)
					r.Post("/approve", s.handleApproveRequest)
					r.Post("/reject", s.handleRejectRequest)
					r.Post("/retry", s.handleRetryRequest)
				})
			})

			r.Route("/admin", func(r chi.Router) {
				r.Get("/executions", s.handleListExecutions)
				r.Get("/executions/{id}", s.handleGetExecution)
				r.Get("/presets", s.handleListPresets)
				r.Post("/presets", s.handleCreatePreset)
				r.Route("/presets/{id}", func(r chi.Router) {
					r.Get("/", s.handleGetPreset)
					r.Put("/", s.handleUpdatePreset)
					r.Delete("/", s.handleDeletePreset)
				})
			})
		})
	})
}
