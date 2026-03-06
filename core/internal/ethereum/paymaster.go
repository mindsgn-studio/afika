package ethereum

import (
	"errors"
	"math/big"
	"os"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

const (
	SendModeAuto      = "auto"
	SendModeSponsored = "sponsored"
	SendModeDirect    = "direct"
)

type PaymasterPolicy struct {
	Enabled              bool
	SupportedTokenSymbol string
	MaxPerOperation      *big.Int
	DailyLimit           *big.Int
}

func ResolveSendMode(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "", SendModeAuto:
		return SendModeAuto
	case SendModeDirect:
		return SendModeDirect
	case SendModeSponsored:
		return SendModeSponsored
	default:
		return SendModeAuto
	}
}

func LoadPaymasterPolicy() PaymasterPolicy {
	maxPerOp := envBigInt("POCKET_PAYMASTER_MAX_PER_OP_UNITS", big.NewInt(100_000_000))
	dailyLimit := envBigInt("POCKET_PAYMASTER_DAILY_LIMIT_UNITS", big.NewInt(500_000_000))
	if dailyLimit.Cmp(maxPerOp) < 0 {
		dailyLimit = new(big.Int).Set(maxPerOp)
	}

	enabled := strings.EqualFold(strings.TrimSpace(os.Getenv("POCKET_PAYMASTER_ENABLED")), "true")
	token := strings.ToUpper(strings.TrimSpace(os.Getenv("POCKET_PAYMASTER_TOKEN")))
	if token == "" {
		token = USDCSymbol
	}

	return PaymasterPolicy{
		Enabled:              enabled,
		SupportedTokenSymbol: token,
		MaxPerOperation:      maxPerOp,
		DailyLimit:           dailyLimit,
	}
}

func BuildPaymasterAndData(paymasterAddress string) ([]byte, error) {
	if !common.IsHexAddress(paymasterAddress) {
		return nil, errors.New("invalid paymaster address")
	}

	return common.HexToAddress(paymasterAddress).Bytes(), nil
}

func ValidateSponsoredTransfer(policy PaymasterPolicy, token TokenConfig, amountUnits *big.Int) error {
	if !policy.Enabled {
		return errors.New("paymaster sponsorship is disabled")
	}
	if !strings.EqualFold(token.Symbol, policy.SupportedTokenSymbol) {
		return errors.New("token is not eligible for sponsorship")
	}
	if amountUnits == nil || amountUnits.Sign() <= 0 {
		return errors.New("invalid amount")
	}
	if amountUnits.Cmp(policy.MaxPerOperation) > 0 {
		return errors.New("amount exceeds sponsorship per-operation cap")
	}

	return nil
}

func envBigInt(name string, fallback *big.Int) *big.Int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return new(big.Int).Set(fallback)
	}

	if strings.HasPrefix(value, "0x") {
		parsed := new(big.Int)
		if _, ok := parsed.SetString(strings.TrimPrefix(value, "0x"), 16); ok {
			return parsed
		}
		return new(big.Int).Set(fallback)
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		return new(big.Int).Set(fallback)
	}

	return big.NewInt(parsed)
}
