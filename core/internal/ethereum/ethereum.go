package ethereum

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
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
	"gnosis-mainnet",
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

const (
	USDCSymbol             = "USDC"
	USDCGnosisDecimals     = 6
	USDCGnosisContractAddr = "0xDDAfbb505ad214D7b80b1f830fccc89B60fb7A83"
	MinGasReserveWei       = 2000000000000000 // 0.002 xDAI
)

var erc20ABI = mustParseABI(`[{
	"constant":true,
	"inputs":[{"name":"account","type":"address"}],
	"name":"balanceOf",
	"outputs":[{"name":"","type":"uint256"}],
	"stateMutability":"view",
	"type":"function"
},{
	"constant":false,
	"inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"}],
	"name":"transfer",
	"outputs":[{"name":"","type":"bool"}],
	"stateMutability":"nonpayable",
	"type":"function"
}]`)

func mustParseABI(value string) abi.ABI {
	parsed, err := abi.JSON(strings.NewReader(value))
	if err != nil {
		panic(err)
	}
	return parsed
}

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

func GetUSDCBalance(ctx context.Context, db *database.DB, network string) (string, string, error) {
	if db == nil {
		return "", "", errors.New("database is required")
	}

	wallets, err := db.ListWallets(ctx)
	if err != nil {
		return "", "", err
	}
	if len(wallets) == 0 {
		return "0", "", nil
	}

	walletAddress := wallets[0].Address
	balance, err := GetUSDCBalanceForAddress(ctx, walletAddress, network)
	if err != nil {
		return "", "", err
	}

	return balance, walletAddress, nil
}

func GetUSDCBalanceForAddress(ctx context.Context, walletAddress string, network string) (string, error) {
	if walletAddress == "" {
		return "", errors.New("wallet address is required")
	}

	networkConfig := GetNetwork(network)
	if len(networkConfig.RPC) == 0 {
		return "", fmt.Errorf("unsupported network: %s", network)
	}

	client, err := ethclient.DialContext(ctx, networkConfig.RPC[0])
	if err != nil {
		return "", err
	}
	defer client.Close()

	tokenAddress := common.HexToAddress(USDCGnosisContractAddr)
	ownerAddress := common.HexToAddress(walletAddress)

	data, err := erc20ABI.Pack("balanceOf", ownerAddress)
	if err != nil {
		return "", err
	}

	result, err := client.CallContract(ctx, ethereum.CallMsg{To: &tokenAddress, Data: data}, nil)
	if err != nil {
		return "", err
	}

	out, err := erc20ABI.Unpack("balanceOf", result)
	if err != nil {
		return "", err
	}
	if len(out) != 1 {
		return "", errors.New("unexpected balanceOf response")
	}

	rawBalance, ok := out[0].(*big.Int)
	if !ok {
		return "", errors.New("invalid balance type")
	}

	return formatTokenUnits(rawBalance, USDCGnosisDecimals), nil
}

