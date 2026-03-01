# POCKET MONEY

Pocket Money is a mobile wallet project with a Go core intended for gomobile bindings and React Native integration.

## Core library

The Go wallet library lives in [core/README.md](core/README.md).

It provides:
- Encrypted wallet database (SQLCipher)
- Ethereum wallet creation
- Gomobile-safe facade API in `core/main.go`

## Expo bridge API

The Expo module at `app/modules/pocket-module` is a functions-only native bridge to the Go facade.

Exposed methods:
- `initWallet(dataDir, password, masterKeyB64, kdfSaltB64)`
- `initWalletSecure(dataDir, password)`
- `closeWallet()`
- `createEthereumWallet(name)`
- `openOrCreateWallet(name)`
- `getBalance(network)`
- `getAccountSummary(network)`
- `listAccounts()`
- `sendUsdc(network, destination, amount, note, providerID)`
- `getUsdcTransactions(network, limit, offset)`
- `exportBackup(passphrase)`
- `importBackup(payload, passphrase)`

Notes:
- `initWalletSecure` is the recommended production path.
- `masterKeyB64` and `kdfSaltB64` are generated and persisted natively in the module (`iOS Keychain` / `Android Keystore-backed EncryptedSharedPreferences`).
- `getBalance` and `listAccounts` return raw JSON strings from Go.
- USDC methods return JSON strings to keep the native bridge thin.
- Network defaults in core normalize `mainnet`/`gnosis` to `gnosis-mainnet` for the USDC flow.

## Product direction (banking-first UX)

The product direction is to make the app feel like a normal banking app while keeping crypto complexity inside the Go core.

Current scope focus:
- Chain: Gnosis only
- Asset: USDC only
- UX style: banking language and flows (no crypto-heavy terminology in primary UI)

## Implemented banking-first scope (current)

Go core now includes:
- Gnosis + USDC transfer support with preflight checks (recipient validation, positive amount, USDC balance, gas reserve)
- USDC-only account summary via ERC-20 `balanceOf`
- USDC transaction persistence with normalized semantics:
	- Types: `credit`, `debit`, `transfer`
	- States: `pending`, `completed`, `failed`, `reversed`
	- Metadata: note, source, destination, provider id
- Wallet backup export/import with encrypted payload handling in core

App now includes a single-screen flow that demonstrates:
- Open/create wallet
- Account summary fetch
- Send USDC action
- Backup export/import actions
- Transaction list fetch

Testing roadmap:
- Core unit tests for guard paths, state mapping, and DB behavior
- Android/iOS bridge smoke validations
- Maestro end-to-end flows for key user journeys

## Build reference

Reference article:
https://medium.com/@ykanavalik/how-to-run-golang-code-in-your-react-native-android-application-using-expo-go-d4e46438b753
