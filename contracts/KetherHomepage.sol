pragma solidity ^0.4.4;

contract KetherHomepage {
    // TODO: Do we care about timestamps?

    /// Buy is emitted when an ad unit is reserved.
    event Buy(
        uint indexed idx,
        address owner,
        uint x,
        uint y,
        uint width,
        uint height
    );

    /// Publish is emitted whenever the contents of an ad is changed.
    event Publish(
        uint indexed idx,
        string link,
        string image,
        bool NSFW
    );

    /// Price is 1 kether divided by 1,000,000 pixels
    uint public constant weiPixelPrice = 1000000000000000;

    /// Each grid cell represents 10 pixels.
    uint public constant pixelsPerCell = 10;

    bool[100][100] public grid;

    /// owner can withdraw the funds and override NSFW status of ad units.
    address public owner;

    struct Ad {
        address owner;
        uint x;
        uint y;
        uint width;
        uint height;
        string link;
        string image;

        /// NSFW is whether the ad is suitable for people of all
        /// ages and workplaces.
        bool NSFW;
        /// forceNSFW can be set by owner.
        bool forceNSFW;
    }

    /// ads are stored in an array, the id of an ad is its index in this array.
    Ad[] public ads;

    function KetherHomepage(address _owner) {
        owner = _owner;
    }
 

    /// getAdsLength tells you how many ads there are
    function getAdsLength() returns (uint) {
        return ads.length;
    }

    /// getAd gives you the Ad at a specific id
    function getAd(uint idx) returns (uint x, uint y, uint width, uint height, string link, string image, bool nsfw) {
        Ad storage ad = ads[idx];
        x = ad.x;
        y = ad.y;
        width = ad.width;
        height = ad.height;
        link = ad.link;
        image = ad.image;
        nsfw = ad.NSFW|| ad.forceNSFW;
    }
 
    /// Ads must be purchased in 10x10 pixel blocks.
    /// Each coordinate represents 10 pixels. That is,
    ///   _x=5, _y=10, _width=3, _height=3
    /// Represents a 30x30 pixel ad at coordinates (50, 100)
    function buy(uint _x, uint _y, uint _width, uint _height) payable returns (uint idx) {
        uint cost = _width * _height * pixelsPerCell * weiPixelPrice;
        require(msg.value >= cost);
        // TODO: require that the width and height are non-zero;

        // Loop over relevant grid entries
        for(uint i=0; i<_width; i++) {
            for(uint j=0; j<_height; j++) {
                if (grid[_x+i][_y+j]) {
                    // Already taken, undo.
                    revert();
                }
                grid[_x+i][_y+j] = true;
            }
        }

        // We reserved space in the grid, now make a placeholder entry.
        Ad memory ad = Ad(msg.sender, _x, _y, _width, _height, "", "", false, false);
        idx = ads.push(ad) - 1;
        Buy(idx, msg.sender, _x, _y, _width, _height);
        return idx;
    }

    /// Publish allows for setting the link, image, and NSFW status for the ad
    /// unit that is identified by the idx which was returned during the buy step.
    /// The link and image must be full web3-recognizeable URLs, such as:
    ///  - bzz://a5c10851ef054c268a2438f10a21f6efe3dc3dcdcc2ea0e6a1a7a38bf8c91e23
    ///  - bzz://mydomain.eth/ad.png
    ///  - https://cdn.mydomain.com/ad.png
    /// Images should be valid PNG.
    function publish(uint _idx, string _link, string _image, bool _NSFW) {
        Ad storage ad = ads[_idx];
        require(ad.owner == msg.sender);
        ad.link = _link;
        ad.image = _image;
        ad.NSFW = _NSFW;

        Publish(_idx, ad.link, ad.image, ad.NSFW || ad.forceNSFW);
    }

    /// forceNSFW allows the owner to override the NSFW status for a specific ad unit.
    function forceNSFW(uint _idx, bool _NSFW) {
        require(msg.sender == owner);
        Ad storage ad = ads[_idx];
        ad.forceNSFW = _NSFW;

        Publish(_idx, ad.link, ad.image, ad.NSFW || ad.forceNSFW);
    }

    /// withdraw allows the owner to transfer out the balance of the contract.
    function withdraw() {
        require(msg.sender == owner);
        owner.transfer(this.balance);
    }
}
