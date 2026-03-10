package routes

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/mindsgn-studio/pocket-money-app/core/cmd/api/middleware"
	"github.com/mindsgn-studio/pocket-money-app/core/cmd/api/types"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"
	coreeth "github.com/mindsgn-studio/pocket-money-app/core/internal/ethereum"
)

type API struct{}

func NewAPI() (*API, error) {
	return &API{}, nil
}

func (a *API) Health() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", false)
			return
		}

		writeJSON(w, http.StatusOK, types.HealthResponse{
			OK:        true,
			Service:   "pocket-core-api",
			Version:   "v1",
			Timestamp: time.Now().UTC(),
		})
	}
}

func (a *API) Readiness() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", false)
			return
		}

		started := time.Now()
		var req types.ReadinessRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_request", err.Error(), false)
			return
		}

		network := normalizeNetwork(req.Network)
		ownerAddress := strings.TrimSpace(req.OwnerAddress)
		if network == "" || ownerAddress == "" {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "network and ownerAddress are required", false)
			return
		}

		readiness, err := buildReadiness(r.Context(), network, ownerAddress)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		writeSuccess(w, r, readiness, map[string]int{"total": int(time.Since(started).Milliseconds())})
	}
}

func (a *API) CreateSponsored() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", false)
			return
		}

		started := time.Now()
		var req types.CreateSponsoredRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_request", err.Error(), false)
			return
		}

		network := normalizeNetwork(req.Network)
		ownerAddress := strings.TrimSpace(req.OwnerAddress)
		if network == "" || ownerAddress == "" {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "network and ownerAddress are required", false)
			return
		}
		if !common.IsHexAddress(ownerAddress) {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "invalid ownerAddress", false)
			return
		}

		readiness, err := buildReadiness(r.Context(), network, ownerAddress)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}
		if !readiness.CanUseSponsoredCreate {
			writeError(w, r, http.StatusConflict, "sponsored_creation_unavailable", "sponsored creation is not available", false)
			return
		}

		deployment, err := config.ValidateAAConfig(network, true)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		networkConfig := coreeth.GetNetwork(network)
		if len(networkConfig.RPC) == 0 {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "unsupported network", false)
			return
		}
		chainID := big.NewInt(int64(networkConfig.ChainID))

		client, err := ethclient.DialContext(r.Context(), networkConfig.RPC[0])
		if err != nil {
			writeMappedError(w, r, err)
			return
		}
		defer client.Close()

		factoryAddress := common.HexToAddress(deployment.FactoryAddress)
		entryPointAddress := common.HexToAddress(deployment.EntryPointAddress)
		owner := common.HexToAddress(ownerAddress)
		predicted := common.HexToAddress(readiness.SmartAccountAddress)

		factoryABI, err := coreeth.FactoryMetaData.GetAbi()
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		var initCallData []byte
		if _, ok := factoryABI.Methods["createAccountWithEntryPoint"]; ok {
			initCallData, err = factoryABI.Pack("createAccountWithEntryPoint", owner, entryPointAddress)
		} else {
			initCallData, err = factoryABI.Pack("createAccount", owner)
		}
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		nonce, err := entryPointNonce(r.Context(), client, entryPointAddress, predicted)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		op := coreeth.UserOperation{
			Sender:               predicted,
			Nonce:                nonce,
			InitCode:             append(factoryAddress.Bytes(), initCallData...),
			CallData:             []byte{},
			CallGasLimit:         big.NewInt(500000),
			VerificationGasLimit: big.NewInt(450000),
			PreVerificationGas:   big.NewInt(90000),
			MaxFeePerGas:         big.NewInt(0),
			MaxPriorityFeePerGas: big.NewInt(0),
			PaymasterAndData:     []byte{},
			Signature:            []byte{},
		}

		gasPrice, priorityFee, err := coreeth.ResolveUserOpFeeCaps(r.Context(), client)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}
		op.MaxFeePerGas = gasPrice
		op.MaxPriorityFeePerGas = priorityFee

		paymasterAndData, err := coreeth.BuildSignedPaymasterAndData(deployment.PaymasterAddress, predicted, nonce, chainID, network)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}
		op.PaymasterAndData = paymasterAndData

		bundler := coreeth.NewBundlerClient(deployment.BundlerURL)
		if estimate, estErr := bundler.EstimateUserOperationGas(r.Context(), op, entryPointAddress.Hex()); estErr == nil {
			op.PreVerificationGas = estimate.PreVerificationGas
			op.VerificationGasLimit = estimate.VerificationGasLimit
			op.CallGasLimit = estimate.CallGasLimit
		}

		response := types.CreateSponsoredResponse{
			Network:                 network,
			OwnerAddress:            ownerAddress,
			PredictedAccountAddress: predicted.Hex(),
			EntryPointAddress:       entryPointAddress.Hex(),
			ChainID:                 chainID.String(),
			UserOperation:           toPayload(op),
		}

		writeSuccess(w, r, response, map[string]int{"total": int(time.Since(started).Milliseconds())})
	}
}

