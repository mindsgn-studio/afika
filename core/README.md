# Pocket Money Core

Go wallet core for gomobile (iOS/Android), now with ERC-4337 UserOperation transport and optional self-hosted paymaster sponsorship flow.

## Architecture

- `main.go`
	- gomobile-safe `WalletCore` facade
	- lifecycle ownership of encrypted DB
	- network resolution and response shaping
- `internal/database`
	- SQLCipher encrypted persistence
	- wallet keys, smart account mappings, transaction history
	- UserOp and sponsorship tracking tables
- `internal/config`
	- network deployment metadata (`Factory`, `Implementation`, `EntryPoint`, `BundlerURL`, `Paymaster`)
- `internal/ethereum`
	- chain/token operations
	- smart-account lifecycle
	- UserOperation build/sign/send (`userop.go`)
	- bundler RPC client (`bundler.go`)
	- sponsorship policy helpers (`paymaster.go`)

## Public `WalletCore` API

Core lifecycle:
- `Init(dataDir, password, masterKeyB64, kdfSaltB64) error`
- `Close() error`

Wallet/account:
- `CreateEthereumWallet(name string) (string, error)`
- `OpenOrCreateWallet(name string) (string, error)`
- `ListAccounts() (string, error)`
- `CreateSmartContractAccount(network string) (string, error)`
- `GetSmartContractAccount(network string) (string, error)`

Balances:
- `GetBalance(network string) (string, error)`
- `GetAccountSummary(network string) (string, error)`
- `GetAccountSnapshot(network string) (string, error)`

Transfers:
- `SendUsdc(network, destination, amount, note, providerID string) (string, error)`
- `SendUsdcWithMode(network, destination, amount, note, providerID, sendMode string) (string, error)`
- `SendToken(network, tokenIdentifier, destination, amount, note, providerID string) (string, error)`
- `SendTokenWithMode(network, tokenIdentifier, destination, amount, note, providerID, sendMode string) (string, error)`
- `SendMoneyTo(...)` remains legacy stub.

History/backup:
- `ListUsdcTransactions(network string, limit, offset int) (string, error)`
- `ListTokenTransactions(network, tokenIdentifier string, limit, offset int) (string, error)`
- `ListAllTransactions(network string, limit, offset int) (string, error)`
- `ExportWalletBackup(passphrase string) (string, error)`
- `ImportWalletBackup(payload, passphrase string) (string, error)`

`SendTokenWithMode` supports:
- `auto`: try AA path and fallback to direct tx
- `direct`: force legacy direct tx
- `sponsored`: require sponsorship (no direct fallback)

## Production Configuration Gate

When `POCKET_APP_ENV=production`, `Init(...)` validates AA config for `ethereum-mainnet` and fails fast if missing:
- `FactoryAddress`
- `ImplementationAddress`
- `EntryPointAddress`
- `BundlerURL`
- `PaymasterAddress`

This prevents silent misconfiguration in production releases.

## Expo Bridge Mapping

The Expo module (`app/modules/pocket-module`) exposes the same core methods, including mode-aware transfer methods:
- `sendUsdcWithMode(...)`
- `sendTokenWithMode(...)`

Key contract behavior:
- JSON payloads are returned as strings for stable gomobile boundaries.
- secure init path (`initWalletSecure`) sources key material from iOS Keychain / Android Keystore.

## Security Notes

- DB encryption key uses user password + device master key + KDF salt.
- Core keeps transfer token scope allowlisted (v1 native ETH + USDC).
- Sponsored mode enforces USDC-only policy and strict caps from policy/env.
- UserOp lifecycle persists `userOpHash` and bundler settlement status for auditability.

## Build and Test

From `core/`:
- `go test ./...`
- `go test ./... -race -cover`
- `make test`
- `make android`
- `make ios`

## Current Scope (v1)

- Dev default network: `ethereum-sepolia`
- Prod default network: `ethereum-mainnet`
- Account abstraction target: EntryPoint `v0.7`
- Sponsorship policy: USDC-only with strict caps

Out of scope for v1:
- dynamic token sponsorship expansion
- advanced social recovery modules
- multi-paymaster orchestration
