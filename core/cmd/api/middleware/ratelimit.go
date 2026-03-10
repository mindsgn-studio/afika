package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type counter struct {
	count      int
	windowFrom time.Time
}

type Limiter struct {
	mu     sync.Mutex
	perMin int
	data   map[string]counter
}

func NewLimiter(perMinute int) *Limiter {
	if perMinute <= 0 {
		perMinute = 60
	}
	return &Limiter{perMin: perMinute, data: map[string]counter{}}
}

func (l *Limiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r) + "|" + r.URL.Path
		now := time.Now().UTC()
		bucket := now.Truncate(time.Minute)

		l.mu.Lock()
		entry := l.data[key]
		if entry.windowFrom.IsZero() || !entry.windowFrom.Equal(bucket) {
			entry = counter{count: 0, windowFrom: bucket}
		}
		entry.count++
		l.data[key] = entry
		l.mu.Unlock()

		if entry.count > l.perMin {
			retryAfter := int(time.Until(bucket.Add(time.Minute)).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"code":"rate_limited","message":"request limit exceeded","retryable":true}}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) string {
	if r == nil {
		return "unknown"
	}
	xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err != nil {
		if strings.TrimSpace(r.RemoteAddr) == "" {
			return "unknown"
		}
		return strings.TrimSpace(r.RemoteAddr)
	}
	return host
}
