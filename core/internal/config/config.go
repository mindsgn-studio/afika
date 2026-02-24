package config

import (
	"os"
	"strconv"
)

const (
	// ConfirmDepth is the number of blocks required before a transfer
	// is considered confirmed. Standard Ethereum probabilistic finality.
	ConfirmDepth = 12

	// LogChunkSize is the max block range per eth_getLogs call.
	// Safe for public RPCs (Infura/Alchemy allow 2k–10k).
	LogChunkSize = uint64(2000)

	// GasLimit is a conservative upper bound for an ERC-20 transfer call.
	GasLimit = uint64(65000)

	// PollInterval is how often the sync service checks for new blocks (seconds).
	PollInterval = 12
)

// Config holds all runtime configuration for the wallet.
type Config struct {
	RPCURL      string
	USDCAddress string
	ChainID     int64
	UserAddress string // Populated after wallet creation/load
}

// Load reads configuration from environment variables with sane defaults
// (Ethereum mainnet + official USDC contract).
func Load() *Config {
	chainID := int64(1)
	if v := os.Getenv("CHAIN_ID"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			chainID = n
		}
	}
	return &Config{
		RPCURL:      getEnv("RPC_URL", "https://mainnet.infura.io/v3/YOUR_KEY"),
		USDCAddress: getEnv("USDC_CONTRACT", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
		ChainID:     chainID,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
