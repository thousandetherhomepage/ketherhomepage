import "./IKetherHomepage.sol";

contract KetherView {
  /// allAds is a helper view designed to be called from frontends that want to
  /// display all of the ads with their correct NFT owners.
  function allAds(IKetherHomepage instance) external view returns (IKetherHomepage.Ad[] memory) {
    // FIXME: Does this actually enumerate all of the ads, or do we need to paginate?
    uint len = instance.getAdsLength();
    IKetherHomepage.Ad[] memory ads_ = new IKetherHomepage.Ad[](len);

    for (uint idx=0; idx<len; idx++) {
      (address owner, uint x, uint y, uint width, uint height, string memory link, string memory image, string memory title, bool NSFW, bool forceNSFW) = instance.ads(idx);

      /* XXX: Fix this

      // Is it an NFT already?
      if (_exists(idx)) {
        // Override owner to be the NFT owner
        owner = ownerOf(idx);
      }

      */

      ads_[idx] = IKetherHomepage.Ad(owner, x, y, width, height, link, image, title, NSFW, forceNSFW);
    }
    return ads_;
  }

}
