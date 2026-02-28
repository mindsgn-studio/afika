# POCKET MONEY

Pocket Money is a mobile wallet project with a Go core intended for gomobile bindings and React Native integration.

## Core library

The Go wallet library lives in [core/README.md](core/README.md).

It provides:
- Encrypted wallet database (SQLCipher)
- Ethereum wallet creation
- Gomobile-safe facade API in `core/main.go`

## Expo bridge API

The Expo module at `app/modules/core` is a functions-only native bridge to the Go facade.

Exposed methods:
- `initWallet(dataDir, password, masterKeyB64, kdfSaltB64)`
- `closeWallet()`
- `createEthereumWallet(name)`
- `getBalance(network)`
- `listAccounts()`

Notes:
- `masterKeyB64` and `kdfSaltB64` must be base64 strings from secure mobile storage.
- `getBalance` and `listAccounts` return raw JSON strings from Go.
- `sendMoneyTo` is intentionally not exposed yet while implementation is pending.

## Build reference

Reference article:
https://medium.com/@ykanavalik/how-to-run-golang-code-in-your-react-native-android-application-using-expo-go-d4e46438b753
