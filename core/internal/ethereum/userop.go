package ethereum

import (
	"crypto/ecdsa"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

type UserOperation struct {
	Sender               common.Address `json:"sender"`
	Nonce                *big.Int       `json:"nonce"`
	InitCode             []byte         `json:"initCode"`
	CallData             []byte         `json:"callData"`
	CallGasLimit         *big.Int       `json:"callGasLimit"`
	VerificationGasLimit *big.Int       `json:"verificationGasLimit"`
	PreVerificationGas   *big.Int       `json:"preVerificationGas"`
	MaxFeePerGas         *big.Int       `json:"maxFeePerGas"`
	MaxPriorityFeePerGas *big.Int       `json:"maxPriorityFeePerGas"`
	PaymasterAndData     []byte         `json:"paymasterAndData"`
	Signature            []byte         `json:"signature"`
}

type UserOperationGasEstimate struct {
	PreVerificationGas   *big.Int
	VerificationGasLimit *big.Int
	CallGasLimit         *big.Int
}

func (u UserOperation) ToBundlerMap() map[string]string {
	return map[string]string{
		"sender":               u.Sender.Hex(),
		"nonce":                toHexInt(u.Nonce),
		"initCode":             toHexBytes(u.InitCode),
		"callData":             toHexBytes(u.CallData),
		"callGasLimit":         toHexInt(u.CallGasLimit),
		"verificationGasLimit": toHexInt(u.VerificationGasLimit),
		"preVerificationGas":   toHexInt(u.PreVerificationGas),
		"maxFeePerGas":         toHexInt(u.MaxFeePerGas),
		"maxPriorityFeePerGas": toHexInt(u.MaxPriorityFeePerGas),
		"paymasterAndData":     toHexBytes(u.PaymasterAndData),
		"signature":            toHexBytes(u.Signature),
	}
}

func UserOperationHash(op UserOperation, entryPoint common.Address, chainID *big.Int) common.Hash {
	args := abi.Arguments{
		{Type: mustType("address")},
		{Type: mustType("uint256")},
		{Type: mustType("bytes32")},
		{Type: mustType("bytes32")},
		{Type: mustType("uint256")},
		{Type: mustType("uint256")},
		{Type: mustType("uint256")},
		{Type: mustType("uint256")},
		{Type: mustType("uint256")},
		{Type: mustType("bytes32")},
		{Type: mustType("address")},
		{Type: mustType("uint256")},
	}

	packed, _ := args.Pack(
		op.Sender,
		nilBig(op.Nonce),
		crypto.Keccak256Hash(op.InitCode),
		crypto.Keccak256Hash(op.CallData),
		nilBig(op.CallGasLimit),
		nilBig(op.VerificationGasLimit),
		nilBig(op.PreVerificationGas),
		nilBig(op.MaxFeePerGas),
		nilBig(op.MaxPriorityFeePerGas),
		crypto.Keccak256Hash(op.PaymasterAndData),
		entryPoint,
		nilBig(chainID),
	)

	return crypto.Keccak256Hash(packed)
}

func SignUserOperation(op UserOperation, entryPoint common.Address, chainID *big.Int, key *ecdsa.PrivateKey) ([]byte, common.Hash, error) {
	if key == nil {
		return nil, common.Hash{}, errors.New("private key is required")
	}
	hash := UserOperationHash(op, entryPoint, chainID)
	digest := crypto.Keccak256Hash([]byte("\x19Ethereum Signed Message:\n32"), hash.Bytes())
	sig, err := crypto.Sign(digest.Bytes(), key)
	if err != nil {
		return nil, common.Hash{}, err
	}
	return sig, hash, nil
}

func decodeHexString(value string) ([]byte, error) {
	v := strings.TrimPrefix(strings.TrimSpace(value), "0x")
	if v == "" {
		return []byte{}, nil
	}
	decoded, err := hex.DecodeString(v)
	if err != nil {
		return nil, fmt.Errorf("invalid hex payload: %w", err)
	}
	return decoded, nil
}

func toHexBytes(value []byte) string {
	if len(value) == 0 {
		return "0x"
	}
	return "0x" + hex.EncodeToString(value)
}

func toHexInt(value *big.Int) string {
	if value == nil {
		return "0x0"
	}
	return "0x" + value.Text(16)
}

func nilBig(value *big.Int) *big.Int {
	if value == nil {
		return big.NewInt(0)
	}
	return value
}

func mustType(name string) abi.Type {
	t, err := abi.NewType(name, "", nil)
	if err != nil {
		panic(err)
	}
	return t
}
