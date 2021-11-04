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

  string baseURI;

  constructor(string memory _baseURI) {
    baseURI = _baseURI;
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
              ',"image":"', baseURI, tokenId.toString(), '.svg"',
              ',"attributes":', _generateAttributes(x, y, width, height, NSFW, forceNSFW),
              '}'
        )))
      )
    );
  }
}
