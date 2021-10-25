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
  string constant MustHaveBalance = "must have tokens to nominate";
  string constant OnlyMagistrate = "only active magistrate can do this";
  string constant MustHaveEntropy = "waiting for entropy";
  string constant MustHaveNominations = "must have nominations";
  string constant AlreadyStarted = "election already started";
  string constant NotExecuted = "election not executed";
  string constant TermNotExpired = "term not expired";
  string constant NotEnoughLink = "not enough LINK";
}

contract KetherSortition is Ownable, VRFConsumerBase {
  event Nominated(
      uint256 indexed termNumber,
      address nominator,
      uint256 pixels
  );

  event ElectionExecuting(
    uint256 indexed termNumber
  );

  event ElectionCompleted(
    uint256 indexed termNumber,
    uint256 magistrateToken,
    address currentTokenOwner
  );

  event StepDown(
    uint256 indexed termNumber,
    uint256 magistrateToken,
    address currentTokenOwner
  );

  struct Nomination{
    uint256 termNumber;
    uint256 nominatedToken;
  }

  // MagistrateToken is tokenId of an NFT whose owner controls the royalties purse for this term.
  uint256 public magistrateToken;

  uint256 constant MIN_ELECTION_DURATION = 2 days;
  uint256 constant TERM_DURATION = 6 weeks;
  uint256 constant PIXELS_PER_CELL = 100;

  uint256 public termStarted;
  uint256 public termExpires;
  uint256 public termNumber = 0;

  IERC721 ketherNFTContract;
  IKetherHomepage ketherContract;

  uint256[] public nominatedTokens;
  uint256 public nominatedPixels = 0;
  mapping(uint256 => Nomination) nominations; // mapping of tokenId => termNumber
  // TODO: mapping(uint256 => uint256) electedCount;

  uint256 public electionEntropy; // Provided by Chainlink

  // nominating -[term expired & startElection() calls]> waitingForEntropy -[Chainlink calls into fulfillrandomness()]> gotEntropy -[completeElection()] -> nominating
  enum StateMachine { NOMINATING, WAITING_FOR_ENTROPY, GOT_ENTROPY }
  StateMachine state = StateMachine.NOMINATING;

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
    require(state == StateMachine.WAITING_FOR_ENTROPY, Errors.NotExecuted);
    electionEntropy = randomness;
    state = StateMachine.GOT_ENTROPY;
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
    return width * height * PIXELS_PER_CELL;
  }

  function isNominated(uint256 _idx) public view returns (bool) {
    return nominations[_idx].termNumber > termNumber;
  }

  function getNominatedToken(uint256 _idx) public view returns (uint256) {
    require(isNominated(_idx), "erorr todo");

    return nominations[_idx].nominatedToken;
  }


  function getNextMagistrateToken() public view returns (uint256) {
    require(state == StateMachine.GOT_ENTROPY, Errors.MustHaveEntropy);
    require(nominatedTokens.length > 0, Errors.MustHaveNominations);

    uint256 pixelChosen = electionEntropy % nominatedPixels;
    uint256 curPixel = 0;

    for(uint256 i = 0; i < nominatedTokens.length; i++) {
      uint256 idx = nominatedTokens[i];
      curPixel += getAdPixels(idx);
      if (curPixel > pixelChosen) {
        return getNominatedToken(idx);
      }
    }
    return 0;
  }

  // External interface:

  // TODO: function nominateAll() external
  // TODO: function nominate(ownedTokenId) external

  /**
   * @dev Nominate tokens held by the sender as candidates for magistrate in the next term.
   *      Nominations of tokens are independent of their owner.
   * @return Number of nominated pixels
   *
   * TODO
   */
  function nominate(uint256 _ownedTokenId, uint256 _nominateTokenId) external returns (uint256) {
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    address sender = _msgSender();
    require(ketherNFTContract.ownerOf(_ownedTokenId) == sender, Errors.MustHaveBalance);

    uint256 pixels = _nominate(_ownedTokenId, _nominateTokenId);
    emit Nominated(termNumber+1, sender, pixels);

    return pixels;
  }

  /**
   * @dev Nominate tokens held by the sender as candidates for magistrate in the next term
   *      Nominations of tokens are independent of their owner.
   * @return Number of nominated pixels
   * TODO
   */
  function nominateAll(uint256 _nominateTokenId) external returns (uint256) {
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    address sender = _msgSender();
    require(ketherNFTContract.balanceOf(sender) > 0, Errors.MustHaveBalance);

    uint256 pixels = 0;
    for (uint256 i = 0; i < ketherNFTContract.balanceOf(sender); i++) {
      uint256 idx = ketherNFTContract.tokenOfOwnerByIndex(sender, i);
      pixels += _nominate(idx, _nominateTokenId);
    }

    nominatedPixels += pixels;

    emit Nominated(termNumber+1, sender, pixels);
    return pixels;
  }

  function nominateSelf() external returns (uint256) {
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    address sender = _msgSender();
    require(ketherNFTContract.balanceOf(sender) > 0, Errors.MustHaveBalance);

    uint256 pixels = 0;
    for (uint256 i = 0; i < ketherNFTContract.balanceOf(sender); i++) {
      uint256 idx = ketherNFTContract.tokenOfOwnerByIndex(sender, i);
      pixels += _nominate(idx, idx);
    }

    nominatedPixels += pixels;

    emit Nominated(termNumber+1, sender, pixels);
    return pixels;
  }

  function _nominate(uint256 _ownedTokenId, uint256 _nominateTokenId) internal returns (uint256 pixels) {
      // Only push the ad and update pixel count if it's not been nominated before
      if (!isNominated(_ownedTokenId)) {
        pixels += getAdPixels(_ownedTokenId);
        nominatedTokens.push(_ownedTokenId);
      }

      nominations[_ownedTokenId] = Nomination(termNumber + 1, _nominateTokenId);

      return pixels;
  }


  // TODO: Do we want nominateOther, so people can easily delegate their nominations?

  // TODO: Do we want to have a unNominateSelf()

  /**
   * @dev Stop accepting nominations, start election.
   */
  function startElection() external {
    // FIXME: check that term expired
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    require(nominatedTokens.length > 0, Errors.MustHaveNominations);
    require(termExpires <= block.timestamp, Errors.TermNotExpired);
    require(LINK.balanceOf(address(this)) >= s_fee, Errors.NotEnoughLink);

    // TODO: check if this is a re-entry vector
    state = StateMachine.WAITING_FOR_ENTROPY;
    requestRandomness(s_keyHash, s_fee);

    emit ElectionExecuting(termNumber);
  }

  /**
   * @dev Assign new magistrate and open up for nominations for next election.
   */
  function completeElection() external {
    require(state == StateMachine.GOT_ENTROPY, Errors.MustHaveEntropy);
    magistrateToken = getNextMagistrateToken();

    // FIXME: This is going to stagger terms, do we want to align them to
    // royalty payouts? Or maybe we could assign payouts to terms on a payment
    // receiver.
    termNumber += 1;
    termStarted = block.timestamp;
    termExpires = termStarted + TERM_DURATION;

    delete nominatedTokens;
    nominatedPixels = 0;
    state = StateMachine.NOMINATING;

    emit ElectionCompleted(termNumber, magistrateToken, getMagistrate());
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

    emit StepDown(termNumber, magistrateToken, _msgSender());
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
