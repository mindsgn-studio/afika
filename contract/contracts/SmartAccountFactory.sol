// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SmartAccountFactory
 * @notice Deterministic (CREATE2) factory for SmartAccount proxies.
 *
 * Deployment flow for gasless wallet creation (ERC-4337):
 *   1. Backend calls `getAddressWithEntryPoint(userEOA, entryPoint)` off-chain
 *      to derive the future wallet address — zero gas.
 *   2. Backend registers that address with the Paymaster:
 *         paymaster.setSponsoredUser(futureAddress, true)
 *   3. User submits their first UserOperation with:
 *         sender   = futureAddress
 *         initCode = address(this) ++ abi.encodeCall(createAccountWithEntryPoint, ...)
 *   4. EntryPoint calls this factory, deploys the wallet, then executes the op.
 *      Gas is covered by the Paymaster — user needs zero native tokens.
 *
 * Idempotency: if the wallet already exists the factory returns the existing
 * address without reverting, so bundlers can safely retry.
 */
contract SmartAccountFactory is Ownable {

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AccountCreated(address indexed owner, address indexed account);
    event AccountCreatedWithEntryPoint(
        address indexed owner,
        address indexed account,
        address indexed entryPoint
    );
    event ImplementationUpdated(address indexed newImplementation);

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The SmartAccount logic contract all proxies point to.
    address public implementation;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _implementation, address _initialOwner)
        Ownable(_initialOwner)
    {
        require(_implementation != address(0), "INVALID_IMPLEMENTATION");
        require(_implementation.code.length > 0, "NOT_CONTRACT");
        implementation = _implementation;
    }

    // -------------------------------------------------------------------------
    // Public factory functions
    // -------------------------------------------------------------------------

    /**
     * @notice Deploy a SmartAccount without an EntryPoint.
     *         Useful for non-ERC-4337 usage.
     */
    function createAccount(address owner) external returns (address account) {
        return _deploy(owner, address(0));
    }

    /**
     * @notice Deploy a SmartAccount pre-configured with an EntryPoint.
     *         This is the function encoded in `initCode` for gasless creation.
     * @param owner       The EOA that will own the smart account.
     * @param entryPoint  The ERC-4337 EntryPoint the account will trust.
     */
    function createAccountWithEntryPoint(
        address owner,
        address entryPoint
    ) external returns (address account) {
        require(owner != address(0), "INVALID_OWNER");
        require(entryPoint != address(0), "INVALID_ENTRY_POINT");
        return _deploy(owner, entryPoint);
    }

    // -------------------------------------------------------------------------
    // Address prediction (view — no gas for callers)
    // -------------------------------------------------------------------------

    /**
     * @notice Predict the CREATE2 address for a wallet created via
     *         `createAccountWithEntryPoint`.  Call this off-chain before
     *         registering the user with the Paymaster.
     */
    function getAddressWithEntryPoint(
        address owner,
        address entryPoint
    ) public view returns (address predicted) {
        require(owner != address(0), "INVALID_OWNER");
        require(entryPoint != address(0), "INVALID_ENTRY_POINT");
        return _predictAddress(owner, entryPoint);
    }

    /**
     * @notice Predict the CREATE2 address for a wallet created via
     *         `createAccount` (no EntryPoint).
     */
    function getAddress(address owner) public view returns (address predicted) {
        require(owner != address(0), "INVALID_OWNER");
        return _predictAddress(owner, address(0));
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /**
     * @notice Point all future proxies at a new implementation.
     *         Existing proxies are unaffected unless they upgrade themselves.
     */
    function updateImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "INVALID_ADDRESS");
        require(newImplementation.code.length > 0, "NOT_CONTRACT");
        implementation = newImplementation;
        emit ImplementationUpdated(newImplementation);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _deploy(address owner, address entryPoint) internal returns (address account) {
        // Predict the deterministic address first
        account = _predictAddress(owner, entryPoint);

        // Idempotent: return existing account without reverting
        if (account.code.length > 0) {
            return account;
        }

        bytes memory initData = entryPoint == address(0)
            ? abi.encodeWithSignature("initialize(address)", owner)
            : abi.encodeWithSignature(
                "initializeWithEntryPoint(address,address)",
                owner,
                entryPoint
            );

        bytes32 salt = _salt(owner, entryPoint);

        ERC1967Proxy proxy = new ERC1967Proxy{salt: salt}(implementation, initData);
        account = address(proxy);

        emit AccountCreated(owner, account);

        if (entryPoint != address(0)) {
            emit AccountCreatedWithEntryPoint(owner, account, entryPoint);
        }
    }

    function _predictAddress(address owner, address entryPoint)
        internal
        view
        returns (address predicted)
    {
        bytes memory initData = entryPoint == address(0)
            ? abi.encodeWithSignature("initialize(address)", owner)
            : abi.encodeWithSignature(
                "initializeWithEntryPoint(address,address)",
                owner,
                entryPoint
            );

        bytes memory bytecode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(implementation, initData)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                _salt(owner, entryPoint),
                keccak256(bytecode)
            )
        );

        predicted = address(uint160(uint256(hash)));
    }

    /**
     * @dev Salt incorporates both owner and entryPoint so the same owner can
     *      have distinct wallets for different EntryPoint versions.
     */
    function _salt(address owner, address entryPoint) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, entryPoint));
    }

    // -------------------------------------------------------------------------
    // Storage gap
    // -------------------------------------------------------------------------
    uint256[50] private __gap;
}
