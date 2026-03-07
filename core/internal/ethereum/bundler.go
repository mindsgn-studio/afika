package ethereum

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
<<<<<<< HEAD
	"os"
	"strconv"
=======
>>>>>>> 2c300523feab5fb460405ebae84d31bb5c6427a4
	"strings"
	"time"
)

type BundlerClient struct {
<<<<<<< HEAD
	url         string
	httpClient  *http.Client
	maxRetries  int
	baseBackoff time.Duration
=======
	url        string
	httpClient *http.Client
>>>>>>> 2c300523feab5fb460405ebae84d31bb5c6427a4
}

type userOpReceipt struct {
	UserOpHash      string `json:"userOpHash"`
	TransactionHash string `json:"transactionHash"`
	Success         bool   `json:"success"`
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *rpcError       `json:"error"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func NewBundlerClient(url string) *BundlerClient {
	return &BundlerClient{
		url: strings.TrimSpace(url),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
<<<<<<< HEAD
		maxRetries:  envInt("EXPO_PUBLIC_POCKET_BUNDLER_RETRY_MAX_ATTEMPTS", envInt("EXPO_PUBLIC_POCKET_BUNDLER_RETRY_MAX", 2)),
		baseBackoff: time.Duration(envInt("EXPO_PUBLIC_POCKET_BUNDLER_RETRY_BACKOFF_MS", 250)) * time.Millisecond,
=======
>>>>>>> 2c300523feab5fb460405ebae84d31bb5c6427a4
	}
}

func (b *BundlerClient) EstimateUserOperationGas(ctx context.Context, op UserOperation, entryPointAddress string) (UserOperationGasEstimate, error) {
	if b == nil || b.url == "" {
		return UserOperationGasEstimate{}, fmt.Errorf("bundler url is required")
	}

	var result struct {
		PreVerificationGas   string `json:"preVerificationGas"`
		VerificationGasLimit string `json:"verificationGasLimit"`
		CallGasLimit         string `json:"callGasLimit"`
	}

	if err := b.rpcCall(ctx, "eth_estimateUserOperationGas", []any{op.ToBundlerMap(), entryPointAddress}, &result); err != nil {
		return UserOperationGasEstimate{}, err
	}

	preVG, err := parseHexBig(result.PreVerificationGas)
	if err != nil {
		return UserOperationGasEstimate{}, err
	}
	verifG, err := parseHexBig(result.VerificationGasLimit)
	if err != nil {
		return UserOperationGasEstimate{}, err
	}
	callG, err := parseHexBig(result.CallGasLimit)
	if err != nil {
		return UserOperationGasEstimate{}, err
	}

	return UserOperationGasEstimate{
		PreVerificationGas:   preVG,
		VerificationGasLimit: verifG,
		CallGasLimit:         callG,
	}, nil
}

func (b *BundlerClient) SendUserOperation(ctx context.Context, op UserOperation, entryPointAddress string) (string, error) {
	if b == nil || b.url == "" {
		return "", fmt.Errorf("bundler url is required")
	}

	var userOpHash string
	if err := b.rpcCall(ctx, "eth_sendUserOperation", []any{op.ToBundlerMap(), entryPointAddress}, &userOpHash); err != nil {
		return "", err
	}

	return strings.TrimSpace(userOpHash), nil
}

func (b *BundlerClient) GetUserOperationReceipt(ctx context.Context, userOpHash string) (*userOpReceipt, error) {
	if b == nil || b.url == "" {
		return nil, fmt.Errorf("bundler url is required")
	}
	if strings.TrimSpace(userOpHash) == "" {
		return nil, fmt.Errorf("userOpHash is required")
	}

	var receipt *userOpReceipt
	if err := b.rpcCall(ctx, "eth_getUserOperationReceipt", []any{userOpHash}, &receipt); err != nil {
		return nil, err
	}

	return receipt, nil
}

func (b *BundlerClient) rpcCall(ctx context.Context, method string, params []any, out any) error {
	body, err := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params,
	})
	if err != nil {
		return err
	}

<<<<<<< HEAD
	maxAttempts := b.maxRetries + 1
	if maxAttempts < 1 {
		maxAttempts = 1
	}

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, b.url, bytes.NewReader(body))
		if reqErr != nil {
			return reqErr
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := b.httpClient.Do(req)
		if err != nil {
			lastErr = err
		} else {
			payload, readErr := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			if readErr != nil {
				lastErr = readErr
			} else if resp.StatusCode >= 300 {
				lastErr = fmt.Errorf("bundler rpc failed: status=%d body=%s", resp.StatusCode, string(payload))
			} else {
				var rpcResp rpcResponse
				if err := json.Unmarshal(payload, &rpcResp); err != nil {
					lastErr = err
				} else if rpcResp.Error != nil {
					lastErr = fmt.Errorf("bundler rpc error: %s", rpcResp.Error.Message)
				} else {
					if len(rpcResp.Result) == 0 || string(rpcResp.Result) == "null" {
						return nil
					}
					if err := json.Unmarshal(rpcResp.Result, out); err != nil {
						lastErr = err
					} else {
						return nil
					}
				}
			}
		}

		if attempt == maxAttempts || !isRetryableBundlerError(lastErr) {
			break
		}

		backoff := b.baseBackoff * time.Duration(attempt)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
		}
	}

	return lastErr
=======
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, b.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 300 {
		return fmt.Errorf("bundler rpc failed: status=%d body=%s", resp.StatusCode, string(payload))
	}

	var rpcResp rpcResponse
	if err := json.Unmarshal(payload, &rpcResp); err != nil {
		return err
	}
	if rpcResp.Error != nil {
		return fmt.Errorf("bundler rpc error: %s", rpcResp.Error.Message)
	}
	if len(rpcResp.Result) == 0 || string(rpcResp.Result) == "null" {
		return nil
	}

	return json.Unmarshal(rpcResp.Result, out)
>>>>>>> 2c300523feab5fb460405ebae84d31bb5c6427a4
}

func parseHexBig(value string) (*big.Int, error) {
	v := strings.TrimSpace(strings.TrimPrefix(value, "0x"))
	if v == "" {
		return big.NewInt(0), nil
	}

	parsed := new(big.Int)
	if _, ok := parsed.SetString(v, 16); !ok {
		return nil, fmt.Errorf("invalid hex integer: %s", value)
	}
	return parsed, nil
}
<<<<<<< HEAD

func isRetryableBundlerError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(message, "timeout") || strings.Contains(message, "tempor") || strings.Contains(message, "connection reset") {
		return true
	}
	if strings.Contains(message, "status=5") || strings.Contains(message, "service unavailable") || strings.Contains(message, "too many requests") {
		return true
	}
	return false
}

func envInt(name string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}
=======
>>>>>>> 2c300523feab5fb460405ebae84d31bb5c6427a4
