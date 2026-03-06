// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SmartAccount
 * @notice ERC-4337 compatible smart account with UUPS upgradeability.
 *         Supports single and batch execution, ERC-20 transfers, and
 *         entrypoint-based userOp validation.
 */
contract SmartAccount is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Executed(address indexed caller, address indexed target, uint256 value, bytes data);
    event ERC20Transferred(address indexed token, address indexed to, uint256 amount);
    event EntryPointUpdated(address indexed entryPoint);

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

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The ERC-4337 EntryPoint this account trusts.
    address public entryPoint;

    /// @notice Per-key nonce sequences (ERC-4337 2D nonces).
    mapping(uint192 => uint64) public nonceSequence;

    uint256 private constant SIG_VALIDATION_FAILED = 1;
    uint256 private constant SIG_VALIDATION_SUCCESS = 0;

    // -------------------------------------------------------------------------
    // Constructor / Initializer
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialise with owner only (no EntryPoint).
     *         Prefer `initializeWithEntryPoint` for ERC-4337 usage.
     */
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
    }

    /**
     * @notice Initialise with both owner and EntryPoint address.
     *         This is the canonical initialiser for ERC-4337 wallets.
     */
    function initializeWithEntryPoint(
        address initialOwner,
        address initialEntryPoint
    ) public initializer {
        require(initialOwner != address(0), "INVALID_OWNER");
        require(initialEntryPoint != address(0), "INVALID_ENTRY_POINT");
        __Ownable_init(initialOwner);
        entryPoint = initialEntryPoint;
        emit EntryPointUpdated(initialEntryPoint);
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setEntryPoint(address newEntryPoint) external onlyOwner {
        require(newEntryPoint != address(0), "INVALID_ENTRY_POINT");
        entryPoint = newEntryPoint;
        emit EntryPointUpdated(newEntryPoint);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // -------------------------------------------------------------------------
    // Receive / Fallback
    // -------------------------------------------------------------------------

    receive() external payable {}
    fallback() external payable {}

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner() || msg.sender == entryPoint,
            "UNAUTHORIZED_CALLER"
        );
        _;
    }

    // -------------------------------------------------------------------------
    // ERC-4337 — nonce
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the packed nonce for a given key, matching the EntryPoint
     *         `getNonce(address, uint192)` interface.
     */
    function getNonce(uint192 key) external view returns (uint256) {
        return (uint256(key) << 64) | uint64(nonceSequence[key]);
    }

    // -------------------------------------------------------------------------
    // ERC-4337 — validateUserOp
    // -------------------------------------------------------------------------

    /**
     * @notice Validates a UserOperation signature and increments the nonce.
     * @dev Called exclusively by the EntryPoint during the verification phase.
     *      If the account lacks sufficient ETH to pre-fund the EntryPoint the
     *      call will still revert (missingAccountFunds check).
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        require(msg.sender == entryPoint, "ENTRY_POINT_ONLY");
        require(userOp.sender == address(this), "INVALID_SENDER");

        // --- Nonce check ---
        uint192 key = uint192(userOp.nonce >> 64);
        uint64 sequence = uint64(userOp.nonce);
        if (sequence != nonceSequence[key]) {
            return SIG_VALIDATION_FAILED;
        }

        // --- Signature check ---
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address recovered = ECDSA.recover(digest, userOp.signature);
        if (recovered != owner()) {
            return SIG_VALIDATION_FAILED;
        }

        // Advance nonce only after successful validation
        nonceSequence[key] += 1;

        // --- Pre-fund EntryPoint if required ---
        if (missingAccountFunds > 0) {
            (bool ok, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(ok, "PREFUND_FAILED");
        }

        return SIG_VALIDATION_SUCCESS;
    }

    // -------------------------------------------------------------------------
    // Execution
    // -------------------------------------------------------------------------

    /**
     * @notice Execute a single call on behalf of this account.
     * @param target  Contract or EOA to call.
     * @param value   Native token value to forward.
     * @param data    ABI-encoded calldata.
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) public onlyOwnerOrEntryPoint returns (bytes memory) {
        require(target != address(this), "SELF_CALL_NOT_ALLOWED");

        (bool success, bytes memory result) = target.call{value: value}(data);

        if (!success) {
            // Bubble up the revert reason
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        emit Executed(msg.sender, target, value, data);
        return result;
    }

    /**
     * @notice Execute multiple calls atomically.
     * @dev All calls share the same `onlyOwnerOrEntryPoint` guard.
     *      A revert in any call reverts the entire batch.
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata data
    ) external onlyOwnerOrEntryPoint {
        require(targets.length == data.length, "LENGTH_MISMATCH");
        require(values.length == data.length, "VALUES_LENGTH_MISMATCH");

        for (uint256 i = 0; i < targets.length; i++) {
            execute(targets[i], values[i], data[i]);
        }
    }

    // -------------------------------------------------------------------------
    // ERC-20 helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Transfer ERC-20 tokens out of this account.
     * @dev Uses SafeERC20 to handle non-standard tokens.
     */
    function transferERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(token != address(0), "INVALID_TOKEN");
        require(to != address(0), "INVALID_RECIPIENT");
        require(amount > 0, "INVALID_AMOUNT");
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Transferred(token, to, amount);
    }

    /**
     * @notice Returns this account's balance of `token`.
     */
    function getERC20Balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // -------------------------------------------------------------------------
    // Storage gap (47 slots used; 3 new state vars added above = 44 remaining)
    // -------------------------------------------------------------------------
    uint256[44] private __gap;
}
