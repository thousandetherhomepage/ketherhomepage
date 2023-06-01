//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";

interface IKetherNFTPublish {
  /// @dev See {KetherNFT-publish}.
  function publish(uint _idx, string calldata _link, string calldata _image, string calldata _title, bool _NSFW) external;
}

interface IKetherSortition {
  /// @dev See {KetherSortition-getMagistrate}.
  function getMagistrate() external view returns (address);
}

library Errors {
  string constant MustBeApproved = "must be approved";
  string constant OwnerChanged = "owner changed since approved";
}

/**
 * @notice KetherNFTPublisher allows an owner of a KetherNFT to delegate
 * publishing permission to another address. Only one address can be approved
 * at a time.
 *
 * Approving the ketherSortition address will give the acting magistrate
 * permission to publish.
 *
 * 1. Owner of KetherNFT sets KetherNFTPublisher instance as approved spender:
 *      KetherNFT.approve(address(KetherNFTPublisher), tokenId);
 * 2. Owner of KetherNFT sets approvals on KetherNFTPublisher instance for
 *    approved publisher:
 *      KetherNFTPublisher.approve(address(publisher), tokenId);
 * 3. Approved publisher can use:
 *      KetherNFTPublisher.publish(tokenId, ...)
 * 4. Owner can clear approval:
 *      KetherNFTPublisher.approve(address(0), tokenId);
 * 5. Owner can approve the magistrate:
 *      KetherNFT.approve(address(ketherSortition), tokenId);
 */
contract KetherNFTPublisher is Context, IKetherNFTPublish {
  IKetherNFT public ketherNFT;

  IKetherSortition public ketherSortition;

  // We can't trigger approval clearing when underlying tokens are transferred,
  // so we track who made the approval and reject if the owner changes.
  struct Approval{
    address from;
    address to;
  }

  // Mapping from token ID to approved address
  mapping(uint256 => Approval) private _tokenApprovals;

  // Mapping from owner to operator approvals
  mapping(address => mapping(address => bool)) private _operatorApprovals;

  constructor(address _ketherNFTContract, address _ketherSortitionContract) {
    ketherNFT = IKetherNFT(_ketherNFTContract);
    ketherSortition = IKetherSortition(_ketherSortitionContract);
  }

  /**
   * @notice Sets an address that is allowed to publish for tokenId.
   * @dev See {IERC721-getApproved}.
   *
   * Must be the token's owner.
   */
  function approve(address to, uint256 tokenId) public {
    address owner = ketherNFT.ownerOf(tokenId);
    require(to != owner, "ERC721: approval to current owner");

    require(
        _msgSender() == owner || ketherNFT.isApprovedForAll(owner, _msgSender()),
        "ERC721: approve caller is not owner nor approved for all"
    );

    _tokenApprovals[tokenId] = Approval(owner, to);
    emit ERC721.Approval(owner, to, tokenId);
  }

  /**
   * @notice Returns an address that is approved to publish to this tokenId.
   * @dev See {IERC721-getApproved}.
   */
  function getApproved(uint256 tokenId) public view returns (address) {
      address owner = ketherNFT.ownerOf(tokenId); // Assert that token exists
      Approval a = _tokenApprovals[tokenId];
      require(owner == a.from, Errors.OwnerChanged); 
      return a.to;
  }

  /**
   * @dev See {IERC721-setApprovalForAll}.
   */
  function setApprovalForAll(address operator, bool approved) public {
    require(operator != _msgSender(), "ERC721: approve to caller");

    _operatorApprovals[_msgSender()][operator] = approved;
    emit IERC721.ApprovalForAll(_msgSender(), operator, approved);
  }

  /**
   * @dev See {IERC721-isApprovedForAll}.
   */
  function isApprovedForAll(address owner, address operator) public view returns (bool) {
    return _operatorApprovals[owner][operator];
  }

  /**
   * @dev Returns whether `publisher` is allowed to manage `tokenId`.
   */
  function isApprovedToPublish(address publisher, uint256 tokenId) public view returns (bool) {
    address owner = ketherNFT.ownerOf(tokenId); // Implicitly checks tokenId validity
    if (publisher == owner || ketherNFT.isApprovedForAll(owner, publisher)) {
        return true;
    }
    address approved = ketherNFT.getApproved(tokenId);
    if (approved == publisher) {
        return true;
    }

    // Is Magistrate allowed to publish?
    address magistrate = ketherSortition.getMagistrate();
    if (magistrate != publisher) {
        // Publisher is not the magistrate, nevermind.
        return false;
    }

    // Sortition contract approved means the magistrate is approved
    return (
        approved == address(ketherSortition) ||
        ketherNFT.isApprovedForAll(owner, address(ketherSortition))
    );
  }

  /**
   * @notice Publish to a Kether ad unit as an approved publisher.
   *
   * Must be called by the token owner or an approved address.
   *
   * @dev See {KetherNFT-publish}.
   */
  function publish(uint _idx, string calldata _link, string calldata _image, string calldata _title, bool _NSFW) external {
      require(isApprovedToPublish(_msgSender(), _idx), Errors.MustBeApproved);

      ketherNFT.publish(_idx, _link, _image, _title, _NSFW);
  }
}