func SendUSDC(
	ctx context.Context,
	db *database.DB,
	network string,
	recipientAddress string,
	amount string,
	note string,
	providerID string,
) (string, error) {
	if db == nil {
		return "", errors.New("database is required")
	}
	if recipientAddress == "" {
		return "", errors.New("recipient address is required")
	}
	if !common.IsHexAddress(recipientAddress) {
		return "", errors.New("invalid recipient address")
	}

	amountUnits, err := parseTokenAmount(amount, USDCGnosisDecimals)
	if err != nil {
		return "", err
	}
	if amountUnits.Sign() <= 0 {
		return "", errors.New("amount must be greater than zero")
	}

	walletSecrets, err := db.ListWalletSecrets(ctx)
	if err != nil {
		return "", err
	}
	if len(walletSecrets) == 0 {
		return "", errors.New("no wallet found")
	}

	sender := walletSecrets[0]
	if !common.IsHexAddress(sender.Address) {
		return "", errors.New("invalid sender address")
	}

	currentBalance, err := GetUSDCBalanceForAddress(ctx, sender.Address, network)
	if err != nil {
		return "", err
	}
	currentBalanceUnits, err := parseTokenAmount(currentBalance, USDCGnosisDecimals)
	if err != nil {
		return "", err
	}
	if currentBalanceUnits.Cmp(amountUnits) < 0 {
		return "", errors.New("insufficient USDC balance")
	}

	networkConfig := GetNetwork(network)
	if len(networkConfig.RPC) == 0 {
		return "", fmt.Errorf("unsupported network: %s", network)
	}

	client, err := ethclient.DialContext(ctx, networkConfig.RPC[0])
	if err != nil {
		return "", err
	}
	defer client.Close()

	senderAddress := common.HexToAddress(sender.Address)
	nativeBalance, err := client.BalanceAt(ctx, senderAddress, nil)
	if err != nil {
		return "", err
	}
	if nativeBalance.Cmp(big.NewInt(MinGasReserveWei)) < 0 {
		return "", errors.New("insufficient native gas token reserve")
	}

	privateKey, err := crypto.ToECDSA(sender.PrivateKey)
	if err != nil {
		return "", err
	}

	nonce, err := client.PendingNonceAt(ctx, senderAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	contract := common.HexToAddress(USDCGnosisContractAddr)
	transferData, err := erc20ABI.Pack("transfer", common.HexToAddress(recipientAddress), amountUnits)
	if err != nil {
		return "", err
	}

	call := ethereum.CallMsg{
		From: senderAddress,
		To:   &contract,
		Data: transferData,
	}

	gasLimit, err := client.EstimateGas(ctx, call)
	if err != nil {
		gasLimit = 120000
	}

	tx := types.NewTransaction(nonce, contract, big.NewInt(0), gasLimit, gasPrice, transferData)
	signer := types.NewEIP155Signer(big.NewInt(int64(networkConfig.ChainID)))
	signedTx, err := types.SignTx(tx, signer, privateKey)
	if err != nil {
		return "", err
	}

	if err := client.SendTransaction(ctx, signedTx); err != nil {
		return "", err
	}

	txHash := signedTx.Hash().Hex()
	if err := db.InsertTransactionIfMissing(ctx, database.TransactionRecord{
		TxHash:          txHash,
		Nonce:           int64(nonce),
		Chain:           network,
		Token:           USDCSymbol,
		Amount:          formatTokenUnits(amountUnits, USDCGnosisDecimals),
		TransactionType: "transfer",
		State:           "pending",
		Note:            note,
		Source:          sender.Address,
		Destination:     recipientAddress,
		ProviderID:      providerID,
		WalletAddress:   sender.Address,
		Counterparty:    recipientAddress,
	}); err != nil {
		return "", err
	}

	return txHash, nil
}

func SyncTransactionStatus(ctx context.Context, txHash string, network string) (string, error) {
	if txHash == "" {
		return "", errors.New("transaction hash is required")
	}
	networkConfig := GetNetwork(network)
	if len(networkConfig.RPC) == 0 {
		return "", fmt.Errorf("unsupported network: %s", network)
	}

	client, err := ethclient.DialContext(ctx, networkConfig.RPC[0])
	if err != nil {
		return "", err
	}
	defer client.Close()

	hash := common.HexToHash(txHash)
	receipt, err := client.TransactionReceipt(ctx, hash)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			return "pending", nil
		}
		return "", err
	}

	if receipt.Status == types.ReceiptStatusSuccessful {
		return "completed", nil
	}

	return "failed", nil
}

func formatTokenUnits(amount *big.Int, decimals int) string {
	if amount == nil {
		return "0"
	}

	if decimals <= 0 {
		return amount.String()
	}

	denominator := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	r := new(big.Rat).SetFrac(amount, denominator)
	s := r.FloatString(decimals)

	for strings.Contains(s, ".") && strings.HasSuffix(s, "0") {
		s = strings.TrimSuffix(s, "0")
	}
	s = strings.TrimSuffix(s, ".")
	if s == "" {
		return "0"
	}
	return s
}

func parseTokenAmount(value string, decimals int) (*big.Int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, errors.New("amount is required")
	}

	r, ok := new(big.Rat).SetString(value)
	if !ok {
		return nil, errors.New("invalid amount")
	}
	if r.Sign() <= 0 {
		return nil, errors.New("amount must be greater than zero")
	}

	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	scaled := new(big.Rat).Mul(r, new(big.Rat).SetInt(scale))

	if !scaled.IsInt() {
		return nil, errors.New("amount precision is too high")
	}

	return scaled.Num(), nil
}

func ListUSDCTransactions(ctx context.Context, db *database.DB, network string, limit, offset int) ([]database.TransactionRecord, error) {
	if db == nil {
		return nil, errors.New("database is required")
	}

	wallets, err := db.ListWallets(ctx)
	if err != nil {
		return nil, err
	}
	if len(wallets) == 0 {
		return []database.TransactionRecord{}, nil
	}

	transactions, err := db.ListTransactions(ctx, wallets[0].Address, USDCSymbol, limit, offset)
	if err != nil {
		return nil, err
	}

	for idx, tx := range transactions {
		if tx.State != "pending" {
			continue
		}

		status, err := SyncTransactionStatus(ctx, tx.TxHash, network)
		if err != nil {
			continue
		}

		if status != tx.State {
			_ = db.UpdateTransactionState(ctx, tx.TxHash, status)
			transactions[idx].State = status
			transactions[idx].UpdatedAt = time.Now().Unix()
		}
	}

	return transactions, nil
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
	case "gnosis-mainnet":
		rpcList := []string{
			"https://rpc.gnosischain.com",
			"https://gnosis.drpc.org",
		}

		return networkDetails{
			Name:       "gnosis",
			ChainID:    100,
			ChainIDHex: "0x64",
			Currency:   "xDAI",
			Mainnet:    true,
			RPC:        rpcList,
		}
	case "gnosis-chiado":
		rpcList := []string{
			"https://rpc.chiadochain.net",
			"https://gnosis-chiado-rpc.publicnode.com",
		}

		return networkDetails{
			Name:       "gnosis",
			ChainID:    10200,
			ChainIDHex: "0x27d8",
			Currency:   "xDAI",
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
