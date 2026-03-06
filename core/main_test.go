package core

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"
)

func testKeyMaterial() (string, string) {
	masterKey := base64.StdEncoding.EncodeToString([]byte("0123456789abcdef0123456789abcdef"))
	salt := base64.StdEncoding.EncodeToString([]byte("abcdef0123456789"))
	return masterKey, salt
}

func TestWalletCoreRequiresInit(t *testing.T) {
	wallet := NewWalletCore()

	if _, err := wallet.ListAccounts(); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected ErrNotInitialized from ListAccounts, got %v", err)
	}
	if _, err := wallet.CreateEthereumWallet("Primary"); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected ErrNotInitialized from CreateEthereumWallet, got %v", err)
	}
	if _, err := wallet.GetBalance("testnet"); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected ErrNotInitialized from GetBalance, got %v", err)
	}
}

func TestWalletCoreInitCreateAndList(t *testing.T) {
	wallet := NewWalletCore()
	masterKey, salt := testKeyMaterial()

	if err := wallet.Init(t.TempDir(), "password", masterKey, salt); err != nil {
		t.Fatalf("Init() error = %v", err)
	}
	defer wallet.Close()

	address, err := wallet.CreateEthereumWallet("Primary")
	if err != nil {
		t.Fatalf("CreateEthereumWallet() error = %v", err)
	}
	if address == "" {
		t.Fatalf("expected non-empty address")
	}

	accountsJSON, err := wallet.ListAccounts()
	if err != nil {
		t.Fatalf("ListAccounts() error = %v", err)
	}

	var accounts []map[string]any
	if err := json.Unmarshal([]byte(accountsJSON), &accounts); err != nil {
		t.Fatalf("accounts JSON unmarshal error = %v", err)
	}
	if len(accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(accounts))
	}
}

func TestWalletCoreSendMoneyStub(t *testing.T) {
	wallet := NewWalletCore()
	masterKey, salt := testKeyMaterial()
	if err := wallet.Init(t.TempDir(), "password", masterKey, salt); err != nil {
		t.Fatalf("Init() error = %v", err)
	}
	defer wallet.Close()

	_, err := wallet.SendMoneyTo("ethereum", "0x1", "1")
	if err == nil {
		t.Fatalf("expected not implemented error")
	}
}

func TestWalletCoreGetAAReadiness(t *testing.T) {
	wallet := NewWalletCore()
	masterKey, salt := testKeyMaterial()
	if err := wallet.Init(t.TempDir(), "password", masterKey, salt); err != nil {
		t.Fatalf("Init() error = %v", err)
	}
	defer wallet.Close()

	t.Setenv("POCKET_BUNDLER_URL_ETHEREUM_SEPOLIA", "https://bundler.example")

	raw, err := wallet.GetAAReadiness("sepolia")
	if err != nil {
		t.Fatalf("GetAAReadiness() error = %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatalf("readiness JSON unmarshal error = %v", err)
	}

	if payload["network"] != "ethereum-sepolia" {
		t.Fatalf("unexpected network: %v", payload["network"])
	}
	if payload["entryPointConfigured"] != true {
		t.Fatalf("expected entryPointConfigured=true, got %v", payload["entryPointConfigured"])
	}
	if payload["bundlerConfigured"] != true {
		t.Fatalf("expected bundlerConfigured=true, got %v", payload["bundlerConfigured"])
	}
	if payload["paymasterConfigured"] != true {
		t.Fatalf("expected paymasterConfigured=true, got %v", payload["paymasterConfigured"])
	}
	if payload["sponsorshipReady"] != true {
		t.Fatalf("expected sponsorshipReady=true, got %v", payload["sponsorshipReady"])
	}
}
