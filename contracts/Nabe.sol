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

    //asset => kashiPair => maxShare
    mapping (address => mapping (address => uint)) public tokens;

    constructor(IBentoBoxV1 _bentoBox, IKashiPair _kashiMaster) public {
        bentoBox = _bentoBox;
        kashiMaster = _kashiMaster;
    }

    modifier maxShareDontExceedShare(uint256 _share, uint256[] calldata _maxShares) {
        for (uint256 i = 0; i < _maxShares.length; i += 1) {
            require(_share >= _maxShares[i], 'Nabe: Max share can not exceed your balance');
        }
        _;
    }

    //Deposit token and update max share per collateral
    function deposit(IERC20 _token, uint256 _share, IKashiPair[] calldata _kashiPairs, uint256[] calldata _maxShares) maxShareDontExceedShare(_share, _maxShares) external {
        bentoBox.registerProtocol();
        bentoBox.transfer(_token, msg.sender, address(this), _share);
        updateMaxSharePerKashiPair(address(_token), _kashiPairs, _maxShares);
        userTokens[address(_token)][msg.sender] = userTokens[address(_token)][msg.sender].add(_share);
    }

    //remove asset from Nabe
    function remove(IERC20 _token, uint256 _share) external {
        require(userTokens[address(_token)][msg.sender] >= _share, 'Nabe: _share can not be superior to the userToken share');
        bentoBox.transfer(_token, address(this), msg.sender, _share);
        userTokens[address(_token)][msg.sender] = userTokens[address(_token)][msg.sender].sub(_share);
    }

    //update maxShare per collaterals
    function updateMaxSharePerKashiPair(address _token, IKashiPair[] calldata _kashiPairs, uint256[] calldata _maxShares) private {
        for (uint256 i = 0; i < _kashiPairs.length; i += 1) {
            require(address(_kashiPairs[i].asset()) == _token, 'Nabe: _kashiPair.asset() and deposited _token must be the same');
            tokens[_token][address(_kashiPairs[i])] = tokens[_token][address(_kashiPairs[i])].add(_maxShares[i]);
        }
    }

    function addInPair(IKashiPair pair, uint256 _share) external {
        pair.addAsset(address(this), false, _share);
    }

    function removeFromPair(IKashiPair pair, uint256 _fraction) external {
        pair.removeAsset(address(this), _fraction);
    }

}
