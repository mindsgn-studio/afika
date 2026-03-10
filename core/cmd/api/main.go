package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/mindsgn-studio/pocket-money-app/core/cmd/api/middleware"
	"github.com/mindsgn-studio/pocket-money-app/core/cmd/api/routes"
)

func main() {
	addr := envOrDefault("POCKET_API_ADDR", ":8080")
	apiKey := strings.TrimSpace(os.Getenv("POCKET_API_KEY"))
	rateLimit := envInt("POCKET_API_RATE_LIMIT_RPM", 120)

	api, err := routes.NewAPI()
	if err != nil {
		log.Fatalf("failed to initialize API routes: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("/health", api.Health())
	mux.Handle("/v1/aa/readiness", api.Readiness())
	mux.Handle("/v1/aa/create-sponsored", api.CreateSponsored())
	mux.Handle("/v1/aa/send-sponsored", api.SendSponsored())

	limiter := middleware.NewLimiter(rateLimit)
	wrapped := middleware.RequestID(middleware.Logging(limiter.Middleware(middleware.APIKey(apiKey)(mux))))

	server := &http.Server{
		Addr:              addr,
		Handler:           wrapped,
		ReadHeaderTimeout: 10 * time.Second,
	}

	if apiKey == "" {
		log.Printf("warning: POCKET_API_KEY is empty; auth is disabled")
	}

	log.Printf("pocket API listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server failed: %v", err)
	}
}

func envInt(name string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}

func envOrDefault(name, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	return value
}
