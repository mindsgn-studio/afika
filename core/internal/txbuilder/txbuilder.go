package txbuilder

import (
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// erc20ABI is the minimal ABI fragment for ERC-20 transfer(address,uint256).
const erc20ABI = `[{
    "name":"transfer",
    "type":"function",
    "stateMutability":"nonpayable",
    "inputs":[
        {"name":"_to","type":"address"},
        {"name":"_value","type":"uint256"}
    ],
    "outputs":[{"name":"","type":"bool"}]
}]`

// TxBuilder constructs unsigned EVM transactions for USDC transfers.
// It has no access to private keys — signing is the KeyManager's responsibility.
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

// BuildTransfer constructs an unsigned EIP-1559 transaction calling
// USDC.transfer(to, amountMicro). amountMicro is in USDC micro-units (6 decimals):
//
//	1 USDC == 1_000_000 micro-units
//
// The caller provides gasLimit, maxFeePerGas, and maxPriorityFeePerGas from
// the current network conditions (fetched by the Facade before calling this).
func (b *TxBuilder) BuildTransfer(
	to string,
	amountMicro *big.Int,
	nonce uint64,
	gasLimit uint64,
	maxFeePerGas *big.Int,
	maxPriorityFeePerGas *big.Int,
) (*types.Transaction, error) {
	toAddr := common.HexToAddress(to)

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
		Value:     big.NewInt(0), // ERC-20 transfer carries no ETH value
		Data:      data,
	})
	return tx, nil
}

// USDCAddress returns the USDC contract address this builder targets.
func (b *TxBuilder) USDCAddress() common.Address { return b.usdcAddress }

// ChainID returns the chain ID this builder targets.
func (b *TxBuilder) ChainID() *big.Int { return new(big.Int).Set(b.chainID) }
