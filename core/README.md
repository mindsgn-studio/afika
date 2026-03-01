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
- `OpenOrCreateWallet(name string) (string, error)`
- `GetBalance(network string) (string, error)`
- `GetAccountSummary(network string) (string, error)`
- `ListAccounts() (string, error)`
- `SendMoneyTo(blockchain, to, amount string) (string, error)`
- `SendUsdc(network, destination, amount, note, providerID string) (string, error)`
- `ListUsdcTransactions(network string, limit, offset int) (string, error)`
- `ExportWalletBackup(passphrase string) (string, error)`
- `ImportWalletBackup(payload, passphrase string) (string, error)`

Methods return simple strings/JSON payloads and errors to keep gomobile bindings straightforward.

## Expo module mapping

The Expo bridge in `app/modules/pocket-module` currently exposes these `WalletCore` methods:

- `Init` as `initWallet(dataDir, password, masterKeyB64, kdfSaltB64)`
- `Init` as `initWalletSecure(dataDir, password)`
- `Close` as `closeWallet()`
- `CreateEthereumWallet` as `createEthereumWallet(name)`
- `OpenOrCreateWallet` as `openOrCreateWallet(name)`
- `GetBalance` as `getBalance(network)`
- `GetAccountSummary` as `getAccountSummary(network)`
- `ListAccounts` as `listAccounts()`
- `SendUsdc` as `sendUsdc(network, destination, amount, note, providerID)`
- `ListUsdcTransactions` as `getUsdcTransactions(network, limit, offset)`
- `ExportWalletBackup` as `exportBackup(passphrase)`
- `ImportWalletBackup` as `importBackup(payload, passphrase)`

`SendMoneyTo` remains a legacy stub and is superseded by `SendUsdc` for current banking-first flows.

Bridge contract notes:
- `initWalletSecure` generates and persists key material natively in iOS Keychain and Android Keystore-backed EncryptedSharedPreferences.
- `initWallet` remains available for explicit/manual key material initialization in migration and testing scenarios.
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

- `SendMoneyTo` remains a stub and returns "not implemented"
- Current productized send/balance flow is intentionally scoped to USDC on Gnosis
- Multi-chain abstraction and additional asset support are follow-up work

## Banking-first roadmap (Gnosis + USDC)

Execution scope is intentionally narrow to ship a reliable first version:
- Network: Gnosis (`chainId: 100`)
- Asset: USDC only
- Goal: expose normalized banking-friendly outputs to the app layer

Implemented core domain additions:
- Account summary model
- Transaction model with normalized semantics:
	- Types: `credit`, `debit`, `transfer`
	- States: `pending`, `completed`, `failed`, `reversed`
	- Metadata: note, source, destination, provider id

Implemented phases:
1. Extended DB schema with transaction ledger and metadata fields.
2. Added Gnosis network constants and USDC contract support.
3. Implemented USDC-only balance via ERC-20 `balanceOf`.
4. Implemented `SendUsdc` with preflight validation:
	 - positive amount
	 - valid recipient
	 - sufficient USDC balance
	 - sufficient gas token reserve
5. Persisted outgoing transactions as `pending` and update to terminal state via status sync.
6. Added USDC transaction listing with normalized output.
7. Added backup export/import interfaces in core (encrypted payload only).

Bridge/app mapping target:
- The Expo module should expose high-level methods (open/create wallet, account summary, send USDC, tx history, backup) and keep chain specifics hidden from UI.
