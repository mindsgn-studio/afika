// internal/facade/facade.go
package facade

import (
	"context"
	"errors"
	"fmt"
	"math/big"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/txbuilder"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/sync"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/nonce"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/keymanager"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/db"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"

	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/broadcaster"
)

// WalletInfo is a plain data struct suitable for gomobile (no unexported fields).
type WalletInfo struct {
	Address     string
	USDCBalance string // Human-readable (e.g., "100.50")
	ETHBalance  string // Human-readable (e.g., "0.0042")
	SyncedBlock int64
}

// Transfer represents a cached USDC transfer event.
type Transfer struct {
	TxHash      string
	BlockNumber int64
	Direction   string // "IN" or "OUT"
	Amount      string // Human-readable USDC
	Confirmed   bool
}

// SendResult is returned after broadcasting a transaction.
type SendResult struct {
	TxHash string
	Nonce  uint64
}

// Wallet is the App Facade. It is safe to call from multiple goroutines
// because all mutable state is serialized through db.DB's mutex.
type Wallet struct {
	db         *db.DB
	km         *keymanager.KeyManager
	txb        *txbuilder.TxBuilder
	sync       *sync.Service
	bcast      *broadcaster.Broadcaster
	nonceTrack *nonce.Tracker
	cfg        *config.Config
}

// New creates a fully wired Wallet facade.
func New(dbPath string, cfg *config.Config) (*Wallet, error) {
	database, err := db.Open(dbPath)
	if err != nil {
		return nil, err
	}

	client, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		return nil, err
	}

	txb, err := txbuilder.New(cfg.USDCAddress, cfg.ChainID)
	if err != nil {
		return nil, err
	}

	// Address is read from DB after wallet creation
	address := cfg.UserAddress

	svc := sync.NewService(database, client, address, cfg.USDCAddress)
	bcast := broadcaster.New(client)
	nt := nonce.NewTracker(client, address)

	return &Wallet{
		db:         database,
		km:         &keymanager.KeyManager{},
		txb:        txb,
		sync:       svc,
		bcast:      bcast,
		nonceTrack: nt,
		cfg:        cfg,
	}, nil
}

// --- Wallet Lifecycle ---

// CreateWallet generates a new mnemonic, encrypts it, and persists the wallet.
// Returns the mnemonic — caller must zero it after recording the seed phrase.
func (w *Wallet) CreateWallet(passphrase []byte) (string, error) {
	mnemonic, err := w.km.GenerateMnemonic()
	if err != nil {
		return "", err
	}

	address, err := w.km.DeriveAddress(mnemonic)
	if err != nil {
		return "", err
	}

	ciphertext, salt, err := w.km.EncryptMnemonic(mnemonic, passphrase)
	if err != nil {
		return "", err
	}

	w.db.Lock()
	defer w.db.Unlock()
	_, err = w.db.Conn().Exec(`
        INSERT OR REPLACE INTO wallet (id, address, encrypted_key, kdf_salt, created_at)
        VALUES (1, ?, ?, ?, strftime('%s','now'))`,
		address, ciphertext, salt)
	if err != nil {
		return "", err
	}

	w.cfg.UserAddress = address
	return mnemonic, nil
}

// --- Send USDC ---

// Send validates gas, constructs, signs, and broadcasts a USDC transfer.
func (w *Wallet) Send(ctx context.Context, toAddress, amountUSDC string, passphrase []byte) (*SendResult, error) {
	// Parse USDC amount (6 decimal places)
	amount, ok := new(big.Float).SetString(amountUSDC)
	if !ok {
		return nil, errors.New("invalid USDC amount")
	}
	micro := new(big.Int)
	amount.Mul(amount, big.NewFloat(1e6)).Int(micro)

	// Fetch current gas price
	gasPrice, err := w.rpcClient().SuggestGasPrice(ctx)
	if err != nil {
		return nil, err
	}
	const gasLimit = uint64(65000) // Conservative ERC-20 transfer limit

	// --- Gas Paradox Check ---
	if err := w.validateGasBalance(ctx, gasLimit, gasPrice); err != nil {
		return nil, err
	}

	// Retrieve encrypted key material
	encKey, salt, err := w.loadKeyMaterial()
	if err != nil {
		return nil, err
	}

	// Nonce management: use local pending nonce tracker
	txNonce, err := w.nonceTrack.Next(ctx)
	if err != nil {
		return nil, err
	}

	// Build unsigned transaction
	tip := big.NewInt(1.5e9) // 1.5 gwei priority fee
	unsignedTx, err := w.txb.BuildTransfer(toAddress, micro, txNonce, gasLimit, gasPrice, tip)
	if err != nil {
		w.nonceTrack.Rollback() // Release the reserved nonce
		return nil, err
	}

	// Sign (private key lives and dies inside KeyManager.SignTx)
	signedTx, err := w.km.SignTx(unsignedTx, w.cfg.ChainID, encKey, salt, passphrase)
	if err != nil {
		w.nonceTrack.Rollback()
		return nil, err
	}

	// Broadcast
	if err := w.bcast.Send(ctx, signedTx); err != nil {
		w.nonceTrack.Rollback()
		return nil, err
	}

	// Persist pending tx to DB
	w.db.Lock()
	w.db.Conn().Exec(`
        INSERT INTO pending_txs (tx_hash, nonce, to_address, amount, gas_limit, gas_price, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'))`,
		signedTx.Hash().Hex(), txNonce, toAddress, micro.String(), gasLimit, gasPrice.String())
	w.db.Unlock()

	return &SendResult{TxHash: signedTx.Hash().Hex(), Nonce: txNonce}, nil
}

