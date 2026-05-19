// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private constant TOKEN_DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 10_000e6;

    event FaucetMint(address indexed account, uint256 amount);

    constructor() ERC20("Mock USD Coin", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetMint(msg.sender, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
        emit FaucetMint(to, amount);
    }
}
