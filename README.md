# Pocket Money

Pocket Money is a mobile wallet project with a Go core (`gomobile`), native Expo bridges (iOS/Android), and an ERC-4337 smart-account + paymaster contract stack.

## Monorepo map

- `core/`: Go wallet core (SQLCipher persistence, smart-account orchestration, token send flows)
- `app/`: Expo app + native bridge module (`modules/pocket-module`)
- `contract/`: Hardhat contracts, tests, and deployment scripts
- `docs/`: architecture notes, implementation logs, active tasks

## Current network defaults

- Development default network: `ethereum-sepolia`
- Production default network: `ethereum-mainnet`
- Default asset scope in app/core: `native` and `usdc`

## Sepolia deployment (current)

- `implementation`: `0xF8b10Fc20F1eC48c37234007a675453fC0f92152`
- `factory`: `0xFD6EacA961d88FF0422898CDBb284f963D613369`
- `entryPoint`: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- `usdc`: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- `paymaster`: `0x7F1BE467e9f0c2731ab9E8a646cF5972E71A66d8`

Source of truth: `contract/deployments/sepolia.json`.

## Core API surface (bridge-facing)

The Expo bridge (`PocketCore`) exposes the `WalletCore` facade methods, including:

- `initWallet(dataDir, password, masterKeyB64, kdfSaltB64)`
- `initWalletSecure(dataDir, password)`
- `closeWallet()`
- `openOrCreateWallet(name)`
- `createEthereumWallet(name)`
- `getAccountSummary(network)`
- `getAccountSnapshot(network)`
- `getAAReadiness(network)`
- `createSmartContractAccount(network)`
- `getSmartContractAccount(network)`
- `sendUsdcWithMode(network, destination, amount, note, providerID, sendMode)`
- `sendTokenWithMode(network, tokenIdentifier, destination, amount, note, providerID, sendMode)`
- `listAllTransactions(network, limit, offset)`
- `exportBackup(passphrase)`
- `importBackup(payload, passphrase)`

`sendMode` supports `auto`, `direct`, and `sponsored`.

## AA and paymaster config

Core deployment config is loaded from defaults with env override precedence.

Pattern:

- `POCKET_FACTORY_<NETWORK>`
- `POCKET_IMPLEMENTATION_<NETWORK>`
- `POCKET_ENTRY_POINT_<NETWORK>`
- `POCKET_BUNDLER_URL_<NETWORK>`
- `POCKET_PAYMASTER_<NETWORK>`

Example network suffixes:

- `ETHEREUM_SEPOLIA`
- `ETHEREUM_MAINNET`

Sponsorship mode requires EntryPoint + bundler + paymaster configuration.

## Validation commands

### Contracts

```bash
cd contract
npm test
```

### Go core

```bash
cd core
go test ./...
```

### Expo app TypeScript

```bash
cd app
npm run lint
npx tsc --noEmit
```

## More docs

- Contract architecture: `docs/contract.md`
- Working notes: `docs/notes.md`
- Active task list: `docs/tasks.md`
- Core internals: `core/README.md`
