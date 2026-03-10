package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	core "github.com/mindsgn-studio/pocket-money-app/core"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"
	coreeth "github.com/mindsgn-studio/pocket-money-app/core/internal/ethereum"
)

type mode string

const (
	modeLocal   mode = "local"
	modeBackend mode = "backend"
)

type backendClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

type readinessRequest struct {
	Network      string `json:"network"`
	OwnerAddress string `json:"ownerAddress"`
}

type userOperationPayload struct {
	Sender               string `json:"sender"`
	Nonce                string `json:"nonce"`
	InitCode             string `json:"initCode"`
	CallData             string `json:"callData"`
	CallGasLimit         string `json:"callGasLimit"`
	VerificationGasLimit string `json:"verificationGasLimit"`
	PreVerificationGas   string `json:"preVerificationGas"`
	MaxFeePerGas         string `json:"maxFeePerGas"`
	MaxPriorityFeePerGas string `json:"maxPriorityFeePerGas"`
	PaymasterAndData     string `json:"paymasterAndData"`
	Signature            string `json:"signature"`
}

type backendSuccess[T any] struct {
	Data      T              `json:"data"`
	RequestID string         `json:"requestId,omitempty"`
	TimingsMs map[string]int `json:"timingsMs,omitempty"`
}

type backendErrorEnvelope struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		Retryable bool   `json:"retryable"`
	} `json:"error"`
	RequestID string `json:"requestId,omitempty"`
}

type backendReadiness struct {
	Network                   string   `json:"network"`
	OwnerAddress              string   `json:"ownerAddress"`
	FactoryAddress            string   `json:"factoryAddress"`
	EntryPointAddress         string   `json:"entryPointAddress"`
	SmartAccountAddress       string   `json:"smartAccountAddress"`
	SmartAccountExists        bool     `json:"smartAccountExists"`
	OwnerBalanceWei           string   `json:"ownerBalanceWei"`
	OwnerRequiredMinGasWei    string   `json:"ownerRequiredMinGasWei"`
	HasSufficientOwnerBalance bool     `json:"hasSufficientOwnerBalance"`
	CanUseSponsoredCreate     bool     `json:"canUseSponsoredCreate"`
	IsReady                   bool     `json:"isReady"`
	FailureReasons            []string `json:"failureReasons"`
	Warnings                  []string `json:"warnings"`
}

type backendCreateSponsoredResponse struct {
	OwnerAddress            string               `json:"ownerAddress"`
	PredictedAccountAddress string               `json:"predictedAccountAddress"`
	EntryPointAddress       string               `json:"entryPointAddress"`
	ChainID                 string               `json:"chainId"`
	UserOperation           userOperationPayload `json:"userOperation"`
	Network                 string               `json:"network"`
}

type backendSendSponsoredRequest struct {
	Network         string               `json:"network"`
	EntryPoint      string               `json:"entryPointAddress"`
	UserOperation   userOperationPayload `json:"userOperation"`
	DeprecatedField string               `json:"entryPoint,omitempty"`
}

type backendSendSponsoredResponse struct {
	Network           string `json:"network"`
	EntryPointAddress string `json:"entryPointAddress"`
	UserOpHash        string `json:"userOpHash"`
	Status            string `json:"status"`
}

