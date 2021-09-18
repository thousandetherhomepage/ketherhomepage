//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IKetherHomepage {
  function ads(uint _idx) external view returns (address,uint,uint,uint,uint,string memory,string memory,string memory,bool,bool);
  function getAdsLength() view external returns (uint);
}

interface IERC721 {
  function ownerOf(uint256) external view returns (address);
}

library Errors {
  string constant OnlyMagistrate = "only active magistrate can do this";
}

contract KetherSortition is Ownable {
  // MagistrateId is the tokenId of KetherNFT that controls the royalties purse for this epoch.
  uint256 public magistrateId;

  uint256 constant EPOCH_DURATION = 30 days; // TODO: Confirm OpenSea's royalty interval
  uint256 epochStarted;

  IERC721 ketherNFTContract;
  IKetherHomepage ketherContract;

  address[] nominations;
  bytes32[] precommits;

  constructor(address _ketherNFTContract, address _ketherContract) {
    ketherNFTContract = IERC721(_ketherNFTContract);
    ketherContract = IKetherHomepage(_ketherContract);

    epochStart = block.timestamp;
  }

  // Internal helpers:

  function _resetElection() internal {
    nominations = address[]();
    precommits = bytes32[]();
  }

  // Views:

  function getAdOwner(uint _idx) public view returns (address) {
    return ketherNFTContract.ownerOf(_idx);
  }

  function pixelCount(address owner) public view returns (uint256) {
    // XXX: Implement this
  }

  function chooseNextMagistrate() public view returns (uint256) {
    // TODO: Make sure duplicate nominations don't do anything weird
  }


  // External interface:

  /**
   * @dev Nominate address of held ads as a candidate for magistrate in the next epoch.
   * @param hashedSeed Keccak256 hash of entropy seed precommitment.
   */
  function nominateSelf(bytes32 hashedSeed) external {
    // XXX: Implement this
  }


  /*
    Precommit notes:
    1. (N x On-chain txn) Each participant submits hash(seed), where seed is a random value
    2. Epoch expires (preventing further submissions)
    3. (N x On-chain txn) Each participant reveals seed (smart contract confirms it matches original hash(seed))
    4. Seeds are mixed together (xor)
    5. (On-chain txn) Final mixed seed value used for entropy

    Chainlink VRF option:
    1. (N x On-chain txn) Each participant nominates themselves (no precommit needed)
    2. Epoch expires
    3. (On-chain txn) Election is called which sends a Chainlink.requestRandomness (with LINK payment)
    4. (On-chain txn) Chainlink does a callback to KetherSortition.fulfillRandomness with a random value, which we save
    5. (On-chain txn) Use saved random value to elect.
  */

  // Only magistrate:

  function withdraw() public {
    require(_msgSender() == _getAdOwner(magistrateId), Errors.OnlyMagistrate);
    // TODO: ...
  }


  // Only owner (admin helpers):

  function delayNextEpoch(uint256 nextEpoch) external onlyOwner {
    // XXX: Implement this.
    // TODO: Should this also allow adjusting the interval?
  }
}
