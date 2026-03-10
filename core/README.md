# Pocket Money Core

Go wallet core for gomobile (iOS/Android), with ERC-4337 UserOperation transport and optional paymaster sponsorship.

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

## Backend API Direction

Phase 1 backend service is planned in `core/cmd/api` to reuse current domain logic.

Initial backend endpoint scope:

- `POST /v1/aa/readiness`
- `POST /v1/aa/create-sponsored`
- `POST /v1/aa/send-sponsored`
- `GET /health`

Why this is the current best decision:

- fastest path to production for sponsorship flows
- avoids rule duplication across client and server
- keeps one source of truth for AA/policy behavior while contracts stabilize

## Public `WalletCore` API

Core lifecycle:
- `Init(dataDir, password, masterKeyB64, kdfSaltB64) error`
- `Close() error`

Wallet/account:
- `CreateEthereumWallet(name string) (string, error)`
- `OpenOrCreateWallet(name string) (string, error)`
- `ListAccounts() (string, error)`
- `GetSmartAccountCreationReadiness(network string) (string, error)`
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

Smart-account creation behavior:
- preflight checks owner gas threshold + sponsorship availability
- sponsored UserOp deployment is attempted first when available
- direct factory fallback is allowed only when owner has sufficient native gas
- deterministic error is returned when both paths are unavailable

Sponsored path behavior:
- sponsored creation and sponsored send both build signed `paymasterAndData` payloads
- readiness marks sponsorship unavailable when paymaster signer key is missing
- user-operation settlement links `userOpHash` to final included `txHash` for history consistency

## Production Configuration Gate

When `EXPO_PUBLIC_POCKET_APP_ENV=production`, `Init(...)` validates AA config for `ethereum-mainnet` and fails fast if missing:
- `FactoryAddress`
- `ImplementationAddress`
- `EntryPointAddress`
- `BundlerURL`
- `PaymasterAddress`

This prevents silent misconfiguration in production releases.

For Expo mobile builds, these values should be supplied through `app/eas.json` profile `env` entries.
Current project convention is to keep all `EXPO_PUBLIC_POCKET_*` keys present in each profile and replace placeholders before release.

## Expo Bridge Mapping

The Expo module (`app/modules/pocket-module`) exposes the same core methods, including mode-aware transfer methods:
- `sendUsdcWithMode(...)`
- `sendTokenWithMode(...)`

Key behavior:
- JSON payloads are returned as strings for stable gomobile boundaries.
- secure init path (`initWalletSecure`) sources key material from iOS Keychain / Android Keystore.

## Security Notes

- DB encryption key uses user password + device master key + KDF salt.
- Core keeps transfer token scope allowlisted (v1 native ETH + USDC).
- Sponsored mode enforces USDC-only policy and strict caps from policy/env.
- UserOp lifecycle persists `userOpHash` and bundler settlement status for auditability.

## Sponsorship Environment

Signer key:
- `EXPO_PUBLIC_POCKET_PAYMASTER_SIGNER_PRIVATE_KEY_<NETWORK>`
- `EXPO_PUBLIC_POCKET_PAYMASTER_SIGNER_PRIVATE_KEY` (fallback)

Policy and reliability controls:
- `EXPO_PUBLIC_POCKET_PAYMASTER_DAILY_OP_LIMIT_<NETWORK>` (default `50`)
- `EXPO_PUBLIC_POCKET_BUNDLER_RETRY_MAX_ATTEMPTS` (default `3`)
- `EXPO_PUBLIC_POCKET_BUNDLER_RETRY_BACKOFF_MS` (default `400`)

If the signer key is missing, sponsored mode is rejected with a deterministic configuration error.

Security migration note:

- paymaster signer keys should move to backend-only env and not remain in app-visible `EXPO_PUBLIC_*` configuration.
- mobile should call backend sponsorship endpoints and retain direct-send fallback locally.

## Creation Gas Threshold Policy

Owner wallet minimum native gas for direct creation uses network defaults and can be overridden with:
- `EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_SEPOLIA`
- `EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_MAINNET`

## Build and Test

From `core/`:
- `go test ./...`
- `go test ./... -race -cover`
- `make test`
- `make android`
- `make ios`

Planned backend targets:

- `make api` (build API binary)
- `make run-api` (run API locally)

## Current Scope (v1)

- Dev default network: `ethereum-sepolia`
- Prod default network: `ethereum-mainnet`
- Account abstraction target: EntryPoint `v0.7`
- Sponsorship policy: USDC-only with strict caps

Out of scope for v1:
- dynamic token sponsorship expansion
- advanced social recovery modules
- multi-paymaster orchestration
