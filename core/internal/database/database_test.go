package database

import (
	"context"
	"testing"
)

type testSecureKeyStore struct {
	masterKey []byte
	salt      []byte
}

func (t *testSecureKeyStore) GetOrCreateMasterKey(_ context.Context) ([]byte, error) {
	return append([]byte(nil), t.masterKey...), nil
}

func (t *testSecureKeyStore) GetOrCreateKDFSalt(_ context.Context) ([]byte, error) {
	return append([]byte(nil), t.salt...), nil
}

func newTestSecureKeyStore() *testSecureKeyStore {
	return &testSecureKeyStore{
		masterKey: []byte("0123456789abcdef0123456789abcdef"),
		salt:      []byte("abcdef0123456789"),
	}
}

func TestOpenInsertListWalletLifecycle(t *testing.T) {
	dir := t.TempDir()
	ctx := context.Background()

	db, err := Open(ctx, dir, "password-1", newTestSecureKeyStore())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	exists, err := db.WalletExists(ctx)
	if err != nil {
		t.Fatalf("WalletExists() error = %v", err)
	}
	if exists {
		t.Fatalf("expected no wallets at start")
	}

	err = db.InsertWallet(ctx, "ethereum", "Primary", "0x123", []byte("encrypted-key"))
	if err != nil {
		t.Fatalf("InsertWallet() error = %v", err)
	}

	exists, err = db.WalletExists(ctx)
	if err != nil {
		t.Fatalf("WalletExists() error = %v", err)
	}
	if !exists {
		t.Fatalf("expected wallet to exist")
	}

	wallets, err := db.ListWallets(ctx)
	if err != nil {
		t.Fatalf("ListWallets() error = %v", err)
	}
	if len(wallets) != 1 {
		t.Fatalf("expected 1 wallet, got %d", len(wallets))
	}
	if wallets[0].WalletType != "ethereum" {
		t.Fatalf("unexpected wallet type: %s", wallets[0].WalletType)
	}
	if wallets[0].Address != "0x123" {
		t.Fatalf("unexpected wallet address: %s", wallets[0].Address)
	}
}

func TestOpenFailsWithNilKeystore(t *testing.T) {
	_, err := Open(context.Background(), t.TempDir(), "password", nil)
	if err == nil {
		t.Fatalf("expected error for nil keystore")
	}
}

func TestOpenFailsWithWrongKeyMaterial(t *testing.T) {
	dir := t.TempDir()
	ctx := context.Background()

	first, err := Open(ctx, dir, "password", &testSecureKeyStore{
		masterKey: []byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
		salt:      []byte("1111111111111111"),
	})
	if err != nil {
		t.Fatalf("first Open() error = %v", err)
	}
	if err := first.InsertWallet(ctx, "ethereum", "Primary", "0xabc", []byte("k")); err != nil {
		t.Fatalf("InsertWallet() error = %v", err)
	}
	_ = first.Close()

	_, err = Open(ctx, dir, "password", &testSecureKeyStore{
		masterKey: []byte("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
		salt:      []byte("2222222222222222"),
	})
	if err == nil {
		t.Fatalf("expected Open() to fail with wrong key material")
	}
}

func TestInsertWalletValidation(t *testing.T) {
	var db DB
	ctx := context.Background()

	if err := db.InsertWallet(ctx, "", "", "", nil); err == nil {
		t.Fatalf("expected validation error for uninitialized db")
	}
}
