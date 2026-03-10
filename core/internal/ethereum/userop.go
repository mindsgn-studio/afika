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

var knownEntryPointV07 = map[string]struct{}{
	"0x0000000071727de22e5e9d8baf0edac6f37da032": {},
}

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

func (u UserOperation) ToBundlerMapV07() map[string]string {
	factory, factoryData := splitFactoryInitCode(u.InitCode)
	paymaster, paymasterData := splitPaymasterAndData(u.PaymasterAndData)

	result := map[string]string{
		"sender":               u.Sender.Hex(),
		"nonce":                toHexInt(u.Nonce),
		"factory":              toHexBytes(factory),
		"factoryData":          toHexBytes(factoryData),
		"callData":             toHexBytes(u.CallData),
		"callGasLimit":         toHexInt(u.CallGasLimit),
		"verificationGasLimit": toHexInt(u.VerificationGasLimit),
		"preVerificationGas":   toHexInt(u.PreVerificationGas),
		"maxFeePerGas":         toHexInt(u.MaxFeePerGas),
		"maxPriorityFeePerGas": toHexInt(u.MaxPriorityFeePerGas),
		"paymaster":            toHexBytes(paymaster),
		"paymasterData":        toHexBytes(paymasterData),
		"signature":            toHexBytes(u.Signature),
	}

	// For v0.7 payloads, paymaster gas limits are explicit fields.
	if len(paymaster) > 0 {
		result["paymasterVerificationGasLimit"] = toHexInt(u.VerificationGasLimit)
		result["paymasterPostOpGasLimit"] = "0x0"
	} else {
		result["paymasterVerificationGasLimit"] = "0x0"
		result["paymasterPostOpGasLimit"] = "0x0"
	}

	return result
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
	if isEntryPointV07(entryPoint) {
		hash = UserOperationHashV07(op, entryPoint, chainID)
	}
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

func splitFactoryInitCode(initCode []byte) ([]byte, []byte) {
	if len(initCode) < common.AddressLength {
		if len(initCode) == 0 {
			return []byte{}, []byte{}
		}
		return []byte{}, append([]byte{}, initCode...)
	}

	factory := append([]byte{}, initCode[:common.AddressLength]...)
	factoryData := append([]byte{}, initCode[common.AddressLength:]...)
	return factory, factoryData
}

func splitPaymasterAndData(value []byte) ([]byte, []byte) {
	if len(value) < common.AddressLength {
		if len(value) == 0 {
			return []byte{}, []byte{}
		}
		return []byte{}, append([]byte{}, value...)
	}

	paymaster := append([]byte{}, value[:common.AddressLength]...)
	paymasterData := append([]byte{}, value[common.AddressLength:]...)
	return paymaster, paymasterData
}

func isEntryPointV07(entryPoint common.Address) bool {
	_, ok := knownEntryPointV07[strings.ToLower(entryPoint.Hex())]
	return ok
}

func UserOperationHashV07(op UserOperation, entryPoint common.Address, chainID *big.Int) common.Hash {
	args := abi.Arguments{
		{Type: mustType("address")},
		{Type: mustType("uint256")},
		{Type: mustType("bytes32")},
		{Type: mustType("bytes32")},
		{Type: mustType("bytes32")},
		{Type: mustType("uint256")},
		{Type: mustType("bytes32")},
		{Type: mustType("bytes32")},
		{Type: mustType("address")},
		{Type: mustType("uint256")},
	}

	packed, _ := args.Pack(
		op.Sender,
		nilBig(op.Nonce),
		crypto.Keccak256Hash(op.InitCode),
		crypto.Keccak256Hash(op.CallData),
		packTwoUint128(nilBig(op.VerificationGasLimit), nilBig(op.CallGasLimit)),
		nilBig(op.PreVerificationGas),
		packTwoUint128(nilBig(op.MaxPriorityFeePerGas), nilBig(op.MaxFeePerGas)),
		crypto.Keccak256Hash(toV07PaymasterAndData(op.PaymasterAndData, op.VerificationGasLimit)),
		entryPoint,
		nilBig(chainID),
	)

	return crypto.Keccak256Hash(packed)
}

func packTwoUint128(high, low *big.Int) [32]byte {
	var out [32]byte
	h := new(big.Int).Set(nilBig(high))
	l := new(big.Int).Set(nilBig(low))

	maxUint128 := new(big.Int).Lsh(big.NewInt(1), 128)
	maxUint128.Sub(maxUint128, big.NewInt(1))
	if h.Cmp(maxUint128) > 0 {
		h = maxUint128
	}
	if l.Cmp(maxUint128) > 0 {
		l = maxUint128
	}

	combined := new(big.Int).Lsh(h, 128)
	combined.Or(combined, l)
	bytes := common.LeftPadBytes(combined.Bytes(), 32)
	copy(out[:], bytes)
	return out
}

func toV07PaymasterAndData(value []byte, verificationGasLimit *big.Int) []byte {
	if len(value) == 0 {
		return []byte{}
	}

	// Already v0.7 layout: paymaster(20)+verificationGas(16)+postOpGas(16)+data(...)
	if len(value) >= 52 {
		return append([]byte{}, value...)
	}

	// v0.6 layout: paymaster(20)+data(...). Convert to v0.7 by inserting
	// paymasterVerificationGasLimit and paymasterPostOpGasLimit (0).
	if len(value) >= common.AddressLength {
		paymaster := value[:common.AddressLength]
		data := value[common.AddressLength:]
		verificationGas := leftPad16(nilBig(verificationGasLimit).Bytes())
		postOpGas := make([]byte, 16)
		out := make([]byte, 0, len(value)+32)
		out = append(out, paymaster...)
		out = append(out, verificationGas...)
		out = append(out, postOpGas...)
		out = append(out, data...)
		return out
	}

	return append([]byte{}, value...)
}

func leftPad16(value []byte) []byte {
	if len(value) >= 16 {
		return append([]byte{}, value[len(value)-16:]...)
	}
	out := make([]byte, 16)
	copy(out[16-len(value):], value)
	return out
}
