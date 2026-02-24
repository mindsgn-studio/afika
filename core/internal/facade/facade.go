package facade

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/db"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/keymanager"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/nonce"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/sync"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/txbuilder"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/broadcaster"
)

// WalletInfo is a plain-data struct returned to the UI / gomobile layer.
// All numeric values are strings to avoid precision issues across the FFI boundary.
type WalletInfo struct {
	Address     string
	USDCBalance string // Human-readable, e.g. "100.50"
	ETHBalance  string // Human-readable, e.g. "0.0042"
	SyncedBlock int64
}

// Transfer represents a single cached USDC Transfer log entry.
type Transfer struct {
	TxHash      string
	BlockNumber int64
	Direction   string // "IN" or "OUT"
	Amount      string // Human-readable USDC, e.g. "5.00"
	Confirmed   bool
}

// SendResult is returned after a successful broadcast.
type SendResult struct {
	TxHash string
	Nonce  uint64
}

// Wallet is the App Facade — the single public API consumed by the TUI and the
// gomobile export layer. All mutable state is serialised through db.DB's mutex.
type Wallet struct {
	db         *db.DB
	client     *ethclient.Client // FIX: stored on struct, not accessed via rpcClient()
	km         *keymanager.KeyManager
	txb        *txbuilder.TxBuilder
	syncSvc    *sync.Service
	bcast      *broadcaster.Broadcaster
	nonceTrack *nonce.Tracker
	cfg        *config.Config
}

// New creates a fully wired Wallet facade.
func New(dbPath string, cfg *config.Config) (*Wallet, error) {
	database, err := db.Open(dbPath)
	if err != nil {
		return nil, fmt.Errorf("facade: open db: %w", err)
	}

	// Dial the RPC endpoint and store the client on the struct.
	client, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		database.Close()
		return nil, fmt.Errorf("facade: dial rpc: %w", err)
	}

	txb, err := txbuilder.New(cfg.USDCAddress, cfg.ChainID)
	if err != nil {
		return nil, fmt.Errorf("facade: build txbuilder: %w", err)
	}

	bcast := broadcaster.New(client)
	nt := nonce.NewTracker(client, cfg.UserAddress)
	svc := sync.NewService(database, client, cfg.UserAddress, cfg.USDCAddress)

	return &Wallet{
		db:         database,
		client:     client, // stored here — used directly in methods below
		km:         &keymanager.KeyManager{},
		txb:        txb,
		syncSvc:    svc,
		bcast:      bcast,
		nonceTrack: nt,
		cfg:        cfg,
	}, nil
}

// --- Wallet Lifecycle ---

// CreateWallet generates a fresh mnemonic, derives the Ethereum address,
// encrypts the mnemonic with the given passphrase, and persists the wallet.
// Returns the plaintext mnemonic — the caller MUST display it and then zero it.
func (w *Wallet) CreateWallet(passphrase []byte) (string, error) {
	mnemonic, err := w.km.GenerateMnemonic()
	if err != nil {
		return "", fmt.Errorf("create wallet: generate mnemonic: %w", err)
	}

	address, err := w.km.DeriveAddress(mnemonic)
	if err != nil {
		return "", fmt.Errorf("create wallet: derive address: %w", err)
	}

	ciphertext, salt, err := w.km.EncryptMnemonic(mnemonic, passphrase)
	if err != nil {
		return "", fmt.Errorf("create wallet: encrypt: %w", err)
	}

	w.db.Lock()
	defer w.db.Unlock()
	_, err = w.db.Conn().Exec(`
        INSERT OR REPLACE INTO wallet (id, address, encrypted_key, kdf_salt, created_at)
        VALUES (1, ?, ?, ?, ?)`,
		address, ciphertext, salt, time.Now().Unix())
	if err != nil {
		return "", fmt.Errorf("create wallet: persist: %w", err)
	}

	w.cfg.UserAddress = address
	return mnemonic, nil
}

// ImportWallet restores a wallet from an existing BIP-39 mnemonic.
func (w *Wallet) ImportWallet(mnemonic string, passphrase []byte) error {
	if !w.km.ValidateMnemonic(mnemonic) {
		return errors.New("import wallet: invalid BIP-39 mnemonic")
	}

	address, err := w.km.DeriveAddress(mnemonic)
	if err != nil {
		return fmt.Errorf("import wallet: derive address: %w", err)
	}

	ciphertext, salt, err := w.km.EncryptMnemonic(mnemonic, passphrase)
	if err != nil {
		return fmt.Errorf("import wallet: encrypt: %w", err)
	}

	w.db.Lock()
	defer w.db.Unlock()
	_, err = w.db.Conn().Exec(`
        INSERT OR REPLACE INTO wallet (id, address, encrypted_key, kdf_salt, created_at)
        VALUES (1, ?, ?, ?, ?)`,
		address, ciphertext, salt, time.Now().Unix())
	if err != nil {
		return fmt.Errorf("import wallet: persist: %w", err)
	}

	w.cfg.UserAddress = address
	return nil
}

