package ethereum

import (
	"context"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

const defaultMinPriorityFeeWei = "100000000" // 0.1 gwei

// ResolveUserOpFeeCaps computes fee caps for UserOperations and enforces a
// minimum priority fee floor accepted by stricter bundlers.
func ResolveUserOpFeeCaps(ctx context.Context, client *ethclient.Client) (*big.Int, *big.Int, error) {
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return nil, nil, err
	}

	priorityFee := new(big.Int).Div(gasPrice, big.NewInt(4))
	if priorityFee.Sign() == 0 {
		priorityFee = big.NewInt(1)
	}

	if suggestedTip, tipErr := client.SuggestGasTipCap(ctx); tipErr == nil && suggestedTip != nil && suggestedTip.Sign() > 0 {
		if suggestedTip.Cmp(priorityFee) > 0 {
			priorityFee = new(big.Int).Set(suggestedTip)
		}
	}

	minPriorityFee := minPriorityFeeWei()
	if priorityFee.Cmp(minPriorityFee) < 0 {
		priorityFee = new(big.Int).Set(minPriorityFee)
	}

	if gasPrice.Cmp(priorityFee) < 0 {
		gasPrice = new(big.Int).Set(priorityFee)
	}

	if header, hdrErr := client.HeaderByNumber(ctx, nil); hdrErr == nil {
		baseFeeCandidate := maxFeeFromBaseFee(header, priorityFee)
		if baseFeeCandidate.Cmp(gasPrice) > 0 {
			gasPrice = baseFeeCandidate
		}
	}

	if minMaxFee := minMaxFeeWei(); minMaxFee.Sign() > 0 && gasPrice.Cmp(minMaxFee) < 0 {
		gasPrice = new(big.Int).Set(minMaxFee)
	}

	return gasPrice, priorityFee, nil
}

func minPriorityFeeWei() *big.Int {
	value := strings.TrimSpace(os.Getenv("POCKET_MIN_PRIORITY_FEE_WEI"))
	if value == "" {
		value = defaultMinPriorityFeeWei
	}

	if strings.HasPrefix(strings.ToLower(value), "0x") {
		parsed := new(big.Int)
		if _, ok := parsed.SetString(strings.TrimPrefix(strings.ToLower(value), "0x"), 16); ok && parsed.Sign() > 0 {
			return parsed
		}
		fallback, _ := new(big.Int).SetString(defaultMinPriorityFeeWei, 10)
		return fallback
	}

	parsed := new(big.Int)
	if _, ok := parsed.SetString(value, 10); ok && parsed.Sign() > 0 {
		return parsed
	}

	fallback, _ := new(big.Int).SetString(defaultMinPriorityFeeWei, 10)
	return fallback
}

func minMaxFeeWei() *big.Int {
	value := strings.TrimSpace(os.Getenv("POCKET_MIN_MAX_FEE_WEI"))
	if value == "" {
		return big.NewInt(0)
	}

	if strings.HasPrefix(strings.ToLower(value), "0x") {
		parsed := new(big.Int)
		if _, ok := parsed.SetString(strings.TrimPrefix(strings.ToLower(value), "0x"), 16); ok && parsed.Sign() > 0 {
			return parsed
		}
		return big.NewInt(0)
	}

	parsed := new(big.Int)
	if _, ok := parsed.SetString(value, 10); ok && parsed.Sign() > 0 {
		return parsed
	}

	return big.NewInt(0)
}

func maxFeeFromBaseFee(header *types.Header, priorityFee *big.Int) *big.Int {
	if header == nil || header.BaseFee == nil || priorityFee == nil {
		return big.NewInt(0)
	}

	// EIP-1559 common strategy: maxFee = 2 * baseFee + priorityFee.
	maxFee := new(big.Int).Mul(header.BaseFee, big.NewInt(2))
	maxFee.Add(maxFee, priorityFee)
	return maxFee
}
