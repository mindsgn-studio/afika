import { network } from "hardhat";
import { getAddress } from "viem";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: "/etc/secrets/pocket.env" });

async function main() {
  const connection = (await network.connect()) as any;
  const viem = connection.viem;

  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const deployerAddr = getAddress(deployer.account.address);

  console.log("🚀 Starting deployment with:", deployerAddr);

  // ── 1. SmartAccount implementation ──────────────────────────────────────────
  const smartAccount = await viem.deployContract("SmartAccount");
  const implementationAddr = getAddress(smartAccount.address);
  console.log("✅ SmartAccount implementation deployed at:", implementationAddr);

  // ── 2. SmartAccountFactory ───────────────────────────────────────────────────
  const factory = await viem.deployContract("SmartAccountFactory", [
    implementationAddr,
    deployerAddr, // admin
  ]);
  const factoryAddr = getAddress(factory.address);
  console.log("✅ SmartAccountFactory deployed at:", factoryAddr);

  // ── 3. USDCPaymaster (optional — requires env vars) ──────────────────────────
  const entryPointEnv = process.env.ENTRYPOINT_ADDRESS;
  const usdcEnv = process.env.USDC_ADDRESS;
  const signerEnv = process.env.PAYMASTER_SIGNER ?? deployerAddr;
  const maxPerOpEnv = process.env.PAYMASTER_MAX_PER_OP_UNITS ?? "100000000";    // 100 USDC (6 decimals)
  const dailyLimitEnv = process.env.PAYMASTER_DAILY_LIMIT_UNITS ?? "500000000"; // 500 USDC (6 decimals)

  const entryPoint = entryPointEnv ? getAddress(entryPointEnv) : "";
  const usdc = usdcEnv ? getAddress(usdcEnv) : "";
  const paymasterSigner = getAddress(signerEnv);
  let paymaster = "";

  if (entryPoint && usdc) {
    const paymasterContract = await viem.deployContract("USDCPaymaster", [
      entryPoint,             // entryPointAddress
      usdc,                   // usdcAddress
      deployerAddr,           // initialOwner
      paymasterSigner,        // signer
      BigInt(maxPerOpEnv),    // maxPerOperation
      BigInt(dailyLimitEnv),  // dailySpendLimit
      factoryAddr,            // factory (trusted from day 1)
    ]);
    paymaster = getAddress(paymasterContract.address);
    console.log("✅ USDCPaymaster deployed at:", paymaster);
  } else {
    console.log(
      "ℹ️  Skipping paymaster deployment (ENTRYPOINT_ADDRESS and/or USDC_ADDRESS not set)"
    );
  }

  // ── 4. Save deployment JSON ──────────────────────────────────────────────────
  const chainId = await publicClient.getChainId();

  const deployment = {
    network: connection.networkName,
    chainId,
    deployer: deployerAddr,
    implementation: implementationAddr,
    factory: factoryAddr,
    entryPoint: entryPoint || null,
    usdc: usdc || null,
    paymasterSigner,
    paymaster: paymaster || null,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.resolve(process.cwd(), "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const deploymentPath = path.join(deploymentsDir, `${connection.networkName}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  console.log("\n📜 Deployment Summary");
  console.log("─────────────────────────────────────────");
  console.log(`Network:        ${connection.networkName} (chainId: ${chainId})`);
  console.log(`Deployer:       ${deployerAddr}`);
  console.log(`Implementation: ${implementationAddr}`);
  console.log(`Factory:        ${factoryAddr}`);
  console.log(`EntryPoint:     ${entryPoint || "(not set)"}`);
  console.log(`USDC:           ${usdc || "(not set)"}`);
  console.log(`Signer:         ${paymasterSigner}`);
  console.log(`Paymaster:      ${paymaster || "(not deployed)"}`);
  console.log(`Saved to:       ${deploymentPath}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});