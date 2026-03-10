import { network } from "hardhat";
import dotenv from "dotenv";
import { getAddress, parseEther } from "viem";

dotenv.config({ path: "/etc/secrets/pocket.env" });

async function main() {
  const ownerEnv = (process.env.OWNER_ADDRESS || process.env.POCKET_OWNER_ADDRESS || "").trim();
  if (!ownerEnv) {
    throw new Error("OWNER_ADDRESS (or POCKET_OWNER_ADDRESS) env var is required");
  }

  const owner = getAddress(ownerEnv as `0x${string}`);

  const amountEnv = (process.env.OWNER_FUND_ETH || "").trim();
  const amountEth = amountEnv !== "" ? amountEnv : "0.003"; // default: 0.003 ETH

  const connection = (await network.connect()) as any;
  const viem = connection.viem;
  const [funder] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const funderAddr = getAddress(funder.account.address);

  console.log("Funding owner wallet on", connection.networkName);
  console.log("Funder:", funderAddr);
  console.log("Owner: ", owner);
  console.log("Amount:", amountEth, "ETH");

  const txHash = await funder.sendTransaction({
    to: owner,
    value: parseEther(amountEth),
  });

  console.log("Sent tx:", txHash);

  const balance = await publicClient.getBalance({ address: owner });
  console.log("Owner balance after funding (wei):", balance.toString());
}

main().catch((error) => {
  console.error("❌ Funding failed:", error);
  process.exitCode = 1;
});

