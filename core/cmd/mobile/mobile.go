// mobile/facade.go
//go:build ignore || ignore || Kept || as || a || gomobile || bind || target
// +build ignore ignore Kept as a gomobile bind target

package mobile

import (
	"context"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/facade"
)

// MobileWallet is a thin export wrapper compatible with gomobile's type constraints.
// gomobile supports: string, bool, int, int64, float64, []byte, and interfaces.
// It does NOT support: *big.Int, maps, slices of structs, or unexported fields.
type MobileWallet struct {
	w *facade.Wallet
}

func NewMobileWallet(dbPath, rpcURL, usdcAddress string, chainID int64) (*MobileWallet, error) {
	cfg := &config.Config{RPCURL: rpcURL, USDCAddress: usdcAddress, ChainID: chainID}
	w, err := facade.New(dbPath, cfg)
	if err != nil {
		return nil, err
	}
	return &MobileWallet{w: w}, nil
}

// GetBalance returns USDC balance as a string (gomobile-safe).
func (m *MobileWallet) GetUSDCBalance() (string, error) {
	info, err := m.w.GetInfo(context.Background())
	if err != nil {
		return "", err
	}
	return info.USDCBalance, nil
}

// Send is the gomobile-safe send method — passphrase passed as []byte.
func (m *MobileWallet) Send(toAddress, amountUSDC string, passphrase []byte) (string, error) {
	result, err := m.w.Send(context.Background(), toAddress, amountUSDC, passphrase)
	if err != nil {
		return "", err
	}
	return result.TxHash, nil
}