func (a *API) SendSponsored() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", false)
			return
		}

		started := time.Now()
		var req types.SendSponsoredRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_request", err.Error(), false)
			return
		}

		network := normalizeNetwork(req.Network)
		if network == "" {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "network is required", false)
			return
		}

		op, err := fromPayload(req.UserOperation)
		if err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_request", err.Error(), false)
			return
		}
		if len(op.Signature) == 0 {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "user operation signature is required", false)
			return
		}
		if len(op.PaymasterAndData) == 0 {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "paymasterAndData is required", false)
			return
		}

		deployment, err := config.ValidateAAConfig(network, true)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		entryPointAddress := strings.TrimSpace(deployment.EntryPointAddress)
		if v := strings.TrimSpace(req.EntryPoint); v != "" {
			if !common.IsHexAddress(v) {
				writeError(w, r, http.StatusBadRequest, "invalid_request", "invalid entryPointAddress", false)
				return
			}
			if strings.ToLower(v) != strings.ToLower(entryPointAddress) {
				writeError(w, r, http.StatusBadRequest, "invalid_request", "entryPointAddress does not match configured deployment", false)
				return
			}
		}

		bundler := coreeth.NewBundlerClient(deployment.BundlerURL)
		userOpHash, err := bundler.SendUserOperation(r.Context(), op, entryPointAddress)
		if err != nil {
			writeMappedError(w, r, err)
			return
		}

		response := types.SendSponsoredResponse{
			Network:           network,
			EntryPointAddress: common.HexToAddress(entryPointAddress).Hex(),
			UserOpHash:        strings.TrimSpace(userOpHash),
			Status:            "submitted",
		}
		writeSuccess(w, r, response, map[string]int{"total": int(time.Since(started).Milliseconds())})
	}
}

func buildReadiness(ctx context.Context, network, ownerAddress string) (coreeth.SmartAccountCreationReadiness, error) {
	result := coreeth.SmartAccountCreationReadiness{
		Network:        network,
		OwnerAddress:   ownerAddress,
		FailureReasons: []string{},
		Warnings:       []string{},
	}

	if !common.IsHexAddress(ownerAddress) {
		result.FailureReasons = append(result.FailureReasons, "owner_wallet_invalid")
		result.IsReady = false
		return result, nil
	}

	networkConfig := coreeth.GetNetwork(network)
	if len(networkConfig.RPC) == 0 {
		result.FailureReasons = append(result.FailureReasons, "network_unsupported")
		result.IsReady = false
		return result, nil
	}

	deployment, err := config.GetDeployment(network)
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "deployment_missing")
		return result, err
	}
	result.FactoryAddress = deployment.FactoryAddress
	if common.IsHexAddress(deployment.EntryPointAddress) {
		result.EntryPointAddress = common.HexToAddress(deployment.EntryPointAddress).Hex()
	}

	if !common.IsHexAddress(deployment.FactoryAddress) {
		result.FailureReasons = append(result.FailureReasons, "factory_address_invalid")
		result.IsReady = false
		return result, nil
	}

	client, err := ethclient.DialContext(ctx, networkConfig.RPC[0])
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "rpc_unreachable")
		result.IsReady = false
		return result, nil
	}
	defer client.Close()

	if _, err := client.ChainID(ctx); err != nil {
		result.FailureReasons = append(result.FailureReasons, "rpc_chainid_unavailable")
		result.IsReady = false
		return result, nil
	}

	factoryAddress := common.HexToAddress(deployment.FactoryAddress)
	factoryCode, err := client.CodeAt(ctx, factoryAddress, nil)
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "factory_check_failed")
		result.IsReady = false
		return result, nil
	}
	if len(factoryCode) == 0 {
		result.FailureReasons = append(result.FailureReasons, "factory_not_deployed")
	}

	factory, err := coreeth.NewFactory(factoryAddress, client)
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "factory_bind_failed")
		result.IsReady = false
		return result, nil
	}

	owner := common.HexToAddress(ownerAddress)
	predicted := common.Address{}
	if result.EntryPointAddress != "" {
		predicted, err = factory.GetAddressWithEntryPoint(&bind.CallOpts{Context: ctx}, owner, common.HexToAddress(result.EntryPointAddress))
		if err != nil {
			result.Warnings = append(result.Warnings, "entrypoint_prediction_failed_fallback_legacy")
			predicted, err = factory.GetAddress(&bind.CallOpts{Context: ctx}, owner)
		}
	} else {
		predicted, err = factory.GetAddress(&bind.CallOpts{Context: ctx}, owner)
	}
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "smart_account_prediction_failed")
		result.IsReady = false
		return result, nil
	}

	result.SmartAccountAddress = predicted.Hex()
	code, err := client.CodeAt(ctx, predicted, nil)
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "smart_account_code_check_failed")
		result.IsReady = false
		return result, nil
	}
	result.SmartAccountExists = len(code) > 0

	minGas := config.GetOwnerCreationMinGasWei(network)
	result.OwnerRequiredMinGasWei = minGas.String()
	ownerBalance, err := client.BalanceAt(ctx, owner, nil)
	if err != nil {
		result.FailureReasons = append(result.FailureReasons, "owner_balance_check_failed")
		result.IsReady = false
		return result, nil
	}
	result.OwnerBalanceWei = ownerBalance.String()
	result.HasSufficientOwnerBalance = ownerBalance.Cmp(minGas) >= 0
	if !result.HasSufficientOwnerBalance {
		result.FailureReasons = append(result.FailureReasons, "owner_insufficient_native_gas")
	}

	if aaDeployment, aaErr := config.ValidateAAConfig(network, true); aaErr == nil {
		policy := coreeth.LoadPaymasterPolicy(network)
		hasSigner := coreeth.HasPaymasterSignerPrivateKey(network)
		if !hasSigner {
			result.Warnings = append(result.Warnings, "paymaster_signer_missing")
		}
		result.CanUseSponsoredCreate = strings.TrimSpace(aaDeployment.BundlerURL) != "" && common.IsHexAddress(aaDeployment.EntryPointAddress) && common.IsHexAddress(aaDeployment.PaymasterAddress) && policy.Enabled && hasSigner
	} else {
		result.Warnings = append(result.Warnings, "sponsored_creation_unavailable")
	}

	result.IsReady = result.SmartAccountExists || result.CanUseSponsoredCreate || result.HasSufficientOwnerBalance
	return result, nil
}

