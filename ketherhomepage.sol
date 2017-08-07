pragma solidity ^0.4.14;

contract KetherHomepage {
    /// Buy is emitted when an ad unit is reserved.
    event Buy(
        uint idx,
        address owner,
        uint x,
        uint y,
        uint width,
        uint height
    );
    
    /// Publish is emitted whenever the contents of an ad is changed.
    event Publish(
        uint idx,
        string link,
        string image,
        bool NSFW
    );
    
    uint weiPixelPrice;
    address owner;
    
    /// Each grid cell represents 10 pixels.
    uint constant pixelsPerCell = 100;
    bool[100][100] grid;
    
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
    
    Ad[] public ads;
    
    function KetherHomepage(address _owner, uint _weiPixelPrice) {
        owner = _owner;
        weiPixelPrice = _weiPixelPrice;
    }
    
    /// Ads must be purchased in 10x10 pixel blocks.
    /// Each coordinate represents 10 pixels. That is,
    ///   _x=5, _y=10, _width=3, _height=3
    /// Represents a 30x30 pixel ad at coordinates (50, 100)
    function buy(uint _x, uint _y, uint _width, uint _height) payable returns (uint idx) {
        uint cost = _width * _height * pixelsPerCell * weiPixelPrice;
        require(msg.value >= cost);
        
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
        idx = ads.push(Ad(msg.sender, _x, _y, _width, _height, "", "", false, false)) - 1;
        
        Buy(idx, msg.sender, _x, _y, _width, _height);
        return idx;
    }
    
    function publish(uint _idx, string _link, string _image, bool _NSFW) {
        Ad storage ad = ads[_idx];
        require(ad.owner == msg.sender);
        ad.link = _link;
        ad.image = _image;
        ad.NSFW = _NSFW;
        
        Publish(_idx, ad.link, ad.image, ad.NSFW || ad.forceNSFW);
    }
    

    function forceNSFW(uint _idx, bool _NSFW) {
        require(msg.sender == owner);
        Ad storage ad = ads[_idx];
        ad.forceNSFW = _NSFW;
        
        Publish(_idx, ad.link, ad.image, ad.NSFW || ad.forceNSFW);
    }
    
    function withdraw() {
        require(msg.sender == owner);
        owner.transfer(this.balance);
    }
}
