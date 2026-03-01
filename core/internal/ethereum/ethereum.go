package ethereum

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/big"
	"net/http"
	"strconv"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/database"
)

type Wallet struct {
	Address      string  `json:"address"`
	Blockchain   string  `json:"blockchain"`
	BlockchainId string  `json:"blockchainId"`
	Decimals     uint    `json:"decimals"`
	Currency     string  `json:"currency"`
	FiatBalance  float64 `json:"fiatBalances"`
}

type Wallets struct {
	TotalFiat float64  `json:"totalFiat"`
	Currency  string   `json:"currency"`
	Wallets   []Wallet `json:"wallets"`
}

type Contract struct {
	Address      string `json:"address"`
	Blockchain   string `json:"blockchain"`
	BlockchainId string `json:"blockchainId"`
	Decimals     uint   `json:"decimals"`
}

type MarketData struct {
	Data struct {
		MarketCap         float64    `json:"market_cap"`
		MarketCapDiluted  float64    `json:"market_cap_diluted"`
		Liquidity         float64    `json:"liquidity"`
		Price             float64    `json:"price"`
		OffChainVolume    float64    `json:"off_chain_volume"`
		Volume            float64    `json:"volume"`
		VolumeChange24h   float64    `json:"volume_change_24h"`
		Volume7d          float64    `json:"volume_7d"`
		IsListed          bool       `json:"is_listed"`
		PriceChange24h    float64    `json:"price_change_24h"`
		PriceChange1h     float64    `json:"price_change_1h"`
		PriceChange7d     float64    `json:"price_change_7d"`
		PriceChange1m     float64    `json:"price_change_1m"`
		PriceChange1y     float64    `json:"price_change_1y"`
		Ath               float64    `json:"ath"`
		Atl               float64    `json:"atl"`
		Name              string     `json:"name"`
		Symbol            string     `json:"symbol"`
		Logo              string     `json:"logo"`
		Rank              int        `json:"rank"`
		Contracts         []Contract `json:"contracts"`
		TotalSupply       string     `json:"total_supply"`
		CirculatingSupply string     `json:"circulating_supply"`
	} `json:"data"`
}

type networkDetails struct {
	Name       string   `json:"name"`
	ChainID    int      `json:"chainID"`
	ChainIDHex string   `json:"ChainIDHex"`
	Currency   string   `json:"currency"`
	Mainnet    bool     `json:"mainnet"`
	RPC        []string `json:"rpc"`
}

var NetworkMainnetList []string = []string{
	"polygon-mainnet",
}

var NetworkTestnetList []string = []string{
	"polygon-mumbai",
}

type balanceClient interface {
	BalanceAt(ctx context.Context, account common.Address, blockNumber *big.Int) (*big.Int, error)
	Close()
}

var dialClient = func(url string) (balanceClient, error) {
	return ethclient.Dial(url)
}

var fetchMarketData = GetData

func ConvertBody(body []byte) (MarketData, error) {
	var data MarketData
	err := json.Unmarshal(body, &data)
	if err != nil {
		return data, err
	}
	return data, nil
}

func GetTotalBalance(ctx context.Context, db *database.DB, network string) (Wallets, error) {
	if db == nil {
		return Wallets{}, fmt.Errorf("database is required")
	}

	total := float64(0)
	var userWallet Wallets
	wallets, err := db.ListWallets(ctx)
	if err != nil {
		return Wallets{}, err
	}

	var networkList []string
	if network == "mainnet" {
		networkList = NetworkMainnetList
	} else {
		networkList = NetworkTestnetList
	}

	for _, networkName := range networkList {
		details := GetNetwork(networkName)
		if len(details.RPC) == 0 {
			continue
		}

		client, err := dialClient(details.RPC[0])
		if err != nil {
			return Wallets{}, err
		}

		data, err := fetchMarketData(details.Name)
		if err != nil {
			client.Close()
			return Wallets{}, err
		}

		for _, wallet := range wallets {
			account := common.HexToAddress(wallet.Address)
			balance, err := client.BalanceAt(ctx, account, nil)
			if err != nil {
				client.Close()
				return Wallets{}, err
			}

			fbalance := new(big.Float)
			fbalance.SetString(balance.String())
			ethValue := new(big.Float).Quo(fbalance, big.NewFloat(math.Pow10(18)))

			price := ethValue.String()
			cryptoBalance, err := strconv.ParseFloat(price, 64)
			if err != nil {
				client.Close()
				return Wallets{}, err
			}

			total += data.Data.Price * cryptoBalance

			walletData := Wallet{
				Address:      wallet.Address,
				Blockchain:   details.Name,
				BlockchainId: fmt.Sprintf("%d", details.ChainID),
				Decimals:     18,
				Currency:     "USD",
				FiatBalance:  cryptoBalance * data.Data.Price,
			}

			userWallet.Wallets = append(userWallet.Wallets, walletData)
		}

		client.Close()
	}

	userWallet.TotalFiat = total
	userWallet.Currency = "USD"

	return userWallet, nil
}

func CreateNewEthereumWallet(ctx context.Context, db *database.DB, name string) (string, error) {
	if db == nil {
		return "", fmt.Errorf("database is required")
	}

	newPrivateKey, err := crypto.GenerateKey()
	if err != nil {
		return "", err
	}

	privateKeyBytes := crypto.FromECDSA(newPrivateKey)
	publicKey := newPrivateKey.Public()

	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("cannot assert type: publicKey is not of type *ecdsa.PublicKey")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	if name == "" {
		name = "Ethereum"
	}

	if err := db.InsertWallet(ctx, "ethereum", name, address, privateKeyBytes); err != nil {
		return "", err
	}

	return address, nil
}

func GetNetwork(network string) networkDetails {
	switch network {
	case "polygon-mainnet":
		rpcList := []string{
			"wss://polygon-bor-rpc.publicnode.com",
			"https://polygon.llamarpc.com",
			"wss://polygon.drpc.org",
		}

		return networkDetails{
			Name:       "polygon",
			ChainID:    137,
			ChainIDHex: "0x89",
			Currency:   "matic",
			Mainnet:    true,
			RPC:        rpcList,
		}
	case "polygon-mumbai":
		rpcList := []string{
			"https://polygon-mumbai.gateway.tenderly.co",
			"https://polygon-mumbai.api.onfinality.io/public",
			"https://gateway.tenderly.co/public/polygon-mumbai",
		}

		return networkDetails{
			Name:       "polygon",
			ChainID:    80001,
			ChainIDHex: "0x13881",
			Currency:   "matic",
			Mainnet:    false,
			RPC:        rpcList,
		}

	default:
		return networkDetails{
			Name:     "",
			ChainID:  0,
			Currency: "",
			Mainnet:  false,
		}
	}
}

func GetData(name string) (MarketData, error) {
	url := "https://api.mobula.io/api/1/market/data?asset=" + name
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return MarketData{}, err
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return MarketData{}, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return MarketData{}, fmt.Errorf("market data request failed: status %d", res.StatusCode)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return MarketData{}, err
	}

	data, err := ConvertBody(body)
	if err != nil {
		return MarketData{}, err
	}

	return data, nil
}
