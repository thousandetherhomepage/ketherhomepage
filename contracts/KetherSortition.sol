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

interface IERC20 {
  function balanceOf(address account) external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
}

library Errors {
  string constant MustHaveBalance = "must have balance to nominate";
  string constant OnlyMagistrate = "only active magistrate can do this";
  string constant MustHaveEntropy = "election not executed";
  string constant AlreadyStarted = "election already started";
  string constant AlreadyExecuted = "election already executed";

  // TODO: deadcode
  string constant AlreadyNominated = "address already nominated";
  string constant TermNotExpired = "term has not expired";

  string constant NotEnoughLink = "not enough LINK";
}

// TODO: Emit events.

contract KetherSortition is Ownable, VRFConsumerBase {
  // MagistrateToken is tokenId of an NFT whose owner controls the royalties purse for this term.
  uint256 public magistrateToken;

  uint256 constant MIN_ELECTION_DURATION = 2 days;
  uint256 constant TERM_DURATION = 6 weeks;

  uint256 termStarted;
  uint256 termExpires;
  uint256 termNumber = 0;

  IERC721 ketherNFTContract;
  IKetherHomepage ketherContract;

  uint256[] public nominatedTokens;
  uint256 public nominatedPixels = 0;
  mapping(uint256 => uint256) nominations; // mapping of tokenId => termNumber
  // TODO: mapping(uint256 => uint256) electedCount;

  uint256 electionEntropy; // Provided by Chainlink

  uint8 constant STATE_NOMINATING = 0;
  uint8 constant STATE_WAITING_FOR_ENTROPY = 1;
  uint8 constant STATE_GOT_ENTROPY = 2;
  uint8 state = 0;

  // nominating -[term expired & startElection() calls]> waitingForEntropy -[Chainlink calls into fullfillrandomness()]> gotEntropy -[completeElection()] -> nominating

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

    termExpires = block.timestamp + MIN_ELECTION_DURATION;
  }

  // Internal helpers:

  /**
   * @dev Only callable by Chainlink VRF, async triggered via startElection().
   */
  function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
    require(state == STATE_WAITING_FOR_ENTROPY, Errors.AlreadyExecuted);
    electionEntropy = randomness;
    state = STATE_GOT_ENTROPY;
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

  function isNominated(uint256 _idx) public view returns (bool) {
    return nominations[_idx] > termNumber;
  }

  function getNextMagistrateToken() public view returns (uint256) {
    require(state == STATE_GOT_ENTROPY, Errors.MustHaveEntropy);
    // FIXME: Check off-by-ones

    uint256 pixelChosen = electionEntropy % nominatedPixels;
    uint256 curPixel = 0;

    for(uint256 i = 0; i < nominatedTokens.length; i++) {
      uint256 idx = nominatedTokens[i];
      curPixel += getAdPixels(idx);
      if (curPixel > pixelChosen) {
        return idx;
      }
    }
  }

  // External interface:

  /**
   * @dev Nominate tokens held by the sender as candidates for magistrate in the next term.
   *      Nominations of tokens are independent of their owner.
   * @return Number of nominated pixels
   */
  function nominateSelf() external returns (uint256) {
    require(state == STATE_NOMINATING, Errors.AlreadyStarted);
    address sender = _msgSender();
    require(ketherNFTContract.balanceOf(sender) > 0, Errors.MustHaveBalance);

    uint256 pixels = 0;
    for (uint256 i = 0; i < ketherNFTContract.balanceOf(sender); i++) {
      uint256 idx = ketherNFTContract.tokenOfOwnerByIndex(sender, i);
      if (!isNominated(idx)) {
        pixels += getAdPixels(idx);
        nominations[idx] = termNumber + 1;
        nominatedTokens.push(idx);
        // TODO: emit nomintated event
      }
    }

    nominatedPixels += pixels;
    return pixels;
  }

  // TODO: do we want to have a unNominateSelf()

  /**
   * @dev Stop accepting nominations, start election.
   */
  function startElection() external {
    //FIXME: check that term expired
    require(state == STATE_NOMINATING, Errors.AlreadyExecuted);
    require(termExpires <= block.timestamp, Errors.TermNotExpired);
    require(LINK.balanceOf(address(this)) >= s_fee, Errors.NotEnoughLink);

    // TODO: check if this is a re-entry vector
    state = STATE_WAITING_FOR_ENTROPY;
    requestRandomness(s_keyHash, s_fee);
  }

  /**
   * @dev Assign new magistrate and open up for nominations for next election.
   */
  function completeElection() external {
    require(state == STATE_GOT_ENTROPY, Errors.MustHaveEntropy);
    magistrateToken = getNextMagistrateToken();

    // FIXME: This is going to stagger terms, do we want to align them to
    // royalty payouts? Or maybe we could assign payouts to terms on a payment
    // receiver.
    termNumber += 1;
    termStarted = block.timestamp;
    termExpires = termStarted + TERM_DURATION;

    delete nominatedTokens;
    nominatedPixels = 0;
    state = STATE_NOMINATING;
  }


  // Only magistrate:

  /// @dev Transfer balance controlled by magistrate.
  function withdraw(address payable to) public {
    require(_msgSender() == getMagistrate(), Errors.OnlyMagistrate);
    // NOTE: you have exclusive rights to withdraw until the end of your term.
    // afterwards it becomes a race as someone call call an election.

    // FIXME: Would it be fun if this required having a >2 LINK balance to
    // withdraw? If we wanna be super cute, could automagically buy LINK from
    // the proceeds before transferring the remaining balance.

    to.transfer(address(this).balance);
  }

  /// @dev Cut the term short, leaving enough time for new nominations.
  function stepDown() public {
    require(_msgSender() == getMagistrate(), Errors.OnlyMagistrate);

    uint256 timeRemaining = termExpires - block.timestamp;
    if (timeRemaining > MIN_ELECTION_DURATION) {
      termExpires = block.timestamp + MIN_ELECTION_DURATION;
    }

    // TODO: Emit event
  }

  // Only owner (admin helpers):

  // TODO: adminUpdateChainlinkValues(bytes32 keyHash, uint256 fee) external onlyOwner

  function adminDelayNextEpoch(uint256 nextEpoch) external onlyOwner {
    // XXX: Implement this.
    // TODO: Should this also allow adjusting the interval?
  }

  /**
   * @dev Withdraw ERC20 tokens, primarily for rescuing remaining LINK once the
   *      experiment is over.
   */
  function adminWithdrawToken(IERC20 token, address to) external onlyOwner {
    // XXX: Add require to confirm that the contract is suspended?
    token.transfer(to, token.balanceOf(address(this)));
  }
}
