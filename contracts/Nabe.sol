//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.12;

import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "hardhat/console.sol";

contract Nabe {

    using BoringERC20 for IERC20;
    using BoringMath for uint256;

    string public name;

    mapping (address => mapping (address => uint256)) public userTokens;

    mapping (address => mapping (address => uint)) public tokens;

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
    function updateMaxAmountPerCollateral(address _token, address[] calldata _collaterals, uint256[] calldata _maxAmounts) private {
        for (uint256 i = 0; i < _collaterals.length; i += 1) {
            tokens[_token][_collaterals[i]] = tokens[_token][_collaterals[i]].add(_maxAmounts[i]);
        }
    }

}
