// internal/keymanager/keymanager.go
package keymanager

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"io"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/core/types"
	hdwallet "github.com/miguelmota/go-ethereum-hdwallet"
	"github.com/tyler-smith/go-bip39"
	"golang.org/x/crypto/argon2"
)

const (
	// BIP-44 derivation path for Ethereum account index 0
	DerivationPath = "m/44'/60'/0'/0/0"

	// Argon2id parameters (OWASP recommended minimum)
	argonTime    = 1
	argonMemory  = 64 * 1024 // 64 MB
	argonThreads = 4
	argonKeyLen  = 32 // AES-256
	argonSaltLen = 16
)

// KeyManager handles mnemonic generation, key derivation, encrypted storage,
// and transaction signing. It never exposes private key material outside this package.
type KeyManager struct{}

// GenerateMnemonic creates a new 24-word BIP-39 mnemonic (256-bit entropy).
func (km *KeyManager) GenerateMnemonic() (string, error) {
	entropy, err := bip39.NewEntropy(256)
	if err != nil {
		return "", err
	}
	defer zeroBytes(entropy)
	return bip39.NewMnemonic(entropy)
}

// DeriveAddress returns the Ethereum address for a given mnemonic using BIP-44.
// The mnemonic string is intentionally not zeroed here — caller is responsible.
func (km *KeyManager) DeriveAddress(mnemonic string) (string, error) {
	wallet, err := hdwallet.NewFromMnemonic(mnemonic)
	if err != nil {
		return "", err
	}
	path := accounts.MustParseDerivationPath(DerivationPath)
	account, err := wallet.Derive(path, false)
	if err != nil {
		return "", err
	}
	return account.Address.Hex(), nil
}

// EncryptMnemonic derives an AES-256-GCM key from passphrase via Argon2id,
// then encrypts the mnemonic. Returns (ciphertext, salt).
func (km *KeyManager) EncryptMnemonic(mnemonic string, passphrase []byte) ([]byte, []byte, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, nil, err
	}

	aesKey := argon2.IDKey(passphrase, salt, argonTime, argonMemory, argonThreads, argonKeyLen)
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

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, salt, nil
}

// DecryptMnemonic is the inverse of EncryptMnemonic. Returns mnemonic bytes.
// Caller MUST zero the returned slice after use.
func (km *KeyManager) DecryptMnemonic(ciphertext, salt, passphrase []byte) ([]byte, error) {
	aesKey := argon2.IDKey(passphrase, salt, argonTime, argonMemory, argonThreads, argonKeyLen)
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
		return nil, errors.New("ciphertext too short")
	}
	nonce, ct := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return gcm.Open(nil, nonce, ct, nil)
}

// SignTx derives the private key from the decrypted mnemonic, signs the
// transaction, and immediately zeros all secret material.
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
	path := accounts.MustParseDerivationPath(DerivationPath)
	account, err := wallet.Derive(path, false)
	if err != nil {
		return nil, err
	}

	privateKey, err := wallet.PrivateKey(account)
	if err != nil {
		return nil, err
	}
	defer zeroBytes(privateKey.D.Bytes())

	signer := types.NewLondonSigner(bigInt(chainID))
	return types.SignTx(tx, signer, privateKey)
}

// zeroBytes overwrites a byte slice with zeros to clear secret material.
func zeroBytes(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

func bigInt(n int64) *big.Int {
	return new(big.Int).SetInt64(n)
}