func entryPointNonce(ctx context.Context, client *ethclient.Client, entryPoint common.Address, sender common.Address) (*big.Int, error) {
	entryABI, err := abi.JSON(strings.NewReader(`[{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint192","name":"key","type":"uint192"}],"name":"getNonce","outputs":[{"internalType":"uint256","name":"nonce","type":"uint256"}],"stateMutability":"view","type":"function"}]`))
	if err != nil {
		return nil, err
	}
	data, err := entryABI.Pack("getNonce", sender, big.NewInt(0))
	if err != nil {
		return nil, err
	}
	result, err := client.CallContract(ctx, ethereum.CallMsg{To: &entryPoint, Data: data}, nil)
	if err != nil {
		return nil, err
	}
	out, err := entryABI.Unpack("getNonce", result)
	if err != nil || len(out) != 1 {
		return nil, errors.New("failed to decode entrypoint nonce")
	}
	nonce, ok := out[0].(*big.Int)
	if !ok {
		return nil, errors.New("invalid nonce type")
	}
	return nonce, nil
}

func toPayload(op coreeth.UserOperation) types.UserOperationPayload {
	return types.UserOperationPayload{
		Sender:               op.Sender.Hex(),
		Nonce:                bigToHex(op.Nonce),
		InitCode:             bytesToHex(op.InitCode),
		CallData:             bytesToHex(op.CallData),
		CallGasLimit:         bigToHex(op.CallGasLimit),
		VerificationGasLimit: bigToHex(op.VerificationGasLimit),
		PreVerificationGas:   bigToHex(op.PreVerificationGas),
		MaxFeePerGas:         bigToHex(op.MaxFeePerGas),
		MaxPriorityFeePerGas: bigToHex(op.MaxPriorityFeePerGas),
		PaymasterAndData:     bytesToHex(op.PaymasterAndData),
		Signature:            bytesToHex(op.Signature),
	}
}

