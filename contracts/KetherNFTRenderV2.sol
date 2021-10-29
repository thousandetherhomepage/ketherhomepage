//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import '@openzeppelin/contracts/utils/Strings.sol';

import "./IKetherHomepage.sol";

import "base64-sol/base64.sol";

interface ITokenRenderer {
    function tokenURI(IKetherHomepage instance, uint256 tokenId) external view returns (string memory);
}

contract KetherNFTRenderV2 is ITokenRenderer {
  using Strings for uint;

  string bgURI;

  constructor(string memory _bgURI) {
    bgURI = _bgURI;
  }

  function renderImage(IKetherHomepage instance, uint256 tokenId) public view returns (string memory) {
    (,uint x, uint y, uint width, uint height,,,,,) = instance.ads(tokenId);

    return Base64.encode(abi.encodePacked(
      '<svg width="1000" height="1100" viewBox="0 0 1000 1110" xmlns="http://www.w3.org/2000/svg" style="background:#4a90e2">',
        '<style>text { font: bold 30px sans-serif; fill: rgba(255,255,255,0.8); }</style>',
        '<text x="5" y="34">Thousand Ether Homepage</text>',
        '<text x="1000" y="34" text-anchor="end">#', tokenId.toString(),'</text>',
        _renderGrid(bgURI, x, y, width, height),
        '<text x="5" y="1085">Size ',width.toString(),'x',height.toString(),'</text>',
        '<text x="1000" y="1085" text-anchor="end">Position [',x.toString(),',',y.toString(),']</text>',
      '</svg>'));
  }

  function _renderGrid(string memory _bgURI, uint x, uint y, uint width, uint height) internal pure returns (bytes memory) {
    // Workaround for underflow
    string memory xOffset = "-1";
    if (x > 0) xOffset = (x-1).toString();
    string memory yOffset = "-1";
    if (y > 0) yOffset = (y-1).toString();

    return abi.encodePacked(
      '<svg y="50" width="1000" height="1000" viewBox="0 0 100 100">',
        '<rect width="100" height="100" fill="white"></rect>',
        '<image width="100" height="100" href="', _bgURI,'" opacity="0.2" />',
        '<rect x="',xOffset,'" y="',yOffset,'" width="',(width+2).toString(),'" height="',(height+2).toString(),'" fill="rgba(255,255,255,0.5)" rx="1" stroke="rgba(66,185,131,0.1)" />',
        '<rect x="',x.toString(),'" y="',y.toString(),'" width="',width.toString(),'" height="',height.toString(),'" fill="rgb(66,185,131)"></rect>',
      '</svg>');
  }

  // Thanks to @townsendsam for giving us this reference https://gist.github.com/townsendsam/df2c420accb5ae786e856c97d13a2de6
  function _generateAttributes(uint x, uint y, uint width, uint height, bool NSFW, bool forceNSFW) internal pure returns (string memory) {
    string memory filter = '';

    if (NSFW || forceNSFW) {
      filter = ',{"trait_type": "Filter", "value": "NSFW"}';
    }

    string memory adminOverride = '';

    if (forceNSFW) {
      adminOverride = ',{"trait_type": "Admin Override", "value": "Forced NSFW"}';
    }

    return string(abi.encodePacked(
      '[',
         '{',
            '"trait_type": "X",',
            '"value": ', x.toString(),
          '},',
          '{',
              '"trait_type": "Y",',
              '"value": ', y.toString(),
          '},',
          '{',
              '"trait_type": "Width",',
              '"value": ', width.toString(),
          '},',
          '{',
              '"trait_type": "Height",',
              '"value": ', height.toString(),
          '},',
          '{',
              '"trait_type": "Pixels",',
              '"value": ', (height * width).toString(),
          '}',
          filter,
          adminOverride,
      ']'
    ));
  }

  function _boolToString(bool val) internal pure returns (string memory) {
      return val ? "true" : "false";
  }

  function tokenURI(IKetherHomepage instance, uint256 tokenId) public view override(ITokenRenderer) returns (string memory) {
    (,uint x,uint y,uint width,uint height,,,,bool NSFW,bool forceNSFW) = instance.ads(tokenId);

    // Units are 1/10
    x *= 10;
    y *= 10;
    width *= 10;
    height *= 10;

    return string(
      abi.encodePacked(
        'data:application/json;base64,',
        Base64.encode(bytes(abi.encodePacked(
              '{"name":"Ad #', tokenId.toString(), ': ', width.toString(), 'x', height.toString(), ' at [', x.toString(), ',', y.toString(), ']"',
              ',"description":"This NFT represents an ad unit on thousandetherhomepage.com, the owner of the NFT controls the content of this ad unit."',
              ',"external_url":"https://thousandetherhomepage.com"',
              ',"image":"data:image/svg+xml;base64,', renderImage(instance, tokenId), '"',
              ',"attributes":', _generateAttributes(x, y, width, height, NSFW, forceNSFW),
              '}'
        )))
      )
    );
  }
}
