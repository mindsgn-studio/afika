<<<<<<< HEAD
# Pocket Money Contracts

Hardhat project for Pocket Money account-abstraction contracts.

## Scope

- `SmartAccount.sol`: account contract with EntryPoint-aware validation and execution.
- `SmartAccountFactory.sol`: deterministic deployment and `create/get` helpers for AA flows.
- `USDCPaymaster.sol`: strict USDC sponsorship policy for EntryPoint v0.7.

Deployments are written to `contract/deployments/<network>.json` and consumed by core runtime config.

## Prerequisites

- Node.js 22+
- npm
- Sepolia RPC URL
- deployer private key (for deploy scripts)

Environment examples:

```bash
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/<key>"
export SEPOLIA_PRIVATE_KEY="0x..."
```

## Commands

Run tests:

```bash
npx hardhat test
```

Deploy contracts:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Run sponsorship preflight smoke checks:

```bash
npx hardhat run scripts/smoke-sepolia.ts --network sepolia
```

The smoke script validates on-chain prerequisites for sponsored creation/send:

- factory bytecode present
- paymaster bytecode present
- paymaster EntryPoint wiring matches expected value
- paymaster signer is configured (non-zero)
- factory is trusted by paymaster
- paymaster deposit is non-zero

## Testing Notes

- `smartAccount.ts` covers deterministic deployment and `validateUserOp` correctness.
- `paymaster.ts` contains baseline coverage and scaffolding for advanced validation-path tests.
- If advanced paymaster tests are expanded, they must execute in an EntryPoint caller context to avoid false negatives.
=======
# Sample Hardhat 3 Beta Project (`node:test` and `viem`)

This project showcases a Hardhat 3 Beta project using the native Node.js test runner (`node:test`) and the `viem` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
>>>>>>> 2c300523feab5fb460405ebae84d31bb5c6427a4
