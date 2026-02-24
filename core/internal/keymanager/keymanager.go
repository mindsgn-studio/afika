package keymanager

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"io"
	"math/big"

	// go-ethereum HD wallet: provides accounts.DerivationPath and MustParseDerivationPath
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	hdwallet "github.com/miguelmota/go-ethereum-hdwallet"
	bip39 "github.com/tyler-smith/go-bip39"
	"golang.org/x/crypto/argon2"
)

const (
	// DerivationPath is the BIP-44 path for Ethereum account index 0.
	DerivationPath = "m/44'/60'/0'/0/0"

	// Argon2id parameters — OWASP recommended minimums for 2024.
	argonTime    = 1
	argonMemory  = 64 * 1024 // 64 MB
	argonThreads = 4
	argonKeyLen  = 32 // AES-256
	argonSaltLen = 16
)

// KeyManager handles BIP-39/44 key generation, AES-GCM encrypted storage,
// and transaction signing. It is the ONLY component that ever touches raw
// private key bytes. All secret material is zeroed immediately after use.
type KeyManager struct{}

// GenerateMnemonic creates a new cryptographically random 24-word BIP-39
// mnemonic (256-bit entropy).
func (km *KeyManager) GenerateMnemonic() (string, error) {
	entropy, err := bip39.NewEntropy(256)
	if err != nil {
		return "", err
	}
	defer zeroBytes(entropy)
	return bip39.NewMnemonic(entropy)
}

// DeriveAddress returns the Ethereum address for the given mnemonic using
// the BIP-44 derivation path m/44'/60'/0'/0/0.
//
// Note: accounts.MustParseDerivationPath is defined in
// github.com/ethereum/go-ethereum/accounts and panics on invalid paths.
// Our constant DerivationPath is well-known and safe.
func (km *KeyManager) DeriveAddress(mnemonic string) (string, error) {
	wallet, err := hdwallet.NewFromMnemonic(mnemonic)
	if err != nil {
		return "", err
	}

	// accounts.MustParseDerivationPath is from "github.com/ethereum/go-ethereum/accounts"
	// It converts the BIP-44 string path into an accounts.DerivationPath ([]uint32).
	// path := accounts.MustParseDerivationPath(DerivationPath)
	path, err := accounts.ParseDerivationPath(DerivationPath)
	if err != nil {
		return "", err
	}

	account, err := wallet.Derive(path, false)
	if err != nil {
		return "", err
	}
	return account.Address.Hex(), nil
}

// ValidateMnemonic returns true if the given mnemonic is a valid BIP-39 phrase.
func (km *KeyManager) ValidateMnemonic(mnemonic string) bool {
	return bip39.IsMnemonicValid(mnemonic)
}

// EncryptMnemonic derives an AES-256-GCM key from passphrase via Argon2id,
// then encrypts the mnemonic. Returns (ciphertext, salt, error).
// The caller must store both ciphertext and salt; salt is NOT secret.
func (km *KeyManager) EncryptMnemonic(mnemonic string, passphrase []byte) (ciphertext, salt []byte, err error) {
	salt = make([]byte, argonSaltLen)
	if _, err = io.ReadFull(rand.Reader, salt); err != nil {
		return nil, nil, err
	}

	aesKey := deriveKey(passphrase, salt)
	defer zeroBytes(aesKey)

	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, err
	}

	plaintext := []byte(mnemonic)
	defer zeroBytes(plaintext)

	// Seal appends the ciphertext + GCM auth tag to nonce prefix.
	ciphertext = gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, salt, nil
}

// DecryptMnemonic is the inverse of EncryptMnemonic.
// IMPORTANT: The caller MUST zero the returned []byte after use:
//
//	defer keymanager.ZeroBytes(mnemonic)
func (km *KeyManager) DecryptMnemonic(ciphertext, salt, passphrase []byte) ([]byte, error) {
	if len(ciphertext) == 0 || len(salt) == 0 {
		return nil, errors.New("keymanager: ciphertext and salt must not be empty")
	}

	aesKey := deriveKey(passphrase, salt)
	defer zeroBytes(aesKey)

	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("keymanager: ciphertext too short")
	}
	nonce, ct := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return gcm.Open(nil, nonce, ct, nil)
}

// SignTx derives the private key from the decrypted mnemonic, signs the
// transaction, and zeros all secret material before returning.
// The Transaction Builder provides the unsigned tx; private keys never leave
// this function.
func (km *KeyManager) SignTx(
	tx *types.Transaction,
	chainID int64,
	encryptedMnemonic, salt, passphrase []byte,
) (*types.Transaction, error) {
	mnemonicBytes, err := km.DecryptMnemonic(encryptedMnemonic, salt, passphrase)
	if err != nil {
		return nil, err
	}
	defer zeroBytes(mnemonicBytes)

	wallet, err := hdwallet.NewFromMnemonic(string(mnemonicBytes))
	if err != nil {
		return nil, err
	}

	// accounts.MustParseDerivationPath — same import as DeriveAddress above.
	path, err := accounts.ParseDerivationPath(DerivationPath)
	if err != nil {
		return nil, err
	}

	account, err := wallet.Derive(path, false)
	if err != nil {
		return nil, err
	}

	privateKey, err := wallet.PrivateKey(account)
	if err != nil {
		return nil, err
	}
	// crypto.FromECDSA returns a copy; zero both.
	privBytes := crypto.FromECDSA(privateKey)
	defer zeroBytes(privBytes)
	// Also zero the big.Int backing the key.
	defer privateKey.D.SetInt64(0)

	signer := types.NewLondonSigner(big.NewInt(chainID))
	return types.SignTx(tx, signer, privateKey)
}

// ZeroBytes overwrites a byte slice with zeros. Exported so callers of
// DecryptMnemonic can zero returned secrets.
func ZeroBytes(b []byte) { zeroBytes(b) }

// --- private helpers ---

func deriveKey(passphrase, salt []byte) []byte {
	return argon2.IDKey(passphrase, salt, argonTime, argonMemory, argonThreads, argonKeyLen)
}

func zeroBytes(b []byte) {
	for i := range b {
		b[i] = 0
	}
}
