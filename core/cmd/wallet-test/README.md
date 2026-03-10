# wallet-test

End-to-end **on-chain** Sepolia wallet creation test harness for Pocket Money Core.

This CLI can run two flows:

- **local**: uses the Go `WalletCore` library directly to create an owner EOA and deploy the SmartAccount.
- **backend**: calls the backend API (`/v1/aa/readiness`, `/v1/aa/create-sponsored`, `/v1/aa/send-sponsored`) and signs the returned UserOperation using the local owner key.

## Prerequisites

Set Sepolia AA config via env vars (same names used by the app/core):

- `EXPO_PUBLIC_POCKET_FACTORY_ETHEREUM_SEPOLIA`
- `EXPO_PUBLIC_POCKET_IMPLEMENTATION_ETHEREUM_SEPOLIA`
- `EXPO_PUBLIC_POCKET_ENTRY_POINT_ETHEREUM_SEPOLIA`
- `EXPO_PUBLIC_POCKET_PAYMASTER_ETHEREUM_SEPOLIA`
- `EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_SEPOLIA` (**must be a bundler URL**, not a normal RPC)

If you want the **sponsored** path to work (paymaster signatures):

- `EXPO_PUBLIC_POCKET_PAYMASTER_SIGNER_PRIVATE_KEY_ETHEREUM_SEPOLIA` (or the non-suffixed variant)

Also ensure:

- The paymaster has ETH deposited in the EntryPoint (e.g. `EntryPoint.depositTo(paymaster)`).

## Run (local mode)

From `core/`:

```bash
go run ./cmd/wallet-test \
  --mode=local \
  --network=ethereum-sepolia \
  --data-dir=./tmp/wallet-test \
  --password='test-password'
```

This prints:

- `ownerAddress=...`
- `creationReadiness=...` (JSON string)
- `createSmartContractAccount=...` (JSON string)
- `onchainHasCode=true accountAddress=...` (best-effort)

## Run (backend mode)

Start the API first (in another terminal), from `core/`:

```bash
go run ./cmd/api
```

Then run:

```bash
go run ./cmd/wallet-test \
  --mode=backend \
  --network=ethereum-sepolia \
  --data-dir=./tmp/wallet-test-backend \
  --password='test-password' \
  --backend-base-url=http://localhost:8080 \
  --poll-attempts=15 \
  --poll-seconds=2
```

If your backend requires an API key:

```bash
go run ./cmd/wallet-test \
  --mode=backend \
  --network=ethereum-sepolia \
  --data-dir=./tmp/wallet-test-backend \
  --password='test-password' \
  --backend-base-url=http://localhost:8080 \
  --backend-api-key='YOUR_KEY'
```

## Common failure: “bundler endpoint check failed”

This means `EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_SEPOLIA` points at a normal RPC endpoint.
Use a real bundler endpoint (must support `eth_sendUserOperation` / `eth_estimateUserOperationGas`).

