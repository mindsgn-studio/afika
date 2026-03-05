import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

describe("SmartAccount System", async function () {
  const connection = await network.connect() as any;
  const viem = connection.viem
  const publicClient = await viem.getPublicClient();
  const [owner, stranger] = await viem.getWalletClients();
  
  async function deploySystem() {
    const implementation = await viem.deployContract("SmartAccount");
    const factory = await viem.deployContract("SmartAccountFactory", [
      implementation.address,
      owner.account.address,
    ]);
    return { implementation, factory };
  }

  it("Should predict the correct address and deploy the account", async function () {
    const { factory } = await deploySystem();
    const user = getAddress(owner.account.address);

    const predicted = await factory.read.getAddress([user]);

    await viem.assertions.emitWithArgs(
      factory.write.createAccount([user]),
      factory,
      "AccountCreated",
      [user, predicted]
    );
  });

  it("Should allow the owner to execute a transfer and increment nonce", async function () {
    const { factory } = await deploySystem();
    const user = owner.account.address;
    
    await factory.write.createAccount([user]);
    const accountAddress = await factory.read.getAddress([user]);
    const account = await viem.getContractAt("SmartAccount", accountAddress);

    const recipient = getAddress("0x0000000000000000000000000000000000000123");
    const amount = parseEther("1");

    // Send ETH to the smart account 
    await owner.sendTransaction({ to: accountAddress, value: amount });

    // Execute transfer [cite: 7, 8]
    await account.write.execute([recipient, amount, "0x"]);

    // Assertions [cite: 4, 9]
    assert.equal(await publicClient.getBalance({ address: recipient }), amount);
    assert.equal(await account.read.nonce(), 1n);
  });

  it("Should prevent non-owners from executing transactions", async function () {
    const { factory } = await deploySystem();
    await factory.write.createAccount([owner.account.address]);
    const accountAddress = await factory.read.getAddress([owner.account.address]);
    const account = await viem.getContractAt("SmartAccount", accountAddress);

    // Use the stranger client to attempt execution
    const strangerClient = await viem.getContractAt("SmartAccount", accountAddress, {
        client: { wallet: stranger }
    });

    await assert.rejects(
      strangerClient.write.execute([stranger.account.address, 0n, "0x"]),
      /OwnableUnauthorizedAccount/
    );
  });

  it("Should prevent self-calls to the account", async function () {
    const { factory } = await deploySystem();
    await factory.write.createAccount([owner.account.address]);
    const accountAddress = await factory.read.getAddress([owner.account.address]);
    const account = await viem.getContractAt("SmartAccount", accountAddress);

    // Attempting to call itself should revert 
    await assert.rejects(
      account.write.execute([accountAddress, 0n, "0x"]),
      /SELF_CALL_NOT_ALLOWED/
    );
  });
});