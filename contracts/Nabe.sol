//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.12;

import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "hardhat/console.sol";

contract Nabe {

    using BoringERC20 for IERC20;
    using BoringMath for uint256;

    string public name;

    struct User {
        mapping (address => uint256) tokenAmount;
    }

    mapping (address => User) private userTokens;

    struct Token {
        mapping (address => uint) collateralMaxAmount;
    }

    mapping (address => Token) private tokens;

    constructor(string memory _name) public {
        name = _name;
    }

    modifier maxAmountDontExceedAmount(uint256 _amount, uint256[] calldata _maxAmounts) {
        for (uint256 i = 0; i < _maxAmounts.length; i += 1) {
            require(_amount >= _maxAmounts[i], 'Max amount can not exceed your balance');
        }
        _;
    }

    //Deposit token and update max amount per collateral
    function deposit(IERC20 _token, uint256 _amount, address[] calldata _collaterals, uint256[] calldata _maxAmounts) maxAmountDontExceedAmount(_amount, _maxAmounts) external {
        _token.safeTransferFrom(msg.sender, address(this), _amount);
        updateMaxAmountPerCollateral(address(_token), _collaterals, _maxAmounts);
    }

    //update maxAmount per collaterals
    //todo limit maxAmount of user so he can't set a maxAmount superior to his deposit
    function updateMaxAmountPerCollateral(address _token, address[] calldata _collaterals, uint256[] calldata _maxAmounts) view private {
        for (uint256 i = 0; i < _collaterals.length; i += 1) {
            tokens[_token].collateralMaxAmount[_collaterals[i]].add(_maxAmounts[i]);
        }
    }

}