func main() {
	var (
		flagMode          = flag.String("mode", string(modeLocal), "Mode: local|backend")
		flagNetwork       = flag.String("network", "ethereum-sepolia", "Network (e.g. ethereum-sepolia)")
		flagDataDir       = flag.String("data-dir", "", "Wallet data directory (default: ./tmp/wallet-test)")
		flagPassword      = flag.String("password", "", "Wallet DB password (required)")
		flagMasterKeyB64  = flag.String("master-key-b64", "", "Base64 master key (optional; generated if empty)")
		flagKDFSaltB64    = flag.String("kdf-salt-b64", "", "Base64 KDF salt (optional; generated if empty)")
		flagOwnerName     = flag.String("owner-name", "Main Wallet", "Owner wallet name")
		flagBackendURL    = flag.String("backend-base-url", "", "Backend base URL (backend mode)")
		flagBackendAPIKey = flag.String("backend-api-key", "", "Backend API key (optional)")
		flagPollAttempts  = flag.Int("poll-attempts", 12, "Poll attempts for readiness")
		flagPollSeconds   = flag.Int("poll-seconds", 2, "Seconds between readiness polls")
	)
	flag.Parse()

	ctx := context.Background()
	selectedMode := mode(strings.ToLower(strings.TrimSpace(*flagMode)))
	network := strings.TrimSpace(*flagNetwork)
	if network == "" {
		fatal(errors.New("network is required"))
	}
	if strings.TrimSpace(*flagPassword) == "" {
		fatal(errors.New("password is required"))
	}
	dataDir := strings.TrimSpace(*flagDataDir)
	if dataDir == "" {
		dataDir = filepath.Join(".", "tmp", "wallet-test")
	}
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		fatal(err)
	}

	masterKeyB64 := strings.TrimSpace(*flagMasterKeyB64)
	kdfSaltB64 := strings.TrimSpace(*flagKDFSaltB64)
	if masterKeyB64 == "" || kdfSaltB64 == "" {
		mk, salt, err := generateKeyMaterialB64()
		if err != nil {
			fatal(err)
		}
		if masterKeyB64 == "" {
			masterKeyB64 = mk
		}
		if kdfSaltB64 == "" {
			kdfSaltB64 = salt
		}
	}

	// Shared: init WalletCore so we have an on-device EOA for signing and ownership.
	w := core.NewWalletCore()
	if err := w.Init(dataDir, *flagPassword, masterKeyB64, kdfSaltB64); err != nil {
		fatal(err)
	}
	defer func() { _ = w.Close() }()

	ownerAddress, err := w.OpenOrCreateWallet(*flagOwnerName)
	if err != nil {
		fatal(err)
	}
	fmt.Printf("ownerAddress=%s\n", strings.TrimSpace(ownerAddress))

	// Fast-fail config checks: deployment and bundler capabilities.
	if err := validateDeploymentAndBundler(ctx, network); err != nil {
		fatal(err)
	}

	switch selectedMode {
	case modeLocal:
		if err := runLocal(ctx, w, network); err != nil {
			fatal(err)
		}
	case modeBackend:
		if strings.TrimSpace(*flagBackendURL) == "" {
			fatal(errors.New("backend-base-url is required for backend mode"))
		}
		c := newBackendClient(*flagBackendURL, *flagBackendAPIKey)
		if err := runBackend(ctx, w, c, network, strings.TrimSpace(ownerAddress), *flagPollAttempts, time.Duration(*flagPollSeconds)*time.Second); err != nil {
			fatal(err)
		}
	default:
		fatal(fmt.Errorf("invalid mode: %s", selectedMode))
	}
}

func runLocal(ctx context.Context, w *core.WalletCore, network string) error {
	readinessJSON, err := w.GetSmartAccountCreationReadiness(network)
	if err != nil {
		return err
	}
	fmt.Printf("creationReadiness=%s\n", readinessJSON)

	createdJSON, err := w.CreateSmartContractAccount(network)
	if err != nil {
		return err
	}
	fmt.Printf("createSmartContractAccount=%s\n", createdJSON)

	gotJSON, err := w.GetSmartContractAccount(network)
	if err != nil {
		return err
	}
	fmt.Printf("getSmartContractAccount=%s\n", gotJSON)

	// Best-effort on-chain existence verification.
	accountAddr := extractJSONField(createdJSON, "accountAddress")
	if accountAddr == "" {
		accountAddr = extractJSONField(gotJSON, "accountAddress")
	}
	if accountAddr != "" {
		if ok, err := checkHasCode(ctx, network, accountAddr); err == nil {
			fmt.Printf("onchainHasCode=%t accountAddress=%s\n", ok, accountAddr)
		}
	}

	return nil
}

