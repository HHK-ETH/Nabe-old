//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.12;

import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "hardhat/console.sol";
import "./interfaces/IKashiPair.sol";

contract Nabe {

    using BoringERC20 for IERC20;
    using BoringMath for uint256;

    IBentoBoxV1 public immutable bentoBox;
    IKashiPair public immutable kashiMaster;

    //asset => user => share
    mapping (address => mapping (address => uint256)) public userTokens;

    //asset => collateral => maxshare
    mapping (address => mapping (address => uint)) public tokens;

    constructor(IBentoBoxV1 _bentoBox, IKashiPair _kashiMaster) public {
        bentoBox = _bentoBox;
        kashiMaster = _kashiMaster;
    }

    modifier maxShareDontExceedShare(uint256 _share, uint256[] calldata _maxShares) {
        for (uint256 i = 0; i < _maxShares.length; i += 1) {
            require(_share >= _maxShares[i], 'Max share can not exceed your balance');
        }
        _;
    }

    //Deposit token and update max share per collateral
    function deposit(IERC20 _token, uint256 _share, address[] calldata _collaterals, uint256[] calldata _maxShares) maxShareDontExceedShare(_share, _maxShares) external {
        bentoBox.registerProtocol();
        bentoBox.transfer(_token, msg.sender, address(this), _share);
        updateMaxSharePerCollateral(address(_token), _collaterals, _maxShares);
        userTokens[address(_token)][msg.sender] = userTokens[address(_token)][msg.sender].add(_share);
    }

    //remove asset from Nabe
    function remove(IERC20 _token, uint256 _share) external {
        require(userTokens[address(_token)][msg.sender] >= _share, '_share can not be superior to the userToken share');
        bentoBox.transfer(_token, address(this), msg.sender, _share);
        userTokens[address(_token)][msg.sender] = userTokens[address(_token)][msg.sender].sub(_share);
    }

    //update maxShare per collaterals
    function updateMaxSharePerCollateral(address _token, address[] calldata _collaterals, uint256[] calldata _maxShares) private {
        for (uint256 i = 0; i < _collaterals.length; i += 1) {
            tokens[_token][_collaterals[i]] = tokens[_token][_collaterals[i]].add(_maxShares[i]);
        }
    }

    //todo check if kashiPair is a legit one
    function addInPair(IKashiPair pair, uint256 _share) external {
        pair.addAsset(address(this), false, _share);
    }

    //todo check if kashiPair is a legit one
    function removeFromPair(IKashiPair pair, uint256 _fraction) external {
        pair.removeAsset(address(this), _fraction);
    }

}
