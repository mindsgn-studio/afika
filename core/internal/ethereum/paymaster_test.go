package ethereum

import (
	"math/big"
	"testing"
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
