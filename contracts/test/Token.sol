// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
  constructor(string memory _symbol, string memory _name) ERC20(_symbol, _name) {}

  function mint(address sender, uint256 amount) external {
    _mint(sender, amount);
  }

  function decimals() public view virtual override returns (uint8) {
    return 18;
  }
}
