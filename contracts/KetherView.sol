import "./IKetherHomepage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

library KetherView {
  struct AdView {
    address owner;
    uint x;
    uint y;
    uint width;
    uint height;
    string link;
    string image;
    string title;
    bool NSFW;
    bool forceNSFW;
    bool wrapped;
  }
  /// allAds is a helper view designed to be called from frontends that want to
  /// display all of the ads with their correct NFT owners.
  function allAds(address _instanceAddress, address _nftAddress) external view returns (AdView[] memory) {
    // FIXME: Does this actually enumerate all of the ads, or do we need to paginate?
    AdView[] memory ads_ = new AdView[](IKetherHomepage(_instanceAddress).getAdsLength());

    for (uint idx=0; idx<ads_.length; idx++) {
      (address owner, uint x, uint y, uint width, uint height, string memory link, string memory image, string memory title, bool NSFW, bool forceNSFW) = IKetherHomepage(_instanceAddress).ads(idx);
      bool wrapped = false;

      // Is it an NFT already?
      if (owner == _nftAddress) {
        // Override owner to be the NFT owner
        owner = IERC721(_nftAddress).ownerOf(idx);
        wrapped = true;
      }

      ads_[idx] = AdView(owner, x, y, width, height, link, image, title, NSFW, forceNSFW, wrapped);
    }
    return ads_;
  }
}
