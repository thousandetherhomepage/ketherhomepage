//SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// FIXME: Use 4.x pre-release which slims down the 721 implementation
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./IKetherHomepage.sol";

// XXX
import "hardhat/console.sol";


// 1. Precompute deterministic contract address 0xSWAP
// 2. Call on-chain KetherHomepage.setAdOwner(_idx, 0xSWAP)
// 3. Call on-chain deploy TransientOwnerSwapper(address(KetherNFT), _idx) to address 0xSWAP
//    -> Inside, it calls KetherNFT.wrap(_idx)?

contract TransientOwnerSwapper {
  uint idx;
  address to;
  IKetherHomepage kether;

  constructor(IKetherHomepage _kether, KetherNFT _target, uint _idx) {
    idx = _idx;
    to = address(_target);
    kether = _kether;

    _target.wrap(_idx, msg.sender);

    selfdestruct();
  }

  function transfer() external {
    _kether.setAdOwner(idx, to);
  }
}

contract Wrapper {
  address authorized;

  constructor(address _authorized) {
    authorized = _authorized;
  }

  function call(address target, bytes memory payload) (bool, bytes memory) {
    require(msg.sender == authorized, "Wrapper: call must be done by authorized sender");

    return target.call(payload);
  }
}

interface Transferer {
  function transfer(address _from, address _to, uint _tokenId) external;
}

contract KetherNFT is ERC721 {
  /// instance is the KetherHomepage contract that this wrapper interfaces with.
  IKetherHomepage public instance;

  /// metadataSigner provides oracle authenticity for tokenURI content.
  address public metadataSigner;

  // TODO: Do we want to emit events?

  constructor(address _ketherContract, address _metadataSigner) ERC721("Thousand Ether Homepage Ad", "1KAD") {
    instance = IKetherHomepage(_ketherContract);
    metadataSigner = _metadataSigner;
  }

  function precompute(address _owner) pure public (bytes32 salt, address wrapper) {
    bytes32 salt = bytes32(_owner);

    address predictedAddress = address(uint160(uint(keccak256(abi.encodePacked(
      bytes1(0xff),
      address(this),
      salt,
      keccak256(abi.encodePacked(
        type(D).creationCode,
        arg
      ))
    )))));
    return salt, predictedAddress;
  }

  /// wrap mints an NFT if the ad unit's ownership has been trasnferred to this contract.
  function wrap(uint _idx, address _owner) external {
    bytes32 salt, address precomputerWrapper = precompute(_owner);

    require(instance.ads[_idx].owner == precomputedWrapper, "KetherNFT: owner needs to be our wrapper");

    // TODO: Check if wrapper already exists on precomputed address, use that instead.
    Wrapper w = new Wrapper{salt: salt}(address(this));
    require(address(w) == precomputedWrapper, "KetherNFT: precomputedWrapper is incorrect");

    (bool success,) = w.call(
      address(instance),
      abi.encodeWithSignature("setAdOwner(uint256,address)", _idx, address(this)));
    require(success, "KetherNFT: setAdOwner call failed");

    require(instance.ads[_idx].owner == address(this), "KetherNFT: owner needs to be KetherNFT");
    _mint(_owner, _idx);
  }

  function unwrap(uint _idx, address _newOwner) external {
    require(ownerOf(_idx) == msg.sender, "KetherNFT: unwrap for sender that is not owner");

    (bool success,) = w.call(
      address(instance),
      abi.encodeWithSignature("setAdOwner(uint256,address)", _idx, msg.sender));
    require(success, "KetherNFT: setAdOwner call failed");

    _burn(_idx);
  }

  // TODO: Should we have a setTokenURI function so owners can change the rendering of their token?
  // TODO: If we let people set their own tokenURI, do we need another NSFW flag option here?

  function tokenURI(uint256 _tokenId) public view virtual override(ERC721) returns (string memory) {
    // FIXME: Replace with IPFS URI? Perhaps set on wrap?
    return "ipfs://1000ether.com/ad/TODO"; // FIXME: Need to convert the uint256 to string, maybe Strings.uint2str?
  }

  /// publish is a delegated proxy for KetherHomapage's publish function.
  ///
  /// Publish allows for setting the link, image, and NSFW status for the ad
  /// unit that is identified by the idx which was returned during the buy step.
  /// The link and image must be full web3-recognizeable URLs, such as:
  ///  - bzz://a5c10851ef054c268a2438f10a21f6efe3dc3dcdcc2ea0e6a1a7a38bf8c91e23
  ///  - bzz://mydomain.eth/ad.png
  ///  - https://cdn.mydomain.com/ad.png
  ///  - https://ipfs.io/ipfs/Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu
  ///  - ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu
  /// Images should be valid PNG.
  /// Content-addressable storage links like IPFS are encouraged.
  function publish(uint _idx, string calldata _link, string calldata _image, string calldata _title, bool _NSFW) external {
    require(getApproved(_idx) == msg.sender, "KetherNFT: publish for sender that is not approved");

    // TODO: Finish this lol
    (bool success,) = w.call(
      address(instance),
      abi.encodeWithSignature("publish(uint256,string,string,string,bool)", _idx, _link, _image, _title, _NSFW));

    require(success, "KetherNFT: publish call failed");
  }

}
