// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SmartAccount is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    event Executed(address indexed caller, address indexed target, uint256 value, bytes data);
    event ERC20Transferred(address indexed token, address indexed to, uint256 amount);

    uint256 public nonce;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        // FIX 1: Renamed in OZ v5
        // __UUPS_init(); 
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    receive() external payable {}
    fallback() external payable {}

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bytes memory) {
        require(target != address(this), "SELF_CALL_NOT_ALLOWED");

        nonce++;

        (bool success, bytes memory result) = target.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        emit Executed(msg.sender, target, value, data);

        return result;
    }

    function transferERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        // FIX 2: Use IERC20 (the Upgradeable suffix is gone)
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Transferred(token, to, amount);
    }

    function getERC20Balance(address token)
        external
        view
        onlyOwner
        returns (uint256)
    {
        // FIX 3: Use IERC20
        return IERC20(token).balanceOf(address(this));
    }

    uint256[49] private __gap;
}