// --- Send USDC ---

// Send validates gas, constructs, signs, and broadcasts a USDC transfer.
// amountUSDC is a decimal string, e.g. "10.50".
func (w *Wallet) Send(ctx context.Context, toAddress, amountUSDC string, passphrase []byte) (*SendResult, error) {
	// Parse USDC amount → micro-units (6 decimal places).
	amount, ok := new(big.Float).SetPrec(64).SetString(amountUSDC)
	if !ok {
		return nil, errors.New("send: invalid USDC amount")
	}
	micro := new(big.Int)
	new(big.Float).Mul(amount, big.NewFloat(1e6)).Int(micro)
	if micro.Sign() <= 0 {
		return nil, errors.New("send: amount must be positive")
	}

	// FIX: use w.client directly — no rpcClient() method needed.
	gasPrice, err := w.client.SuggestGasPrice(ctx)
	if err != nil {
		return nil, fmt.Errorf("send: fetch gas price: %w", err)
	}

	// --- Gas Paradox Check ---
	// Even though this is a USDC-only wallet, the user needs ETH to pay gas.
	if err := w.validateGasBalance(ctx, config.GasLimit, gasPrice); err != nil {
		return nil, err
	}

	// Load encrypted key material from DB.
	encKey, salt, err := w.loadKeyMaterial()
	if err != nil {
		return nil, fmt.Errorf("send: load key material: %w", err)
	}

	// Reserve a nonce. Rollback on any subsequent error.
	txNonce, err := w.nonceTrack.Next(ctx)
	if err != nil {
		return nil, fmt.Errorf("send: get nonce: %w", err)
	}

	// 1.5 gwei priority fee — sensible for most conditions.
	tip := big.NewInt(1_500_000_000)

	unsignedTx, err := w.txb.BuildTransfer(toAddress, micro, txNonce, config.GasLimit, gasPrice, tip)
	if err != nil {
		w.nonceTrack.Rollback()
		return nil, fmt.Errorf("send: build tx: %w", err)
	}

	// Sign — private key is created and zeroed inside KeyManager.SignTx.
	signedTx, err := w.km.SignTx(unsignedTx, w.cfg.ChainID, encKey, salt, passphrase)
	if err != nil {
		w.nonceTrack.Rollback()
		return nil, fmt.Errorf("send: sign tx: %w", err)
	}

	if err := w.bcast.Send(ctx, signedTx); err != nil {
		w.nonceTrack.Rollback()
		return nil, fmt.Errorf("send: broadcast: %w", err)
	}

	// Persist pending tx for tracking.
	w.db.Lock()
	w.db.Conn().ExecContext(ctx, `
        INSERT INTO pending_txs (tx_hash, nonce, to_address, amount, gas_limit, gas_price, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
		signedTx.Hash().Hex(), txNonce, toAddress, micro.String(),
		config.GasLimit, gasPrice.String(), time.Now().Unix())
	w.db.Unlock()

	return &SendResult{TxHash: signedTx.Hash().Hex(), Nonce: txNonce}, nil
}

// --- Queries ---

// GetInfo returns the current wallet state from the local cache.
func (w *Wallet) GetInfo(ctx context.Context) (*WalletInfo, error) {
	w.db.Lock()
	defer w.db.Unlock()

	var address, ethBalanceWei string
	var syncedBlock int64

	w.db.Conn().QueryRowContext(ctx, `SELECT address FROM wallet WHERE id = 1`).Scan(&address)
	w.db.Conn().QueryRowContext(ctx, `SELECT balance_wei FROM gas_balance WHERE id = 1`).Scan(&ethBalanceWei)
	w.db.Conn().QueryRowContext(ctx, `SELECT last_block FROM sync_state WHERE id = 1`).Scan(&syncedBlock)

	usdcBalance := w.computeUSDCBalance(ctx, address)

	return &WalletInfo{
		Address:     address,
		USDCBalance: usdcBalance,
		ETHBalance:  weiToETH(ethBalanceWei),
		SyncedBlock: syncedBlock,
	}, nil
}

// GetTransfers returns cached transfer history, newest block first.
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
		var amountMicro string
		if err := rows.Scan(&t.TxHash, &t.BlockNumber, &t.Direction, &amountMicro, &depth); err != nil {
			continue
		}
		t.Amount = microToUSDC(amountMicro)
		// FIX: confirmDepth comes from config package — no longer undefined.
		t.Confirmed = depth >= config.ConfirmDepth
		out = append(out, t)
	}
	return out, nil
}

// GetPendingTxs returns transactions that have been broadcast but not yet confirmed.
func (w *Wallet) GetPendingTxs(ctx context.Context) ([]Transfer, error) {
	w.db.Lock()
	defer w.db.Unlock()

	rows, err := w.db.Conn().QueryContext(ctx, `
        SELECT tx_hash, nonce, to_address, amount, status
        FROM pending_txs
        WHERE status = 'pending'
        ORDER BY nonce ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Transfer
	for rows.Next() {
		var txHash, toAddr, amountMicro, status string
		var txNonce int64
		rows.Scan(&txHash, &txNonce, &toAddr, &amountMicro, &status)
		out = append(out, Transfer{
			TxHash:    txHash,
			Direction: "OUT",
			Amount:    microToUSDC(amountMicro),
			Confirmed: false,
		})
	}
	return out, nil
}

// StartSync starts the background sync goroutine. Safe to call multiple times
// (the goroutine checks its stop channel).
func (w *Wallet) StartSync(ctx context.Context) {
	w.syncSvc.Start(ctx)
}

// StopSync stops the background sync goroutine.
func (w *Wallet) StopSync() {
	w.syncSvc.Stop()
}

// Close releases all resources: stops sync and closes the database.
func (w *Wallet) Close() error {
	w.syncSvc.Stop()
	return w.db.Close()
}

// --- Private helpers ---

// validateGasBalance confirms the cached ETH balance covers gasLimit × gasPrice.
// FIX: uses w.client directly; confirmDepth referenced from config package.
func (w *Wallet) validateGasBalance(ctx context.Context, gasLimit uint64, gasPrice *big.Int) error {
	required := new(big.Int).Mul(new(big.Int).SetUint64(gasLimit), gasPrice)

	w.db.Lock()
	row := w.db.Conn().QueryRowContext(ctx, `SELECT balance_wei FROM gas_balance WHERE id = 1`)
	w.db.Unlock()

	var balStr string
	if err := row.Scan(&balStr); err != nil || balStr == "" {
		// Cache miss — fetch live from RPC.
		addr := common.HexToAddress(w.cfg.UserAddress)
		bal, err := w.client.BalanceAt(ctx, addr, nil)
		if err != nil {
			return fmt.Errorf("gas check: cannot fetch ETH balance: %w", err)
		}
		balStr = bal.String()
	}

	bal, ok := new(big.Int).SetString(balStr, 10)
	if !ok {
		return errors.New("gas check: invalid balance in cache")
	}
	if bal.Cmp(required) < 0 {
		return fmt.Errorf("insufficient gas: have %s wei, need %s wei (gasLimit=%d @ %s wei/gas)",
			balStr, required.String(), gasLimit, gasPrice.String())
	}
	return nil
}

func (w *Wallet) loadKeyMaterial() (encKey, salt []byte, err error) {
	w.db.Lock()
	defer w.db.Unlock()
	row := w.db.Conn().QueryRow(`SELECT encrypted_key, kdf_salt FROM wallet WHERE id = 1`)
	err = row.Scan(&encKey, &salt)
	return
}

// computeUSDCBalance sums confirmed IN transfers minus confirmed OUT transfers.
// The db mutex must be held by the caller.
func (w *Wallet) computeUSDCBalance(ctx context.Context, address string) string {
	row := w.db.Conn().QueryRowContext(ctx, `
        SELECT
            COALESCE(SUM(CASE WHEN direction = 'IN'  THEN CAST(amount AS INTEGER) ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN direction = 'OUT' THEN CAST(amount AS INTEGER) ELSE 0 END), 0)
        FROM transfers
        WHERE (to_address = ? OR from_address = ?)
          AND confirmed_depth >= ?`,
		// FIX: confirmDepth from config package — no longer undefined.
		address, address, config.ConfirmDepth)
	var net int64
	row.Scan(&net)
	return microToUSDC(fmt.Sprintf("%d", net))
}

func weiToETH(wei string) string {
	if wei == "" {
		return "0.000000"
	}
	w, ok := new(big.Int).SetString(wei, 10)
	if !ok {
		return "0.000000"
	}
	f := new(big.Float).SetInt(w)
	f.Quo(f, new(big.Float).SetFloat64(1e18))
	return f.Text('f', 6)
}

func microToUSDC(micro string) string {
	m, ok := new(big.Int).SetString(micro, 10)
	if !ok {
		return "0.00"
	}
	f := new(big.Float).SetInt(m)
	f.Quo(f, new(big.Float).SetFloat64(1e6))
	return f.Text('f', 2)
}
