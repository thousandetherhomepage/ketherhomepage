//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IKetherHomepage {
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
        string title,
        bool NSFW
    );

    /// SetAdOwner is emitted whenever the ownership of an ad is transfered
    event SetAdOwner(
        uint indexed idx,
        address from,
        address to
    );

    struct Ad {
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
    }

    /// ads are stored in an array, the id of an ad is its index in this array.
    function ads(uint _idx) external view returns (Ad memory);

    function buy(uint _x, uint _y, uint _width, uint _height) external payable returns (uint idx);

    function publish(uint _idx, string calldata _link, string calldata _image, string calldata _title, bool _NSFW) external;

    function setAdOwner(uint _idx, address _newOwner) external;

    function forceNSFW(uint _idx, bool _NSFW) external;

    function withdraw() external;
}
