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
- `getBalance(network)`
- `listAccounts()`

Notes:
- `initWalletSecure` is the recommended production path.
- `masterKeyB64` and `kdfSaltB64` are generated and persisted natively in the module (`iOS Keychain` / `Android Keystore-backed EncryptedSharedPreferences`).
- `getBalance` and `listAccounts` return raw JSON strings from Go.
- `sendMoneyTo` is intentionally not exposed yet while implementation is pending.

## Build reference

Reference article:
https://medium.com/@ykanavalik/how-to-run-golang-code-in-your-react-native-android-application-using-expo-go-d4e46438b753
