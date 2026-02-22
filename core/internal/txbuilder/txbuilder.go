// internal/txbuilder/txbuilder.go
package txbuilder

import (
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// ERC-20 transfer ABI fragment
const erc20ABI = `[{
    "name":"transfer",
    "type":"function",
    "inputs":[
        {"name":"_to","type":"address"},
        {"name":"_value","type":"uint256"}
    ],
    "outputs":[{"name":"","type":"bool"}]
}]`

// TxBuilder constructs unsigned EVM transactions for USDC transfers.
type TxBuilder struct {
	contractABI abi.ABI
	usdcAddress common.Address
	chainID     *big.Int
}

// New creates a TxBuilder for the given USDC contract address and chain ID.
func New(usdcAddress string, chainID int64) (*TxBuilder, error) {
	parsed, err := abi.JSON(strings.NewReader(erc20ABI))
	if err != nil {
		return nil, err
	}
	return &TxBuilder{
		contractABI: parsed,
		usdcAddress: common.HexToAddress(usdcAddress),
		chainID:     big.NewInt(chainID),
	}, nil
}

// BuildTransfer constructs an unsigned EIP-1559 transaction that calls
// USDC.transfer(to, amountMicro). amountMicro is in USDC micro-units (6 decimals).
func (b *TxBuilder) BuildTransfer(
	to string,
	amountMicro *big.Int,
	nonce uint64,
	gasLimit uint64,
	maxFeePerGas *big.Int,
	maxPriorityFeePerGas *big.Int,
) (*types.Transaction, error) {
	toAddr := common.HexToAddress(to)

	// ABI-encode the transfer calldata
	data, err := b.contractABI.Pack("transfer", toAddr, amountMicro)
	if err != nil {
		return nil, err
	}

	tx := types.NewTx(&types.DynamicFeeTx{
		ChainID:   b.chainID,
		Nonce:     nonce,
		GasTipCap: maxPriorityFeePerGas,
		GasFeeCap: maxFeePerGas,
		Gas:       gasLimit,
		To:        &b.usdcAddress,
		Value:     big.NewInt(0), // ERC-20 transfer — no ETH value
		Data:      data,
	})
	return tx, nil
}
