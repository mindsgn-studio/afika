// internal/config/config.go
package config

import "os"

type Config struct {
	RPCURL      string
	USDCAddress string
	ChainID     int64
	UserAddress string // Set after wallet creation
}

func Load() *Config {
	return &Config{
		RPCURL:      getEnv("RPC_URL", "https://mainnet.infura.io/v3/YOUR_KEY"),
		USDCAddress: getEnv("USDC_CONTRACT", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
		ChainID:     1, // Ethereum mainnet
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
