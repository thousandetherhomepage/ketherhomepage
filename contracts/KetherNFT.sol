//SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// FIXME: Use 4.x pre-release which slims down the 721 implementation
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./IKetherHomepage.sol";

// XXX
import "hardhat/console.sol";

contract KetherNFT is ERC721 {
  /// instance is the KetherHomepage contract that this wrapper interfaces with.
  IKetherHomepage public instance;

  /// metadataSigner provides oracle authenticity for tokenURI content.
  address public metadataSigner;

  mapping (uint => address) prewrapped;

  // TODO: Do we want to emit events?

  constructor(address _ketherContract, address _metadataSigner) ERC721("Thousand Ether Homepage Ad", "1KAD") {
    instance = IKetherHomepage(_ketherContract);
    metadataSigner = _metadataSigner;
  }


  /*
     Migration process:
     1. KetherNFT.prepare(_idx) as KetherHomepage owner
     2. KetherHomepage.setAdOwner(_idx, address(KetherNFT))
     3. KetherNFT.wrap(_idx); as owner
  */

  /// prepare an ad unit to be wrapped. It confirms that the sender is the owner of the ad unit.
  function prepare(uint _idx) external {
    require(instance.ads[_idx].owner == msg.sender, "KetherNFT: prepare for sender that is not owner");

    prewrapped[idx] = msg.sender;
  }

  /// wrap mints an NFT if the ad unit's ownership has been trasnferred to this contract.
  function wrap(uint _idx) external {
    require(prewrapped[_idx] == msg.sender, "KetherNFT: wrap for sender that was not prewrapped");
    require(instance.ads[_idx].owner == address(this), "KetherNFT: owner needs to be this contract before wrapping");

    _mint(msg.sender, _idx);

    // Transfer contract ownership to this contract as a delegate.
    // -> KetherHomepage(_ketherContract).setAdOwner(_idx, newOwner);

    //bytes memory callEncoded = abi.encodePacked(bytes4(keccak256("setAdOwner(uint256,address)")), _idx, address(this));
    //bytes memory callEncoded = abi.encodeWithSignature("setAdOwner(uint256,address)", _idx, address(this));
    //Address.functionDelegateCall(address(instance), callEncoded, "KetherNFT: wrap delegatecall setAdOwner failed");

    //(bool success, bytes memory data) = address(instance).delegatecall(callEncoded);
  }

  function unwrap(uint _idx, address _newOwner) external {
    require(ownerOf(_idx) == msg.sender, "KetherNFT: unwrap for sender that is not owner");

    // TODO: Test that if this fails, the rest of the call fails
    instance.setAdOwner(_idx, _newOwner);

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
    // FIXME: Should this be ownerOf? Letting approved accounts publish would allow lending.
    require(getApproved(_idx) == msg.sender, "KetherNFT: publish for sender that is not approved");

    instance.publish(_idx, _link, _image, _title, _NSFW);
  }

}