func runBackend(ctx context.Context, w *core.WalletCore, c *backendClient, network, ownerAddress string, pollAttempts int, pollEvery time.Duration) error {
	readiness, err := c.readiness(ctx, network, ownerAddress)
	if err != nil {
		return err
	}
	printJSON("backendReadiness", readiness)

	if !readiness.CanUseSponsoredCreate {
		return fmt.Errorf("backend reports sponsored creation unavailable: canUseSponsoredCreate=false warnings=%v reasons=%v", readiness.Warnings, readiness.FailureReasons)
	}

	prepared, err := c.createSponsored(ctx, network, ownerAddress)
	if err != nil {
		return err
	}
	printJSON("backendCreateSponsored", prepared)

	if strings.TrimSpace(prepared.EntryPointAddress) == "" {
		return errors.New("backend response missing entryPointAddress")
	}
	rawPreparedOp, err := json.Marshal(prepared.UserOperation)
	if err != nil {
		return err
	}

	signedRaw, err := w.SignUserOperationPayload(network, prepared.EntryPointAddress, string(rawPreparedOp))
	if err != nil {
		return err
	}
	fmt.Printf("signedUserOp=%s\n", signedRaw)

	var signed struct {
		UserOperation userOperationPayload `json:"userOperation"`
		UserOpHash    string               `json:"userOpHash"`
	}
	if err := json.Unmarshal([]byte(signedRaw), &signed); err != nil {
		return err
	}
	if strings.TrimSpace(signed.UserOperation.Signature) == "" {
		return errors.New("signing produced empty signature")
	}

	submitted, err := c.sendSponsored(ctx, backendSendSponsoredRequest{
		Network:       network,
		EntryPoint:    prepared.EntryPointAddress,
		UserOperation: signed.UserOperation,
	})
	if err != nil {
		return err
	}
	printJSON("backendSendSponsored", submitted)

	for attempt := 1; attempt <= pollAttempts; attempt++ {
		time.Sleep(pollEvery)
		poll, err := c.readiness(ctx, network, ownerAddress)
		if err != nil {
			return err
		}
		if poll.SmartAccountExists && strings.TrimSpace(poll.SmartAccountAddress) != "" {
			printJSON("backendReadinessFinal", poll)
			if ok, err := checkHasCode(ctx, network, poll.SmartAccountAddress); err == nil {
				fmt.Printf("onchainHasCode=%t accountAddress=%s\n", ok, poll.SmartAccountAddress)
			}
			return nil
		}
		fmt.Printf("poll=%d/%d smartAccountExists=%t smartAccountAddress=%s\n", attempt, pollAttempts, poll.SmartAccountExists, strings.TrimSpace(poll.SmartAccountAddress))
	}

	return fmt.Errorf("timed out waiting for smart account deployment after %d attempts", pollAttempts)
}

func validateDeploymentAndBundler(ctx context.Context, network string) error {
	deployment, err := config.ValidateAAConfig(network, true)
	if err != nil {
		return err
	}
	if strings.TrimSpace(deployment.BundlerURL) == "" {
		return errors.New("missing bundler url for network")
	}

	// Fail fast if the endpoint is a normal RPC node that doesn't implement bundler methods.
	if err := bundlerMethodSmoke(ctx, deployment.BundlerURL); err != nil {
		return fmt.Errorf("bundler endpoint check failed for %s: %w", deployment.BundlerURL, err)
	}
	return nil
}

func bundlerMethodSmoke(ctx context.Context, url string) error {
	// Call eth_sendUserOperation with empty params; we only care that the method exists.
	// If the endpoint is a normal RPC, it will reply with "Unsupported method" or "method not found".
	body, _ := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "eth_sendUserOperation",
		"params":  []any{},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimSpace(url), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("status=%d body=%s", resp.StatusCode, string(payload))
	}

	var rpcResp struct {
		Error *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(payload, &rpcResp)
	if rpcResp.Error == nil {
		return nil
	}
	msg := strings.ToLower(strings.TrimSpace(rpcResp.Error.Message))
	if strings.Contains(msg, "unsupported method") || strings.Contains(msg, "method not found") {
		return fmt.Errorf("method unsupported: %s", rpcResp.Error.Message)
	}
	return nil
}

