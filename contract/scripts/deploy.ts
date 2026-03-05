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

    const smartAccount = await viem.deployContract("SmartAccount");
    const implementationAddr = getAddress(smartAccount.address);
    console.log("✅ Implementation deployed at:", implementationAddr);

    const factory = await viem.deployContract("SmartAccountFactory", [
        implementationAddr,
        deployerAddr
    ]);
    const factoryAddr = getAddress(factory.address);
    console.log("✅ Factory deployed at:", factoryAddr);

    const chainId = await publicClient.getChainId();

    const deployment = {
        network: network.name,
        chainId,
        deployer: deployerAddr,
        implementation: implementationAddr,
        factory: factoryAddr,
        deployedAt: new Date().toISOString()
    };

    const deploymentsDir = path.resolve(process.cwd(), "deployments");
    fs.mkdirSync(deploymentsDir, { recursive: true });
    const deploymentPath = path.join(deploymentsDir, `${network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    
    console.log("\n📜 Deployment Summary");
    console.log("-------------------");
    console.log(`Network:      ${network.name} (ID: ${chainId})`);
    console.log(`Deployer:     ${deployerAddr}`);
    console.log(`Implementation: ${implementationAddr}`);
    console.log(`Factory:      ${factoryAddr}`);
    console.log(`Saved JSON:   ${deploymentPath}`);
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
});