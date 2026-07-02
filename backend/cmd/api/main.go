package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nielsuitterdijk22/atlas/internal/config"
	"github.com/nielsuitterdijk22/atlas/internal/logging"
	"github.com/nielsuitterdijk22/atlas/internal/server"
	"github.com/nielsuitterdijk22/atlas/internal/store"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "fatal:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logger := logging.New(cfg.LogLevel, cfg.LogFormat)

	if err := store.Migrate(cfg.DatabaseURL); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer st.Close()

	srv := server.New(cfg, logger, st)
	srv.StartAuth(ctx)

	httpServer := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      srv,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdownCtx)
	}()

	logger.Info("starting atlas api", "addr", cfg.HTTPAddr, "env", cfg.Env)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("serve: %w", err)
	}
	return nil
}