func newBackendClient(baseURL, apiKey string) *backendClient {
	return &backendClient{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		apiKey:  strings.TrimSpace(apiKey),
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *backendClient) readiness(ctx context.Context, network, owner string) (backendReadiness, error) {
	var out backendReadiness
	err := c.post(ctx, "/v1/aa/readiness", readinessRequest{Network: network, OwnerAddress: owner}, &out)
	return out, err
}

func (c *backendClient) createSponsored(ctx context.Context, network, owner string) (backendCreateSponsoredResponse, error) {
	var out backendCreateSponsoredResponse
	err := c.post(ctx, "/v1/aa/create-sponsored", readinessRequest{Network: network, OwnerAddress: owner}, &out)
	return out, err
}

func (c *backendClient) sendSponsored(ctx context.Context, req backendSendSponsoredRequest) (backendSendSponsoredResponse, error) {
	var out backendSendSponsoredResponse
	err := c.post(ctx, "/v1/aa/send-sponsored", req, &out)
	return out, err
}

func (c *backendClient) post(ctx context.Context, path string, body any, out any) error {
	if c == nil || c.baseURL == "" {
		return errors.New("backend base url is required")
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 300 {
		var env backendErrorEnvelope
		if jsonErr := json.Unmarshal(payload, &env); jsonErr == nil && strings.TrimSpace(env.Error.Message) != "" {
			return fmt.Errorf("backend error: %s", env.Error.Message)
		}
		return fmt.Errorf("backend failed: status=%d body=%s", resp.StatusCode, string(payload))
	}

	var ok backendSuccess[json.RawMessage]
	if err := json.Unmarshal(payload, &ok); err != nil {
		return err
	}
	return json.Unmarshal(ok.Data, out)
}

func generateKeyMaterialB64() (masterKeyB64 string, kdfSaltB64 string, err error) {
	mk := make([]byte, 32)
	salt := make([]byte, 32)
	if _, err := rand.Read(mk); err != nil {
		return "", "", err
	}
	if _, err := rand.Read(salt); err != nil {
		return "", "", err
	}
	return base64.StdEncoding.EncodeToString(mk), base64.StdEncoding.EncodeToString(salt), nil
}

func checkHasCode(ctx context.Context, network string, address string) (bool, error) {
	networkCfg := coreeth.GetNetwork(network)
	if len(networkCfg.RPC) == 0 {
		return false, fmt.Errorf("unsupported network: %s", network)
	}
	if strings.TrimSpace(address) == "" {
		return false, errors.New("address is required")
	}
	if !common.IsHexAddress(strings.TrimSpace(address)) {
		return false, errors.New("invalid address")
	}
	client, err := ethclient.DialContext(ctx, networkCfg.RPC[0])
	if err != nil {
		return false, err
	}
	defer client.Close()
	code, err := client.CodeAt(ctx, common.HexToAddress(strings.TrimSpace(address)), nil)
	if err != nil {
		return false, err
	}
	return len(code) > 0, nil
}

func extractJSONField(payload string, field string) string {
	var m map[string]any
	if err := json.Unmarshal([]byte(payload), &m); err != nil {
		return ""
	}
	v, ok := m[field]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

func printJSON(label string, v any) {
	raw, err := json.Marshal(v)
	if err != nil {
		fmt.Printf("%s=<marshal_error>\n", label)
		return
	}
	fmt.Printf("%s=%s\n", label, string(raw))
}

func fatal(err error) {
	if err == nil {
		os.Exit(0)
	}
	fmt.Fprintf(os.Stderr, "error: %s\n", err.Error())
	os.Exit(1)
}

