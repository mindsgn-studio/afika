package ethereum

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"
)

type BundlerClient struct {
	url        string
	httpClient *http.Client
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
