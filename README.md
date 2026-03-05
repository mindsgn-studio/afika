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
- `getAccountSnapshot(network)`
- `createSmartContractAccount(network)`
- `getSmartContractAccount(network)`
- `listAccounts()`
- `sendUsdc(network, destination, amount, note, providerID)`
- `sendToken(network, tokenIdentifier, destination, amount, note, providerID)`
- `getUsdcTransactions(network, limit, offset)`
- `getTokenTransactions(network, tokenIdentifier, limit, offset)`
- `listAllTransactions(network, limit, offset)`
- `exportBackup(passphrase)`
- `importBackup(payload, passphrase)`

Notes:
- `initWalletSecure` is the recommended production path.
- `masterKeyB64` and `kdfSaltB64` are generated and persisted natively in the module (`iOS Keychain` / `Android Keystore-backed EncryptedSharedPreferences`).
- `getBalance` and `listAccounts` return raw JSON strings from Go.
- Token and account methods return JSON strings to keep the native bridge thin.
- Default network strategy: development -> `ethereum-sepolia`, production -> `ethereum-mainnet`.

## Product direction (banking-first UX)

The product direction is to make the app feel like a normal banking app while keeping crypto complexity inside the Go core.

Current scope focus:
- Chain defaults: Sepolia in development, Ethereum mainnet in production
- Assets: native ETH + fixed ERC20 allowlist (currently `USDC`)
- Smart account: auto-created during onboarding
- UX style: banking language and flows (no crypto-heavy terminology in primary UI)

## Implemented banking-first scope (current)

Go core now includes:
- Smart account lifecycle using deployed factory bindings:
	- create or get deterministic smart account per owner + network
	- persist mapping in SQLCipher DB
- Native + ERC20 transfer support from smart account via `execute(...)`
- Token preflight checks (recipient validation, amount precision, token balance, gas reserve)
- Token snapshot reads for smart account (native + allowlisted ERC20)
- USDC transaction persistence with normalized semantics:
	- Types: `credit`, `debit`, `transfer`
	- States: `pending`, `completed`, `failed`, `reversed`
	- Metadata: note, source, destination, provider id
- Wallet backup export/import with encrypted payload handling in core

App now includes a single-screen flow that demonstrates:
- Open/create wallet
- Smart account creation
- Account snapshot fetch
- Send token action (`native` and `usdc`)
- Backup export/import actions
- All-token transaction list fetch

Testing roadmap:
- Core unit tests for guard paths, state mapping, and DB behavior
- Android/iOS bridge smoke validations
- Maestro end-to-end flows for key user journeys

## Build reference

Reference article:
https://medium.com/@ykanavalik/how-to-run-golang-code-in-your-react-native-android-application-using-expo-go-d4e46438b753


## contracts
🚀 Starting deployment with: 0x73932cc65df8865b10F339D6Ef9dE5E4830C14Ff
✅ Implementation deployed at: 0xFc35f578db9a62C53cBd5c4b983Ab3234E2333f3
✅ Factory deployed at: 0xF547f2c4fe3e1Ea59740CeF4E364cd479478f882

Deployment script now also writes machine-readable metadata to `contract/deployments/<network>.json` for backend config ingestion.

Smart Account DocumentationThis system uses a Universal Upgradeable Proxy Standard (UUPS) pattern. It consists of a "Logic" contract (SmartAccount) and a "Factory" contract (SmartAccountFactory) that deploys ERC1967Proxy instances.1. SmartAccount.sol (The Logic)This contract contains the actual rules for your wallet. It is designed to be "Proxiable," meaning its logic can be swapped out for a newer version in the future without changing your wallet address.Core FunctionsFunctionAccessDescriptioninitialize(address initialOwner)PublicOne-time setup. Sets the initial owner and prepares the UUPS upgrade mechanism. It replaces the standard constructor for proxies.execute(address target, uint256 value, bytes data)Owner OnlyThe "Master" function. Allows the owner to send ETH or call any function on another smart contract. It includes self-call protection and error bubbling.transferERC20(address token, address to, uint256 amount)Owner OnlyA helper function to transfer any ERC-20 tokens held by the account using the SafeERC20 standard.getERC20Balance(address token)Owner OnlyA view function to check the account's balance of a specific token.upgradeToAndCall(address newImpl, bytes data)Owner Only(Inherited) Performs a logic upgrade by pointing the proxy to a new implementation address.Security FeaturesInitializers Disabled: The logic contract's constructor prevents anyone from "taking over" the implementation contract directly._authorizeUpgrade: A strict internal check that ensures only the current owner can trigger an upgrade to a new version.Storage Gap: A reserved uint256[49] __gap prevents storage collisions when adding new variables in future versions.2. SmartAccountFactory.sol (The Deployer)This contract acts as a central hub to create new smart accounts for users.Core FunctionsFunctionAccessDescriptioncreateAccount(address owner)ExternalDeploys a new ERC1967Proxy for the given owner. It uses CREATE2 to ensure the deployment is deterministic.getAddress(address owner)Public ViewPredictable Addresses. Calculates what a user's account address will be before it is even deployed. This allows users to receive funds before "activating" their wallet.updateImplementation(address newImplementation)Factory OwnerUpdates the "Template" implementation used for future account deployments.How It WorksPrediction: The getAddress function combines the salt (hashed owner address) and the creationCode of the proxy to find a unique address.Deployment: When createAccount is called, it checks if the account already exists. If not, it deploys the proxy and immediately calls initialize to lock in the owner.Efficiency: By using a factory, users don't need to deploy the heavy logic themselves; they only deploy a lightweight proxy that points to your implementation.Important EventsExecuted: Emitted every time the wallet performs an action (transferring ETH, interacting with DeFi, etc.).AccountCreated: Emitted by the factory to help indexers and frontends find newly deployed wallets.Upgraded: Emitted when the account logic is successfully swapped for a new version.

Detailed contract explanation is available in `docs/contract.md`.