func fromPayload(p types.UserOperationPayload) (coreeth.UserOperation, error) {
	if !common.IsHexAddress(strings.TrimSpace(p.Sender)) {
		return coreeth.UserOperation{}, errors.New("invalid userOperation.sender")
	}
	nonce, err := parseHexBig(p.Nonce)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.nonce: %w", err)
	}
	callGas, err := parseHexBig(p.CallGasLimit)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.callGasLimit: %w", err)
	}
	verificationGas, err := parseHexBig(p.VerificationGasLimit)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.verificationGasLimit: %w", err)
	}
	preVerificationGas, err := parseHexBig(p.PreVerificationGas)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.preVerificationGas: %w", err)
	}
	maxFeePerGas, err := parseHexBig(p.MaxFeePerGas)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.maxFeePerGas: %w", err)
	}
	maxPriorityFeePerGas, err := parseHexBig(p.MaxPriorityFeePerGas)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.maxPriorityFeePerGas: %w", err)
	}
	initCode, err := parseHexBytes(p.InitCode)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.initCode: %w", err)
	}
	callData, err := parseHexBytes(p.CallData)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.callData: %w", err)
	}
	paymasterAndData, err := parseHexBytes(p.PaymasterAndData)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.paymasterAndData: %w", err)
	}
	signature, err := parseHexBytes(p.Signature)
	if err != nil {
		return coreeth.UserOperation{}, fmt.Errorf("invalid userOperation.signature: %w", err)
	}

	return coreeth.UserOperation{
		Sender:               common.HexToAddress(strings.TrimSpace(p.Sender)),
		Nonce:                nonce,
		InitCode:             initCode,
		CallData:             callData,
		CallGasLimit:         callGas,
		VerificationGasLimit: verificationGas,
		PreVerificationGas:   preVerificationGas,
		MaxFeePerGas:         maxFeePerGas,
		MaxPriorityFeePerGas: maxPriorityFeePerGas,
		PaymasterAndData:     paymasterAndData,
		Signature:            signature,
	}, nil
}

func parseHexBig(value string) (*big.Int, error) {
	trimmed := strings.TrimPrefix(strings.TrimSpace(value), "0x")
	if trimmed == "" {
		return big.NewInt(0), nil
	}
	parsed := new(big.Int)
	if _, ok := parsed.SetString(trimmed, 16); !ok {
		return nil, errors.New("invalid hex integer")
	}
	return parsed, nil
}

func parseHexBytes(value string) ([]byte, error) {
	trimmed := strings.TrimPrefix(strings.TrimSpace(value), "0x")
	if trimmed == "" {
		return []byte{}, nil
	}
	decoded, err := hex.DecodeString(trimmed)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func bytesToHex(value []byte) string {
	if len(value) == 0 {
		return "0x"
	}
	return "0x" + hex.EncodeToString(value)
}

func bigToHex(value *big.Int) string {
	if value == nil {
		return "0x0"
	}
	return "0x" + value.Text(16)
}

func writeMappedError(w http.ResponseWriter, r *http.Request, err error) {
	msg := strings.TrimSpace(err.Error())
	lower := strings.ToLower(msg)

	switch {
	case strings.Contains(lower, "aa23"):
		writeError(w, r, http.StatusConflict, "aa23_reverted", msg, false)
	case strings.Contains(lower, "insufficient"):
		writeError(w, r, http.StatusConflict, "insufficient_funds", msg, false)
	case strings.Contains(lower, "sponsor") || strings.Contains(lower, "paymaster"):
		writeError(w, r, http.StatusConflict, "sponsorship_unavailable", msg, false)
	case strings.Contains(lower, "bundler") || strings.Contains(lower, "timeout"):
		writeError(w, r, http.StatusBadGateway, "bundler_unavailable", msg, true)
	case strings.Contains(lower, "unsupported network") || strings.Contains(lower, "invalid"):
		writeError(w, r, http.StatusBadRequest, "invalid_request", msg, false)
	default:
		writeError(w, r, http.StatusInternalServerError, "internal_error", msg, false)
	}
}

func decodeJSON(r *http.Request, out any) error {
	if r == nil || r.Body == nil {
		return errors.New("request body is required")
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(out); err != nil {
		return fmt.Errorf("invalid json body: %w", err)
	}
	return nil
}

func normalizeNetwork(network string) string {
	value := strings.TrimSpace(strings.ToLower(network))
	switch value {
	case "", "default":
		return "ethereum-sepolia"
	case "sepolia", "testnet", "ethereum-sepolia":
		return "ethereum-sepolia"
	case "mainnet", "ethereum", "ethereum-mainnet":
		return "ethereum-mainnet"
	default:
		return value
	}
}

func writeSuccess(w http.ResponseWriter, r *http.Request, data any, timings map[string]int) {
	response := types.APISuccessResponse{
		Data:      data,
		RequestID: middleware.GetRequestID(r.Context()),
		TimingsMs: timings,
	}
	writeJSON(w, http.StatusOK, response)
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string, retryable bool) {
	response := types.APIErrorResponse{
		Error: types.ErrorEnvelope{
			Code:      code,
			Message:   message,
			Retryable: retryable,
		},
		RequestID: middleware.GetRequestID(r.Context()),
	}
	writeJSON(w, status, response)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
