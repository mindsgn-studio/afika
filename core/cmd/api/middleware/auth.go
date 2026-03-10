package middleware

import (
	"net/http"
	"strings"
)

func APIKey(expected string) func(http.Handler) http.Handler {
	expected = strings.TrimSpace(expected)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if expected == "" {
				next.ServeHTTP(w, r)
				return
			}

			provided := strings.TrimSpace(r.Header.Get("X-API-Key"))
			if provided == "" {
				auth := strings.TrimSpace(r.Header.Get("Authorization"))
				if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
					provided = strings.TrimSpace(auth[7:])
				}
			}

			if provided != expected {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":{"code":"unauthorized","message":"invalid api key","retryable":false}}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
