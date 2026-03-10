package middleware

import (
	"context"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"
)

type requestIDKey string

const RequestIDContextKey requestIDKey = "request_id"

var requestCounter uint64

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := fmt.Sprintf("req-%d-%d", time.Now().UnixMilli(), atomic.AddUint64(&requestCounter, 1))
		w.Header().Set("X-Request-ID", id)
		ctx := context.WithValue(r.Context(), RequestIDContextKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetRequestID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	id, _ := ctx.Value(RequestIDContextKey).(string)
	return id
}
