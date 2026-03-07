package ethereum

import (
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestResolveSendMode(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "empty defaults to auto", input: "", want: SendModeAuto},
		{name: "auto remains auto", input: "auto", want: SendModeAuto},
		{name: "sponsored remains sponsored", input: "sponsored", want: SendModeSponsored},
		{name: "direct remains direct", input: "direct", want: SendModeDirect},
		{name: "unknown falls back to auto", input: "experimental", want: SendModeAuto},
		{name: "case and whitespace are normalized", input: "  SpOnSoReD  ", want: SendModeSponsored},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveSendMode(tt.input)
			if got != tt.want {
				t.Fatalf("ResolveSendMode(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestValidateSponsoredTransfer(t *testing.T) {
	policy := PaymasterPolicy{
		Enabled:              true,
		SupportedTokenSymbol: USDCSymbol,
		MaxPerOperation:      big.NewInt(100_000_000),
		DailyLimit:           big.NewInt(500_000_000),
	}
	usdc := TokenConfig{Identifier: "usdc", Symbol: USDCSymbol, Address: "0x1", Decimals: USDCDecimals, IsNative: false}
	native := TokenConfig{Identifier: NativeTokenIdentifier, Symbol: "ETH", Address: "", Decimals: 18, IsNative: true}

	if err := ValidateSponsoredTransfer(policy, usdc, big.NewInt(10_000_000)); err != nil {
		t.Fatalf("expected valid sponsorship, got %v", err)
	}

	if err := ValidateSponsoredTransfer(PaymasterPolicy{Enabled: false}, usdc, big.NewInt(1)); err == nil {
		t.Fatalf("expected disabled policy error")
	}

	if err := ValidateSponsoredTransfer(policy, native, big.NewInt(1)); err == nil {
		t.Fatalf("expected unsupported token error")
	}

	if err := ValidateSponsoredTransfer(policy, usdc, big.NewInt(0)); err == nil {
		t.Fatalf("expected invalid amount error")
	}

	if err := ValidateSponsoredTransfer(policy, usdc, big.NewInt(200_000_000)); err == nil {
		t.Fatalf("expected per-operation cap error")
	}
}

func TestBuildSignedPaymasterAndData(t *testing.T) {
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}

	t.Setenv("EXPO_PUBLIC_POCKET_PAYMASTER_SIGNER_PRIVATE_KEY", strings.TrimSpace("0x"+common.Bytes2Hex(crypto.FromECDSA(key))))

	paymasterAddress := "0x00000000000000000000000000000000000000aa"
	sender := common.HexToAddress("0x00000000000000000000000000000000000000bb")
	nonce := big.NewInt(1)
	chainID := big.NewInt(11155111)

	data, err := BuildSignedPaymasterAndData(paymasterAddress, sender, nonce, chainID, "ethereum-sepolia")
	if err != nil {
		t.Fatalf("BuildSignedPaymasterAndData() error = %v", err)
	}
	if len(data) != 20+65 {
		t.Fatalf("expected paymasterAndData length %d, got %d", 20+65, len(data))
	}
	if common.BytesToAddress(data[:20]) != common.HexToAddress(paymasterAddress) {
		t.Fatalf("paymaster prefix mismatch")
	}
	v := data[len(data)-1]
	if v != 27 && v != 28 {
		t.Fatalf("expected signature v to be 27 or 28, got %d", v)
	}
}

func TestBuildSignedPaymasterAndDataPrefersNetworkSpecificKey(t *testing.T) {
	globalKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey(global) error = %v", err)
	}
	networkKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey(network) error = %v", err)
	}

	t.Setenv("EXPO_PUBLIC_POCKET_PAYMASTER_SIGNER_PRIVATE_KEY", "0x"+common.Bytes2Hex(crypto.FromECDSA(globalKey)))
	t.Setenv("EXPO_PUBLIC_POCKET_PAYMASTER_SIGNER_PRIVATE_KEY_ETHEREUM_SEPOLIA", "0x"+common.Bytes2Hex(crypto.FromECDSA(networkKey)))

	_, err = BuildSignedPaymasterAndData(
		"0x00000000000000000000000000000000000000aa",
		common.HexToAddress("0x00000000000000000000000000000000000000bb"),
		big.NewInt(7),
		big.NewInt(11155111),
		"ethereum-sepolia",
	)
	if err != nil {
		t.Fatalf("BuildSignedPaymasterAndData() error = %v", err)
	}
}
