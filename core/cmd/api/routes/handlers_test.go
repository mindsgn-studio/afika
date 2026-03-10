package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mindsgn-studio/pocket-money-app/core/cmd/api/types"
)

func TestWriteMappedErrorAA23Contract(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1/aa/send-sponsored", nil)
	rec := httptest.NewRecorder()

	sourceErr := errors.New("AA23 reverted")
	writeMappedError(rec, req, sourceErr)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected status %d, got %d", http.StatusConflict, rec.Code)
	}

	var payload types.APIErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if payload.Error.Code != "aa23_reverted" {
		t.Fatalf("expected error code aa23_reverted, got %s", payload.Error.Code)
	}
	if payload.Error.Message != sourceErr.Error() {
		t.Fatalf("expected error message %q, got %q", sourceErr.Error(), payload.Error.Message)
	}
	if payload.Error.Retryable {
		t.Fatalf("expected retryable=false, got true")
	}
}
