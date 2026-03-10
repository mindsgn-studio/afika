// contract/scripts/debug-usdc.ts
import { network } from "hardhat";
import {
  getAddress,
  parseAbi,
  encodeFunctionData,
  keccak256,
  type Hex,
} from "viem";

async function main() {
  const connection = (await network.connect()) as any;
  const hardhatViem = connection.viem;
  const publicClient = await hardhatViem.getPublicClient();

  // 1) Set your paymaster address (latest deployment)
  const paymaster = getAddress(
    "0xa74461d376c68A26dc51E3F11BE6b4Bdaf5000eb",
  );

  // 2) Paste the userOperation from signedUserOp.userOperation here (FULL JSON, no "..."!)
  const rawUserOp = `{
    "sender":"0x7cE6368C122983259483a3c4e13d189C8121665F",
    "nonce":"0x0",
    "initCode":"0xeea14c5b5127e4386f472b9984e569d28c26333120fa4e34000000000000000000000000fd095022baadaaa92edd5305f8b0887ec0e6fcee0000000000000000000000000000000071727de22e5e9d8baf0edac6f37da032",
    "callData":"0x",
    "callGasLimit":"0x7a120",
    "verificationGasLimit":"0x6ddd0",
    "preVerificationGas":"0x15f90",
    "maxFeePerGas":"0x11e1a300",
    "maxPriorityFeePerGas":"0x5f5e100",
    "paymasterAndData":"0xa74461d376c68a26dc51e3f11be6b4bdaf5000eb509dc0db74a1f96192e0cf0abd0f2dd01825adad6d90e8f21f080867f639a69160ad1997f61113be5642537c2ac91f06bccadc680bdf831e33ba1db791c1d3f01b",
    "signature":"0x8f173265b7ba7c4e826f522938c177f2df2f4685b2feaef528cc32aa7392bb881a16136e2abf372e5b29704553b4686e046e972a96e5fc87fc35f5f8ab53089600"
  }`;

  const op = JSON.parse(rawUserOp) as {
    sender: string;
    nonce: string;
    initCode: Hex;
    callData: Hex;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData: Hex;
    signature: Hex;
  };

  // 3) Build PackedUserOperation tuple in the exact order from USDCPaymaster.PackedUserOperation:
  //    address sender;
  //    uint256 nonce;
  //    bytes initCode;
  //    bytes callData;
  //    bytes32 accountGasLimits;
  //    uint256 preVerificationGas;
  //    bytes32 gasFees;
  //    bytes paymasterAndData;
  //    bytes signature;
  const zero32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

  const userOpTuple: [
    `0x${string}`, // sender
    bigint, // nonce
    Hex, // initCode
    Hex, // callData
    Hex, // accountGasLimits (bytes32)
    bigint, // preVerificationGas
    Hex, // gasFees (bytes32)
    Hex, // paymasterAndData
    Hex, // signature
  ] = [
    op.sender as `0x${string}`,
    BigInt(op.nonce), // "0x0" -> 0n
    op.initCode,
    op.callData,
    zero32, // you can pack real gas limits here if you want; zero is fine for debugging
    BigInt(op.preVerificationGas),
    zero32, // same for gasFees
    op.paymasterAndData,
    op.signature,
  ];

  // 4) ABI for validatePaymasterUserOp from USDCPaymaster.sol
  const abi = parseAbi([
    "function validatePaymasterUserOp((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes) userOp, bytes32 userOpHash, uint256 maxCost) external returns (bytes, uint256)",
  ]);

  // For debugging, userOpHash/maxCost can be dummy – paymaster ignores them in your code.
  const userOpHash = keccak256("0x00") as `0x${string}`;
  const maxCost = 0n;

  const data = encodeFunctionData({
    abi,
    functionName: "validatePaymasterUserOp",
    args: [userOpTuple, userOpHash, maxCost],
  });

  try {
    await publicClient.call({ to: paymaster, data });
    console.log("validatePaymasterUserOp completed without revert.");
  } catch (err: any) {
    console.error(
      "validatePaymasterUserOp reverted with:",
      err.shortMessage ?? err.message ?? err,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});