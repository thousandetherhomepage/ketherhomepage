//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

interface IKetherHomepage {
  function ads(uint _idx) external view returns (address,uint,uint,uint,uint,string memory,string memory,string memory,bool,bool);
  function getAdsLength() view external returns (uint);
}

interface IERC721 {
  function ownerOf(uint256) external view returns (address);
  function balanceOf(address) external view returns (uint256);
  function tokenOfOwnerByIndex(address, uint256) external view returns (uint256);
}

library Errors {
  string constant MustHaveBalance = "must have balance to nominate";
  string constant OnlyMagistrate = "only active magistrate can do this";
  string constant MustHaveEntropy = "election not executed";
  string constant AlreadyStarted = "election already started";
  string constant AlreadyExecuted = "election already executed";

  string constant NotEnoughLink = "not enough LINK";
}

// TODO: Emit events.

contract KetherSortition is Ownable, VRFConsumerBase {
  // MagistrateToken is tokenId of an NFT whose owner controls the royalties purse for this term.
  uint256 public magistrateToken;

  uint256 constant TERM_DURATION = 30 days; // TODO: Confirm OpenSea's royalty interval
  uint256 termStarted;
  uint256 termExpires;

  IERC721 ketherNFTContract;
  IKetherHomepage ketherContract;

  address[] nominations; // TODO: Could store a struct{ address, idx, pixels }[] and confirm ownership in getNextMagistrate
  uint256 electionEntropy;

  bool waitingForEntropy = false;
  bool gotEntropy = false;
  bool nominating = true;

  // Chainlink values
  bytes32 private s_keyHash;
  uint256 private s_fee;

  constructor(address _ketherNFTContract, address _ketherContract, address vrfCoordinator, address link, bytes32 keyHash, uint256 fee)
  public
  VRFConsumerBase(vrfCoordinator, link) {
    s_keyHash = keyHash;
    s_fee = fee;

    ketherNFTContract = IERC721(_ketherNFTContract);
    ketherContract = IKetherHomepage(_ketherContract);
  }

  // Internal helpers:

  /**
   * @dev Called during completeElection.
   */
  function _resetElection() internal {
    delete nominations;

    waitingForEntropy = false;
    gotEntropy = false;
    nominating = true;
  }

  /**
   * @dev Only callable by Chainlink VRF, async triggered via startElection().
   */
  function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
    gotEntropy = true;
    electionEntropy = randomness;
  }

  // Views:

  function getMagistrate() public view returns (address) {
    return getAdOwner(magistrateToken);
  }

  function getAdOwner(uint256 _idx) public view returns (address) {
    return ketherNFTContract.ownerOf(_idx);
  }

  function getAdPixels(uint256 _idx) public view returns (uint256) {
    (,,,uint width,uint height,,,,,) = ketherContract.ads(_idx);
    return width * height * 10;
  }

  function pixelCount(address owner) public view returns (uint256) {
    uint256 count = 0;
    for (uint256 i = 0; i < ketherNFTContract.balanceOf(owner); i++) {
      uint256 idx = ketherNFTContract.tokenOfOwnerByIndex(owner, i);
      count += getAdPixels(idx);
    }
    return count;
  }

  function getNextMagistrateToken() public view returns (uint256) {
    require(gotEntropy, Errors.MustHaveEntropy);

    // FIXME: Don't love this code, can we do it more efficiently? Only the
    // known next magistrate will have to call it on-chain.

    // FIXME: Can't have inline mappings like this, need to deduplicate in contract state
    mapping(address => uint256) memory counts;
    uint256[] memory nominationCounts;

    uint256 total = 0;
    for(uint256 i = 0; i < nominations.length; i++) {
      address n = nominations[i];
      if (counts[n] != 0) continue; // Double nomination, skip (nominationCounts[i] remains 0)

      uint256 count = pixelCount(n);
      counts[n] = count;
      total += count;
    }

    // FIXME: Check off-by-ones

    uint256 pixelChosen = electionEntropy.mod(total);
    uint256 pixelCursor = 0;
    address nominated;
    for(uint256 i = 0; i < nominations.length; i++) {
      pixelCursor += counts[nominations[i]];
      if (pixelCursor >= pixelChosen) {
        nominated = nominations[i];
      }
    }

    // Choose ad owned by nominated (reverse traverse until we land on relative pixelChosen within pixelCursor window)
    pixelCursor -= pixelChosen;
    for (uint256 i = ketherNFTContract.balanceOf(owner) - 1; i >= 0; i--) {
      uint256 idx = ketherNFTContract.tokenOfOwnerByIndex(owner, i);
      uint256 pixels = getAdPixels(idx);
      if (pixels > pixelCursor) return idx;
      pixelCursor -= pixels;
    }
  }


  // External interface:

  /**
   * @dev Nominate address of held NFTs as a candidate for magistrate in the next epoch.
   */
  function nominateSelf() external {
    require(!waitingForEntropy, Errors.AlreadyStarted);

    address sender = _msgSender();
    require(ketherNFTContract.balanceOf(sender) > 0, Errors.MustHaveBalance);

    nominations.push(address);
  }

  /**
   * @dev Stop accepting nominations, start election.
   */
  function startElection() external {
    require(!waitingForEntropy && !gotEntropy, Errors.AlreadyExecuted);
    require(LINK.balanceOf(address(this)) >= s_fee, Errors.NotEnoughLink);

    waitingForEntropy = true;
    requestRandomness(s_keyHash, s_fee);
  }

  /**
   * @dev Assign new magistrate and open up for nominations for next election.
   */
  function completeElection() external {
    magistrateToken = getNextMagistrateToken();

    // FIXME: This is going to stagger terms, do we want to align them to
    // royalty payouts? Or maybe we could assign payouts to terms on a payment
    // receiver.
    termStarted = block.timestamp;
    termExpires = termStarted + TERM_DURATION;

    _resetElection();
  }


  // Only magistrate:

  function withdraw(address payable to) public {
    require(_msgSender() == getMagistrate(), Errors.OnlyMagistrate);

    // FIXME: Would it be fun if this required having a >2 LINK balance to
    // withdraw? If we wanna be super cute, could automagically buy LINK from
    // the proceeds before transferring the remaining balance.

    to.transfer(address(this).balance);
  }


  // Only owner (admin helpers):

  // TODO: adminUpdateChainlinkValues(bytes32 keyHash, uint256 fee) external onlyOwner

  function adminDelayNextEpoch(uint256 nextEpoch) external onlyOwner {
    // XXX: Implement this.
    // TODO: Should this also allow adjusting the interval?
  }

  /**
   * @dev Withdraw remaining LINK, for rescuing once the experiment is over.
   */
  function adminWithdrawLINK(address to) external onlyOwner {
    // XXX: Add require to confirm that the contract is suspended
    LINK.transfer(to, LINK.balanceOf(this));
  }
}
