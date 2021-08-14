//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./IKetherHomepage.sol";
import "./KetherNFTRender.sol";

// TODO: Remove legacy events if we don't need them?
// TODO: Make IKetherHomepage a strict subset that we need (to save on gas costs)

contract KetherDAO is ERC721, Ownable {
  /// Price is 1 kether divided by 1,000,000 pixels
  uint public constant weiPixelPrice = 1000000000000000;

  /// Each grid cell represents 100 pixels (10x10).
  uint public constant pixelsPerCell = 100;

  /// instance is the KetherHomepage contract that the new Kether contract
  /// initializes state from.
  IKetherHomepage public instance;

  /// disableRenderUpgrade is whether we can still upgrade the tokenURI renderer.
  /// Once it is set it cannot be unset.
  // TODO: bool disableRenderUpgrade = false;

  ITokenRenderer public renderer;

  /// Mapping owner address to pixel count
  mapping(address => uint) private _pixels;

  bool[100][100] public grid; // TODO: Encode these in uints?

  struct Ad {
    // Note: We removed `address owner` here, it can now be accessed via ownerOf(idx)
    uint x;
    uint y;
    uint width;
    uint height;
    string link;
    string image;
    string title;
    bool NSFW;
    bool forceNSFW;
  }

  /// ads are stored in an array, the id of an ad is its index in this array.
  Ad[] public ads;

  constructor(address _ketherContract, address _renderer) ERC721("Thousand Ether Homepage Ad", "1KAD") {
    instance = IKetherHomepage(_ketherContract);
    renderer = ITokenRenderer(_renderer);

    // Migrate original contract ad state to new NFT contract.
    for (uint idx=instance.getAdsLength(); idx>0; idx--) {
      (address owner, uint x, uint y, uint width, uint height, string memory link, string memory image, string memory title, bool NSFW, bool forceNSFW) = instance.ads(idx);

      uint newIdx = _insertAd(x, y, width, height, link, image, title, NSFW, forceNSFW);
      require(newIdx == idx, "KetherDAO: failed to initialize equivalent idx ads");

      _mint(owner, idx);
    }
  }

  function _beforeTokenTransfer(address _from, address _to, uint256 _tokenId) internal override virtual {
    Ad memory ad = ads[_tokenId];
    uint n = ad.width * ad.height * pixelsPerCell;

    if (_from != address(0)) {
      _pixels[_from] -= n;
    }
    if (_to != address(0)) {
      _pixels[_to] += n;
    }
  }

  // _insertAd
  function _insertAd(uint _x, uint _y, uint _width, uint _height, string memory _link, string memory _image, string memory _title, bool _NSFW, bool _forceNSFW) internal returns (uint idx) {

    // Fill the collision grid
    for(uint i=0; i<_width; i++) {
      for(uint j=0; j<_height; j++) {
        if (grid[_x+i][_y+j]) {
          // Already taken, undo.
          revert("KetherDAO: buy ad slot already taken");
        }
        grid[_x+i][_y+j] = true;
      }
    }

    // We reserved space in the grid, now make a placeholder entry.
    Ad memory ad = Ad(_x, _y, _width, _height, _link, _image, _title, _NSFW, _forceNSFW);
    ads.push(ad);
    idx = ads.length - 1;
    return idx;
  }


  /// getAds returns all of the ads for rendering.
  function getAds() public view returns (Ad[] memory ads_) {
    return ads;
  }

  /// pixelsOwned is a helper for computing the DAO voting power on a per-pixel basis.
  function pixelsOwned(address _owner) public view returns (uint) {
    require(_owner != address(0), "KetherDAO: pixels query for the zero address");
    return _pixels[_owner];
  }

  function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
    require(_exists(tokenId), "KetherDAO: tokenId does not exist");
    return renderer.tokenURI(instance, tokenId);
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
    require(_isApprovedOrOwner(_msgSender(), _idx), "KetherDAO: publish for sender that is not approved");

    Ad storage ad = ads[_idx];
    ad.link = _link;
    ad.image = _image;
    ad.title = _title;
    ad.NSFW = _NSFW;
  }

  /// Ads must be purchased in 10x10 pixel blocks.
  /// Each coordinate represents 10 pixels. That is,
  ///   _x=5, _y=10, _width=3, _height=3
  /// Represents a 30x30 pixel ad at coordinates (50, 100)
  function buy(uint _x, uint _y, uint _width, uint _height) external payable returns (uint idx) {
    uint cost = _width * _height * pixelsPerCell * weiPixelPrice;
    require(cost > 0);
    require(msg.value >= cost, "KetherDAO: insufficient buy value");

    idx = _insertAd(_x, _y, _width, _height, "", "", "", false, false);

    // Note that _safeMint helpers can have a re-entry, but it should be fine
    // in this case. Worst case the person can buy multiple ads at-cost. Maybe
    // save a bit of gas lol?
    _safeMint(_msgSender(), idx);

    return idx;
  }

  function adminSetRenderer(address _renderer) external onlyOwner {
    renderer = ITokenRenderer(_renderer);
  }

  // TODO: adminDisableRenderUpgrade?
}
