//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

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
  string constant MustOwnToken = "must own token";
  string constant OnlyMagistrate = "only active magistrate can do this";
  string constant MustHaveEntropy = "waiting for entropy";
  string constant MustHaveNominations = "must have nominations";
  string constant AlreadyStarted = "election already started";
  string constant NotExecuted = "election not executed";
  string constant TermNotExpired = "term not expired";
  string constant NotEnoughLink = "not enough LINK";
  string constant NotNominated = "token is not nominated";
}

contract KetherSortitionV2 {
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

  event ReceivedPayment(
    uint256 indexed termNumber,
    uint256 value
  );

  struct Nomination{
    uint256 termNumber;
    uint256 nominatedToken;
  }
  uint256 constant PIXELS_PER_CELL = 100;

  /// @notice tokenId of an NFT whose owner controls the royalties purse for this term.
  uint256 public magistrateToken;
  /// @notice length of magistrate term
  uint256 public termDuration;
  /// @notice minimum time period for new nominations (e.g. if a magistrate steps down)
  uint256 public minElectionDuration;
  /// @notice timestamp of start of current term
  uint256 public termStarted;
  /// @notice timestamp of end of current term
  uint256 public termExpires;
  /// @notice current term
  uint256 public termNumber = 0;

  IERC721 ketherNFTContract;
  IKetherHomepage ketherContract;

  /// @dev tokenIDs nominated in the current term
  uint256[] public nominatedTokens;
  /// @dev count of pixels nominated in the current term
  uint256 public nominatedPixels = 0;
  mapping(uint256 => Nomination) nominations; // mapping of tokenId => {termNumber, nominatedToken}

  uint256 public electionEntropy;

  // Note: WAITING_FOR_ENTROPY is legacy leftover from when we used Chainlink. Trying to make minimal changes to avoid introducing new bugs.
  // nominating -[term expired & startElection() calls]> waitingForEntropy -[Chainlink calls into fulfillrandomness()]> gotEntropy -[completeElection()] -> nominating
  enum StateMachine { NOMINATING, WAITING_FOR_ENTROPY, GOT_ENTROPY }
  StateMachine public state = StateMachine.NOMINATING;

  constructor(address _ketherNFTContract, address _ketherContract, uint256 _termDuration, uint256 _minElectionDuration ) {
    ketherNFTContract = IERC721(_ketherNFTContract);
    ketherContract = IKetherHomepage(_ketherContract);

    termDuration = _termDuration;
    minElectionDuration = _minElectionDuration;
    termExpires = block.timestamp + _termDuration;
  }

  receive() external payable {
    emit ReceivedPayment(termNumber, msg.value);
  }

  // Internal helpers:

  function _getEntropy() view internal returns(uint256) {
    // Borrowed from: https://github.com/1001-digital/erc721-extensions/blob/f5c983bac8989bc5ebf9b34c03f28e438da9a7b3/contracts/RandomlyAssigned.sol#L27
    return uint256(keccak256(
      abi.encodePacked(
        block.coinbase,
        block.difficulty,
        block.gaslimit,
        block.timestamp)));
  }

  /// @dev _nominate does not check token ownership, must already be checked.
  /// @param _ownedTokenId Token to nominate from
  /// @param _nominateTokenId Token to nominate to.
  function _nominate(uint256 _ownedTokenId, uint256 _nominateTokenId) internal returns (uint256 pixels) {
    // Only push the ad and update pixel count if it's not been nominated before
    if (!isNominated(_ownedTokenId)) {
      pixels += getAdPixels(_ownedTokenId);
      nominatedTokens.push(_ownedTokenId);
    }

    nominations[_ownedTokenId] = Nomination(termNumber + 1, _nominateTokenId);

    return pixels;
  }

  /// @dev _nominate does not check token ownership, must already be checked.
  /// @param _nominateSelf if true each token nominates itself
  /// @param _nominateTokenId if nominateSelf is false, token to nominate to. Must be a NFT-wrapped token
  function _nominateAll(bool _nominateSelf, uint256 _nominateTokenId) internal returns (uint256) {
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    address sender = msg.sender;
    require(ketherNFTContract.balanceOf(sender) > 0, Errors.MustOwnToken);
    // This checks that the _nominateTokenId is minted, will revert otherwise
    require(_nominateSelf || ketherNFTContract.ownerOf(_nominateTokenId) != address(0));


    uint256 pixels = 0;
    for (uint256 i = 0; i < ketherNFTContract.balanceOf(sender); i++) {
      uint256 idx = ketherNFTContract.tokenOfOwnerByIndex(sender, i);
      if (_nominateSelf) {
        pixels += _nominate(idx, idx);
      } else {
        pixels += _nominate(idx, _nominateTokenId);
      }
    }

    nominatedPixels += pixels;

    // Note this is emitted in the helper while `nominate` emits the event in the public function
    emit Nominated(termNumber+1, sender, pixels);
    return pixels;
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
    require(isNominated(_idx), Errors.NotNominated);

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

  /**
   * @notice Nominate tokens held by the sender as candidates for magistrate in the next term.
   *      Nominations of tokens are independent of their owner.
   * @param _ownedTokenId Token to nominate from
   * @param _nominateTokenId tokenId to count nominations towards. Must be an NFT-wrapped token.
   * @return Number of nominated pixels.
   *
   * Emits {Nominated} event.
   */
  function nominate(uint256 _ownedTokenId, uint256 _nominateTokenId) external returns (uint256) {
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    address sender = msg.sender;
    require(ketherNFTContract.ownerOf(_ownedTokenId) == sender, Errors.MustOwnToken);
    // This checks that the _nominateTokenId is minted, will revert otherwise
    require(ketherNFTContract.ownerOf(_nominateTokenId) != address(0));
    uint256 pixels = _nominate(_ownedTokenId, _nominateTokenId);

    // Note this is emitted in the public function while `_nominateAll` emits the event in the helper
    emit Nominated(termNumber+1, sender, pixels);

    return pixels;
  }

  /**
   * @notice Nominate tokens held by the sender as candidates towards a specific `_nominateTokenId` as magistrate in the next term
   * @param _nominateTokenId tokenId to count nominations towards. Must be an NFT-wrapped token.
   * @return Number of nominated pixels.
   *
   * Emits {Nominated} event.
   */
  function nominateAll(uint256 _nominateTokenId) public returns (uint256) {
    return _nominateAll(false, _nominateTokenId);
  }

  /**
   * @notice Nominate tokens held by the sender as candidates towards a specific `_nominateTokenId` as magistrate in the next term
   * @return Number of nominated pixels.
   *
   * Emits {Nominated} event.
   */
  function nominateSelf() public returns (uint256) {
    return _nominateAll(true, 0);
  }

  /**
   * @notice Stop accepting nominations, start election.
   *
   * Emits {ElectionExecuting} event.
   */
  function startElection() external {
    require(state == StateMachine.NOMINATING, Errors.AlreadyStarted);
    require(nominatedTokens.length > 0, Errors.MustHaveNominations);
    require(termExpires <= block.timestamp, Errors.TermNotExpired);

    electionEntropy = _getEntropy();
    state = StateMachine.GOT_ENTROPY;

    emit ElectionExecuting(termNumber);
  }

  /**
   * @notice Assign new magistrate and open up for nominations for next election.
   *
   * Emits {ElectionCompleted} event.
   */
  function completeElection() external {
    require(state == StateMachine.GOT_ENTROPY, Errors.MustHaveEntropy);
    magistrateToken = getNextMagistrateToken();

    termNumber += 1;
    termStarted = block.timestamp;
    termExpires = termStarted + termDuration;

    delete nominatedTokens;
    nominatedPixels = 0;
    state = StateMachine.NOMINATING;

    emit ElectionCompleted(termNumber, magistrateToken, getMagistrate());
  }


  // Only magistrate:

  /// @notice Transfer balance controlled by magistrate.
  /// @notice Magistrate has exclusive rights to withdraw until the end of term.
  /// @notice Remaining balance after the next election is rolled over to the next magistrate.
  function withdraw(address payable to) public {
    require(msg.sender == getMagistrate(), Errors.OnlyMagistrate);

    to.transfer(address(this).balance);
  }

  /// @notice Magistrate can withdraw token deposits.
  function withdrawToken(IERC20 token, address to) external {
    require(msg.sender == getMagistrate(), Errors.OnlyMagistrate);

    token.transfer(to, token.balanceOf(address(this)));
  }

  /// @notice Cut the term short, leaving enough time for new nominations.
  /// Emits {StepDown} event.
  function stepDown() public {
    require(msg.sender == getMagistrate(), Errors.OnlyMagistrate);

    uint256 timeRemaining = termExpires - block.timestamp;
    if (timeRemaining > minElectionDuration) {
      termExpires = block.timestamp + minElectionDuration;
    }

    emit StepDown(termNumber, magistrateToken, msg.sender);
  }
}
