import { network } from "hardhat";
import { getAddress, parseAbi, encodeFunctionData } from "viem";

async function main() {
  const connection = (await network.connect()) as any;
  const hardhatViem = connection.viem;
  const publicClient = await hardhatViem.getPublicClient();

  const entryPoint = getAddress("0x0000000071727De22E5E9d8BAf0edAc6f37da032");
  const zero32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

  // 1. Build the tuple in the correct order for PackedUserOperation:
  const userOpTuple: [
    `0x${string}`, // sender
    bigint,       // nonce
    `0x${string}`,// initCode
    `0x${string}`,// callData
    `0x${string}`,// accountGasLimits (bytes32)
    bigint,       // preVerificationGas
    `0x${string}`,// gasFees (bytes32)
    `0x${string}`,// paymasterAndData
    `0x${string}`,// signature
  ] = [
    "0x7cE6368C122983259483a3c4e13d189C8121665F",
    0n,
    "0xeea14c5b5127e4386f472b9984e569d28c26333120fa4e34..." as `0x${string}`,
    "0x",
    zero32, // you can fill real packed gas here if you like
    0x15f90n,
    zero32,
    "0xa74461d376c68a26dc51e3f11be6b4bdaf5000eb509dc0db74a1f96192e0cf0abd0f2dd01825adad6d90e8f21f080867f639a69160ad1997f61113be5642537c2ac91f06bccadc680bdf831e33ba1db791c1d3f01b" as `0x${string}`,
    "0x8f173265b7ba7c4e826f522938c177f2df2f4685b2feaef528cc32aa7392bb881a16136e2abf372e5b29704553b4686e046e972a96e5fc87fc35f5f8ab53089600" as `0x${string}`,
  ];

  const abi = parseAbi([
    "function simulateValidation((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes) userOp, address target, bytes targetCallData) external",
  ]);

  const data = encodeFunctionData({
    abi,
    functionName: "simulateValidation",
    args: [userOpTuple, "0x0000000000000000000000000000000000000000", "0x"],
  });

  try {
    await publicClient.call({
      to: entryPoint,
      data,
    });
    console.log("simulateValidation completed without revert.");
  } catch (err: any) {
    console.error("simulateValidation reverted with:", err.shortMessage ?? err.message ?? err);
  }
}

main().catch(console.error);