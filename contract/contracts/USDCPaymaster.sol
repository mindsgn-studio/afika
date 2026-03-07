// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title IEntryPoint (minimal interface)
 */
interface IEntryPoint {
    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
    function balanceOf(address account) external view returns (uint256);
    function getDepositInfo(address account) external view returns (
        uint112 deposit,
        bool staked,
        uint112 stake,
        uint32 unstakeDelaySec,
        uint48 withdrawTime
    );
}

/**
 * @title USDCPaymaster
 * @notice ERC-4337 Paymaster that sponsors gas for whitelisted smart accounts
 *         performing USDC transfers, as well as their initial (gasless) wallet
 *         deployment.
 *
 * Key design decisions (vs v1):
 *
 *  1. `validatePaymasterUserOp` is now effectively view w.r.t. user accounting —
 *     state mutation (dailySponsored) has been moved to `postOp` so that
 *     a reverted userOp does NOT consume the daily quota.
 *
 *  2. Paymaster signatures — the owner backend signs each approval off-chain;
 *     the paymaster verifies the signature on-chain, giving the backend full
 *     policy control without a separate allowlist transaction per user.
 *
 *  3. Gasless wallet creation — ops that include initCode from the trusted
 *     factory are approved without USDC transfer validation (the wallet does
 *     not exist yet). Accounting is skipped for deployment ops.
 *
 *  4. USDC balance check — the sender must hold enough USDC before sponsorship.
 *
 *  5. Deposit / withdraw — owner can fund and defund the EntryPoint balance.
 *
 *  6. TRANSFER_SELECTOR uses IERC20.transfer.selector (cleaner than keccak).
 */
