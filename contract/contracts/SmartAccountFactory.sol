// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SmartAccountFactory is Ownable {

    address public implementation;

    event AccountCreated(address indexed owner, address account);
    event ImplementationUpdated(address indexed newImplementation);

    constructor(address _implementation, address _initialOwner)
        Ownable(_initialOwner)
    {
        require(_implementation != address(0), "INVALID_IMPLEMENTATION");
        require(_implementation.code.length > 0, "NOT_CONTRACT");

        implementation = _implementation;
    }

    function createAccount(address owner) external returns (address account) {
        account = getAddress(owner);

        if (account.code.length > 0) {
            return account;
        }

        bytes memory initData = abi.encodeWithSignature(
            "initialize(address)",
            owner
        );

        bytes32 salt = keccak256(abi.encodePacked(owner));

        ERC1967Proxy proxy = new ERC1967Proxy{salt: salt}(
            implementation,
            initData
        );

        account = address(proxy);

        emit AccountCreated(owner, account);
    }

    function getAddress(address owner) public view returns (address predicted) {
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address)",
            owner
        );

        bytes memory bytecode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(implementation, initData)
        );

        bytes32 salt = keccak256(abi.encodePacked(owner));

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        predicted = address(uint160(uint256(hash)));
    }

    function updateImplementation(address newImplementation)
        external
        onlyOwner
    {
        require(newImplementation != address(0), "INVALID_ADDRESS");
        require(newImplementation.code.length > 0, "NOT_CONTRACT");

        implementation = newImplementation;

        emit ImplementationUpdated(newImplementation);
    }

    uint256[50] private __gap;
}