package core

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"sync"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/database"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/ethereum"
)

var ErrNotInitialized = errors.New("wallet core is not initialized")

type WalletCore struct {
	mu sync.RWMutex
	db *database.DB
}

type staticSecureKeyStore struct {
	masterKey []byte
	salt      []byte
}

func (s *staticSecureKeyStore) GetOrCreateMasterKey(_ context.Context) ([]byte, error) {
	return append([]byte(nil), s.masterKey...), nil
}

func (s *staticSecureKeyStore) GetOrCreateKDFSalt(_ context.Context) ([]byte, error) {
	return append([]byte(nil), s.salt...), nil
}

func NewWalletCore() *WalletCore {
	return &WalletCore{}
}

func (w *WalletCore) Init(dataDir, password, masterKeyB64, kdfSaltB64 string) error {
	masterKey, err := base64.StdEncoding.DecodeString(masterKeyB64)
	if err != nil {
		return err
	}

	salt, err := base64.StdEncoding.DecodeString(kdfSaltB64)
	if err != nil {
		return err
	}

	keystore := &staticSecureKeyStore{
		masterKey: masterKey,
		salt:      salt,
	}

	db, err := database.Open(context.Background(), dataDir, password, keystore)
	if err != nil {
		return err
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	if w.db != nil {
		_ = w.db.Close()
	}
	w.db = db

	return nil
}

func (w *WalletCore) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.db == nil {
		return nil
	}

	err := w.db.Close()
	w.db = nil
	return err
}

func (w *WalletCore) CreateEthereumWallet(name string) (string, error) {
	db, err := w.getDB()
	if err != nil {
		return "", err
	}

	return ethereum.CreateNewEthereumWallet(context.Background(), db, name)
}

func (w *WalletCore) GetBalance(network string) (string, error) {
	db, err := w.getDB()
	if err != nil {
		return "", err
	}

	balances, err := ethereum.GetTotalBalance(context.Background(), db, network)
	if err != nil {
		return "", err
	}

	encoded, err := json.Marshal(balances)
	if err != nil {
		return "", err
	}

	return string(encoded), nil
}

func (w *WalletCore) ListAccounts() (string, error) {
	db, err := w.getDB()
	if err != nil {
		return "", err
	}

	accounts, err := db.ListWallets(context.Background())
	if err != nil {
		return "", err
	}

	encoded, err := json.Marshal(accounts)
	if err != nil {
		return "", err
	}

	return string(encoded), nil
}

func (w *WalletCore) SendMoneyTo(_ string, _ string, _ string) (string, error) {
	if _, err := w.getDB(); err != nil {
		return "", err
	}

	return "", errors.New("send money is not implemented")
}

func (w *WalletCore) getDB() (*database.DB, error) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	if w.db == nil {
		return nil, ErrNotInitialized
	}

	return w.db, nil
}