// --- Queries ---

// GetInfo returns the current wallet state.
func (w *Wallet) GetInfo(ctx context.Context) (*WalletInfo, error) {
	w.db.Lock()
	defer w.db.Unlock()

	var address, usdcBalance, ethBalance string
	var syncedBlock int64

	w.db.Conn().QueryRowContext(ctx, `SELECT address FROM wallet WHERE id = 1`).Scan(&address)
	w.db.Conn().QueryRowContext(ctx, `SELECT balance_wei FROM gas_balance WHERE id = 1`).Scan(&ethBalance)
	w.db.Conn().QueryRowContext(ctx, `SELECT last_block FROM sync_state WHERE id = 1`).Scan(&syncedBlock)

	// Compute USDC balance from transfer history
	usdcBalance = w.computeUSDCBalance(ctx, address)

	return &WalletInfo{
		Address:     address,
		USDCBalance: usdcBalance,
		ETHBalance:  weiToETH(ethBalance),
		SyncedBlock: syncedBlock,
	}, nil
}

// GetTransfers returns cached transfer history, newest first.
func (w *Wallet) GetTransfers(ctx context.Context, limit int) ([]Transfer, error) {
	w.db.Lock()
	defer w.db.Unlock()

	rows, err := w.db.Conn().QueryContext(ctx, `
        SELECT tx_hash, block_number, direction, amount, confirmed_depth
        FROM transfers
        ORDER BY block_number DESC
        LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Transfer
	for rows.Next() {
		var t Transfer
		var depth int
		var amountWei string
		if err := rows.Scan(&t.TxHash, &t.BlockNumber, &t.Direction, &amountWei, &depth); err != nil {
			continue
		}
		t.Amount = microToUSDC(amountWei)
		t.Confirmed = depth >= confirmDepth
		out = append(out, t)
	}
	return out, nil
}

// StartSync starts the background sync goroutine.
func (w *Wallet) StartSync(ctx context.Context) {
	w.sync.Start(ctx)
}

// --- Helpers ---

func (w *Wallet) validateGasBalance(ctx context.Context, gasLimit uint64, gasPrice *big.Int) error {
	required := new(big.Int).Mul(new(big.Int).SetUint64(gasLimit), gasPrice)

	w.db.Lock()
	row := w.db.Conn().QueryRowContext(ctx, `SELECT balance_wei FROM gas_balance WHERE id = 1`)
	w.db.Unlock()

	var balStr string
	if err := row.Scan(&balStr); err != nil {
		return errors.New("ETH balance unavailable — run sync first")
	}

	bal, _ := new(big.Int).SetString(balStr, 10)
	if bal.Cmp(required) < 0 {
		return fmt.Errorf("insufficient gas: have %s wei, need %s wei (gasLimit=%d, gasPrice=%s)",
			balStr, required.String(), gasLimit, gasPrice.String())
	}
	return nil
}

func (w *Wallet) loadKeyMaterial() ([]byte, []byte, error) {
	w.db.Lock()
	defer w.db.Unlock()
	row := w.db.Conn().QueryRow(`SELECT encrypted_key, kdf_salt FROM wallet WHERE id = 1`)
	var encKey, salt []byte
	return encKey, salt, row.Scan(&encKey, &salt)
}

func (w *Wallet) computeUSDCBalance(ctx context.Context, address string) string {
	row := w.db.Conn().QueryRowContext(ctx, `
        SELECT
            COALESCE(SUM(CASE WHEN direction = 'IN' THEN CAST(amount AS INTEGER) ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN direction = 'OUT' THEN CAST(amount AS INTEGER) ELSE 0 END), 0)
        FROM transfers
        WHERE (to_address = ? OR from_address = ?)
          AND confirmed_depth >= ?`,
		address, address, confirmDepth)
	var net int64
	row.Scan(&net)
	return microToUSDC(fmt.Sprintf("%d", net))
}

func weiToETH(wei string) string {
	w, _ := new(big.Int).SetString(wei, 10)
	f := new(big.Float).SetInt(w)
	f.Quo(f, new(big.Float).SetFloat64(1e18))
	return f.Text('f', 6)
}

func microToUSDC(micro string) string {
	m, _ := new(big.Int).SetString(micro, 10)
	f := new(big.Float).SetInt(m)
	f.Quo(f, new(big.Float).SetFloat64(1e6))
	return f.Text('f', 2)
}
