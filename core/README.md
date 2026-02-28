# Pocket Money Core

A Go wallet core designed to be consumed via gomobile (Android/iOS) and kept agnostic from app UI frameworks.

## Architecture

- `main.go`: gomobile-safe facade (`WalletCore`) that owns DB lifecycle
- `internal/database`: SQLCipher-backed encrypted wallet storage
- `internal/ethereum`: Ethereum wallet generation and balance aggregation

## Public facade (`WalletCore`)

`WalletCore` is the bindable entry point:

- `Init(dataDir, password, masterKeyB64, kdfSaltB64) error`
- `Close() error`
- `CreateEthereumWallet(name string) (string, error)`
- `GetBalance(network string) (string, error)`
- `ListAccounts() (string, error)`
- `SendMoneyTo(blockchain, to, amount string) (string, error)`

Methods return simple strings/JSON payloads and errors to keep gomobile bindings straightforward.

## Expo module mapping

The Expo bridge in `app/modules/core` currently exposes these `WalletCore` methods:

- `Init` as `initWallet(dataDir, password, masterKeyB64, kdfSaltB64)`
- `Close` as `closeWallet()`
- `CreateEthereumWallet` as `createEthereumWallet(name)`
- `GetBalance` as `getBalance(network)`
- `ListAccounts` as `listAccounts()`

`SendMoneyTo` is not exposed yet in the Expo module because the underlying behavior is still a stub.

Bridge contract notes:
- `masterKeyB64` and `kdfSaltB64` are base64 strings provided by iOS Keychain/Android Keystore backed storage.
- `getBalance` and `listAccounts` are returned as raw JSON strings to keep native bridge logic minimal.

## Security model

Database encryption key material is derived from:
- User password
- Device-protected master key
- Stable KDF salt

The mobile app should source the master key and salt from secure platform stores:
- iOS Keychain
- Android Keystore

## Testing

Run from `core/`:

- `go test ./...`
- `go test ./... -race -cover`

## Build

From `core/`:

- `make test`
- `make android`
- `make ios`

## Current limitations

- `SendMoneyTo` is currently a stub and returns "not implemented"
- Balance lookup currently targets configured native-chain endpoints
- Multi-chain abstraction and token support are planned follow-up work