contract USDCPaymaster is Ownable {
    using ECDSA for bytes32;

    // -------------------------------------------------------------------------
    // ERC-4337 types
    // -------------------------------------------------------------------------

    struct PackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Sponsored(address indexed sender, address indexed recipient, uint256 amount, uint256 daySlot);
    event WalletDeploymentSponsored(address indexed sender);
    event LimitsUpdated(uint256 maxAmountPerOp, uint256 dailyLimit);
    event SignerUpdated(address indexed newSigner);
    event TrustedFactoryUpdated(address indexed factory, bool trusted);
    event Deposited(uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Immutables
    // -------------------------------------------------------------------------

    address public immutable entryPoint;
    address public immutable usdcToken;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Per-operation USDC transfer cap (in USDC base units).
    uint256 public maxAmountPerOp;

    /// @notice Per-user daily USDC sponsorship cap (in USDC base units).
    uint256 public dailyLimit;

    /**
     * @notice The backend EOA whose signature authorises each paymaster op.
     *         Setting this to address(0) disables signature validation
     *         (useful for testing, NOT recommended in production).
     */
    address public paymasterSigner;

    /// @notice Factories whose `initCode` is trusted for gasless deployment.
    mapping(address => bool) public trustedFactories;

    /// @notice Tracks how much USDC has been sponsored per user per UTC day.
    ///         daySlot = block.timestamp / 1 days
    mapping(address => mapping(uint256 => uint256)) public dailySponsored;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @dev Fix #5: use the interface selector instead of a raw keccak.
    bytes4 private constant TRANSFER_SELECTOR = IERC20.transfer.selector;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @param entryPointAddress  The ERC-4337 EntryPoint contract.
     * @param usdcAddress        The USDC token contract.
     * @param initialOwner       Owner / admin EOA.
     * @param signer             Backend EOA that signs paymaster approvals.
     * @param maxPerOperation    Maximum USDC per sponsored op.
     * @param dailySpendLimit    Maximum USDC per user per day.
     * @param factory            Initial trusted SmartAccountFactory.
     */
    constructor(
        address entryPointAddress,
        address usdcAddress,
        address initialOwner,
        address signer,
        uint256 maxPerOperation,
        uint256 dailySpendLimit,
        address factory
    ) Ownable(initialOwner) {
        require(entryPointAddress != address(0), "INVALID_ENTRY_POINT");
        require(usdcAddress != address(0), "INVALID_USDC");
        require(signer != address(0), "INVALID_SIGNER");
        require(maxPerOperation > 0, "INVALID_PER_OP_LIMIT");
        require(dailySpendLimit >= maxPerOperation, "INVALID_LIMITS");

        entryPoint = entryPointAddress;
        usdcToken = usdcAddress;
        paymasterSigner = signer;
        maxAmountPerOp = maxPerOperation;
        dailyLimit = dailySpendLimit;

        if (factory != address(0)) {
            trustedFactories[factory] = true;
            emit TrustedFactoryUpdated(factory, true);
        }
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "ENTRY_POINT_ONLY");
        _;
    }

    // -------------------------------------------------------------------------
    // EntryPoint deposit management  (Fix #3)
    // -------------------------------------------------------------------------

    /**
     * @notice Deposit ETH into the EntryPoint so this paymaster can sponsor gas.
     *         Must be funded before any UserOperations can be sponsored.
     */
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "ZERO_DEPOSIT");
        IEntryPoint(entryPoint).depositTo{value: msg.value}(address(this));
        emit Deposited(msg.value);
    }

    /**
     * @notice Withdraw ETH from the EntryPoint back to `to`.
     */
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "INVALID_ADDRESS");
        require(amount > 0, "ZERO_AMOUNT");
        IEntryPoint(entryPoint).withdrawTo(to, amount);
        emit Withdrawn(to, amount);
    }

    /**
     * @notice Returns the ETH balance this paymaster holds in the EntryPoint.
     */
    function getDeposit() external view returns (uint256) {
        return IEntryPoint(entryPoint).balanceOf(address(this));
    }

    // -------------------------------------------------------------------------
    // Admin setters
    // -------------------------------------------------------------------------

    function setLimits(uint256 maxPerOperation, uint256 dailySpendLimit) external onlyOwner {
        require(maxPerOperation > 0, "INVALID_PER_OP_LIMIT");
        require(dailySpendLimit >= maxPerOperation, "INVALID_DAILY_LIMIT");
        maxAmountPerOp = maxPerOperation;
        dailyLimit = dailySpendLimit;
        emit LimitsUpdated(maxPerOperation, dailySpendLimit);
    }

    function setPaymasterSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "INVALID_SIGNER");
        paymasterSigner = newSigner;
        emit SignerUpdated(newSigner);
    }

    function setTrustedFactory(address factory, bool trusted) external onlyOwner {
        require(factory != address(0), "INVALID_FACTORY");
        trustedFactories[factory] = trusted;
        emit TrustedFactoryUpdated(factory, trusted);
    }

    // -------------------------------------------------------------------------
    // ERC-4337 — validatePaymasterUserOp  (Fix #1, #2, #6, #7, #8)
    // -------------------------------------------------------------------------

    /**
     * @notice Called by the EntryPoint during the verification phase.
     *
     * paymasterAndData layout:
     *   [0:20]   address  this paymaster
     *   [20:84]  bytes    65-byte ECDSA signature by `paymasterSigner`
     *             signed over keccak256(sender, nonce, chainId, address(this))
     *
     * No state is mutated here — all accounting happens in postOp so that
     * a reverted userOp does not consume the daily quota.
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /* userOpHash */,
        uint256 /* maxCost */
    ) external onlyEntryPoint returns (bytes memory context, uint256 validationData) {

        // --- Fix #8: Verify backend signature ---
        _verifyPaymasterSignature(userOp);

        // --- Gasless wallet deployment path ---
        if (userOp.initCode.length > 0) {
            address factory = address(bytes20(userOp.initCode[:20]));
            require(trustedFactories[factory], "UNTRUSTED_FACTORY");

            // No USDC validation needed — wallet doesn't exist yet.
            // Pass isDeployment=true so postOp skips accounting.
            context = abi.encode(userOp.sender, address(0), uint256(0), uint256(0), true);
            emit WalletDeploymentSponsored(userOp.sender);
            return (context, 0);
        }

        // --- Regular USDC transfer path ---
        // Decoding is extracted into a helper to avoid stack-too-deep.
        (address recipient, uint256 amount) = _decodeAndValidateTransfer(userOp);

        uint256 daySlot = block.timestamp / 1 days;
        require(
            dailySponsored[userOp.sender][daySlot] + amount <= dailyLimit,
            "DAILY_LIMIT_EXCEEDED"
        );

        // Pass data to postOp for the actual accounting write.
        context = abi.encode(userOp.sender, recipient, amount, daySlot, false);
        return (context, 0);
    }

    // -------------------------------------------------------------------------
    // ERC-4337 — postOp  (Fix #2)
    // -------------------------------------------------------------------------

    /**
     * @notice Called by the EntryPoint after the userOp executes.
     *         Accounting is written here so that a reverted op does not consume
     *         the user's daily quota.
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 /* actualGasCost */,
        uint256 /* actualUserOpFeePerGas */
    ) external onlyEntryPoint {
        (
            address sender,
            address recipient,
            uint256 amount,
            uint256 daySlot,
            bool isDeployment
        ) = abi.decode(context, (address, address, uint256, uint256, bool));

        // Skip accounting for deployment ops and reverted ops
        if (isDeployment || mode != PostOpMode.opSucceeded) {
            return;
        }

        // Safe: validatePaymasterUserOp already checked projected <= dailyLimit
        dailySponsored[sender][daySlot] += amount;
        emit Sponsored(sender, recipient, amount, daySlot);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * @dev Verifies that `paymasterAndData[20:85]` is a valid 65-byte signature
     *      by `paymasterSigner` over the canonical approval hash.
     *
     *      If `paymasterSigner` is address(0) validation is skipped (dev/test).
     *
     *      The approval hash commits to:
     *        - sender        (prevents cross-user replay)
     *        - nonce         (prevents same-op replay)
     *        - chainId       (prevents cross-chain replay)
     *        - this contract (prevents cross-paymaster replay)
     */
    /**
     * @dev Decodes and validates the USDC transfer embedded in userOp.callData.
     *      Extracted from validatePaymasterUserOp to avoid stack-too-deep.
     *      Returns (recipient, amount) on success; reverts otherwise.
     */
    function _decodeAndValidateTransfer(
        PackedUserOperation calldata userOp
    ) private view returns (address recipient, uint256 amount) {
        require(userOp.callData.length >= 4, "INVALID_CALLDATA_LENGTH");

        (address token, uint256 ethValue, bytes memory transferData) =
            abi.decode(userOp.callData[4:], (address, uint256, bytes));

        require(token == usdcToken, "TOKEN_NOT_SUPPORTED");
        require(ethValue == 0, "VALUE_MUST_BE_ZERO");
        require(transferData.length == 68, "INVALID_TRANSFER_DATA_LENGTH");

        bytes4 selector;
        assembly {
            selector  := mload(add(transferData, 32))
            recipient := mload(add(transferData, 36))
            amount    := mload(add(transferData, 68))
        }

        require(selector == TRANSFER_SELECTOR, "INVALID_TRANSFER_SELECTOR");
        require(recipient != address(0), "INVALID_RECIPIENT");
        require(amount > 0, "INVALID_AMOUNT");
        require(amount <= maxAmountPerOp, "PER_OP_LIMIT_EXCEEDED");

        // Fix #7: sender must hold enough USDC
        require(
            IERC20(usdcToken).balanceOf(userOp.sender) >= amount,
            "INSUFFICIENT_USDC_BALANCE"
        );
    }

    function _verifyPaymasterSignature(PackedUserOperation calldata userOp) internal view {
        if (paymasterSigner == address(0)) return; // skip in dev/test

        require(userOp.paymasterAndData.length >= 85, "MISSING_PAYMASTER_SIGNATURE");

        bytes memory sig = userOp.paymasterAndData[20:85];

        bytes32 approvalHash = keccak256(
            abi.encodePacked(
                userOp.sender,
                userOp.nonce,
                block.chainid,
                address(this)
            )
        );

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(approvalHash);
        address recovered = ECDSA.recover(digest, sig);
        require(recovered == paymasterSigner, "INVALID_PAYMASTER_SIGNATURE");
    }

    // -------------------------------------------------------------------------
    // Receive (in case ETH is sent directly before deposit() is called)
    // -------------------------------------------------------------------------
    receive() external payable {}
}
