//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import '@openzeppelin/contracts/utils/Strings.sol';

import "./IKetherHomepage.sol";

import "base64-sol/base64.sol";

interface ITokenRenderer {
    function tokenURI(IKetherHomepage instance, uint256 tokenId) external view returns (string memory);
}

contract KetherNFTRender is ITokenRenderer {
  using Strings for uint;

  function renderNFTImage(IKetherHomepage instance, uint256 tokenId, uint renderNum) public view returns (string memory) {
    uint maxId = instance.getAdsLength() - 1;
    if (renderNum > maxId) renderNum = maxId+1;

    bytes memory buf;
    uint idx = tokenId + 1;
    uint opacity = 3400;

    uint x; uint y; uint width; uint height;

    for (uint i=0; i<renderNum; i++) {
      if (i > maxId) break; // Less than renderNum ads in total
      if (idx > maxId) idx = 0; // Loop around
      if (idx == tokenId) continue;

      (,x, y, width, height,,,,,) = instance.ads(idx);
      buf = abi.encodePacked(buf, '<rect x="',x.toString(),'" y="',y.toString(),'" width="',width.toString(),'" height="',height.toString(),'" fill="rgba(42,42,42,0.', opacity.toString() ,')"></rect>');

      opacity = (opacity * 9) / 8;
      if (opacity == 0) break;
      idx += 1;
    }

    (,x, y, width, height,,,,,) = instance.ads(tokenId);

    return Base64.encode(bytes(abi.encodePacked(
      '<svg width="1000" height="1050" viewBox="0 0 1000 1060" xmlns="http://www.w3.org/2000/svg" style="background:#4a90e2">',
        '<text x="5" y="34" style="font:30px sans-serif;fill:rgba(255,255,255,0.8);">The Thousand Ether Homepage</text>',
        '<text x="1000" y="34" style="font:30px sans-serif;fill:rgba(255,255,255,0.8);" text-anchor="end">#', tokenId.toString(),'</text>',
        '<svg y="50" width="1000" height="1000" viewBox="0 0 100 100">',
          '<rect width="100%" height="100%" fill="white"></rect>',
          '<rect x="',x.toString(),'" y="',y.toString(),'" width="',width.toString(),'" height="',height.toString(),'" fill="rgb(66,185,131)"></rect>',
          buf,
        '</svg>',
      '</svg>')));
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
              '{"name":"ThousandEtherHomepage #', tokenId.toString(), ': ', width.toString(), 'x', height.toString(), ' at [', x.toString(), ',', y.toString(), ']"',
              ',"description":"This NFT represents an ad unit on thousandetherhomepage.com, the owner of the NFT controls the content of this ad unit."',
              ',"external_url":"https://thousandetherhomepage.com"',
              ',"image":"data:image/svg+xml;base64,', renderNFTImage(instance, tokenId, 42), '"',
              ',"attributes":', _generateAttributes(x, y, width, height, NSFW, forceNSFW),
              '}'
        )))
      )
    );
  }
}
