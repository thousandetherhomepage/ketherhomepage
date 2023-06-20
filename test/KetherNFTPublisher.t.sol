// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import { KetherNFTPublisher, IKetherNFTPublish, IKetherSortition, Errors } from "../contracts/KetherNFTPublisher.sol";

import { KetherNFT } from "../contracts/KetherNFT.sol";
import { KetherHomepageV2 } from "../contracts/KetherHomepageV2.sol";
import { IKetherHomepage } from "../contracts/IKetherHomepage.sol";

// MockSortition where anyone can change the magistrate, for testing.
contract MockSortition is IKetherSortition {
  address public _magistrate;

  function setMagistrate(address m) external {
    _magistrate = m;
  }

  function getMagistrate() external view returns (address) {
    return _magistrate;
  }
}

contract KetherNFTPublisherTest is Test {
  KetherNFT public nft;
  MockSortition public sortition;
  IKetherHomepage public homepage;
  KetherNFTPublisher public publisher;

  address sender;

  bytes constant ErrMustBeApproved = bytes(Errors.MustBeApproved);
  bytes constant ErrPublisherNotApproved = bytes("KetherNFT: publish for sender that is not approved");
  uint256 constant pixelPrice = 100 * 1000000000000000;

  function setUp() public {
    homepage = new KetherHomepageV2(msg.sender, payable(msg.sender));
    nft = new KetherNFT(address(homepage), address(0x0));
    sortition = new MockSortition();
    publisher = new KetherNFTPublisher(address(nft), address(sortition));

    // Pretend to be an EOA so that safeMint passes
    sender = vm.addr({privateKey: 1});
    vm.deal(sender, 1 << 128);
    vm.startPrank(sender, sender);

    nft.buy{value: 100 * pixelPrice}(0, 0, 10, 10);
    nft.buy{value: 25 * pixelPrice}(20, 20, 5, 5);

  }

  function _getLink(uint256 idx) internal view returns (string memory) {
    (,,,,,string memory link,,,,) = homepage.ads(idx);
    return link;
  }

  function test_PublishAsApproved() public {
    uint256 idx = 0;
    nft.publish(idx, "hi", "", "", false);
    assertEq(_getLink(idx), "hi");

    vm.expectRevert(ErrPublisherNotApproved);
    publisher.publish(idx, "foo", "", "", false);

    // Approved for just idx=0
    nft.approve(address(publisher), idx);
    publisher.publish(idx, "foo", "", "", false);
    assertEq(_getLink(idx), "foo");

    // Not approved for other tokens
    idx = 1;
    vm.expectRevert(ErrPublisherNotApproved);
    publisher.publish(idx, "bar", "", "", false);

    // Remove approval
    nft.approve(address(0x0), idx);
    vm.expectRevert(ErrPublisherNotApproved);
    publisher.publish(idx, "bar", "", "", false);
  }

  function test_PublishAsApprovedForAll() public {
    uint256 idx = 0;
    nft.publish(idx, "hi", "", "", false);
    assertEq(_getLink(idx), "hi");

    // Approved for all tokens
    nft.setApprovalForAll(address(publisher), true);
    publisher.publish(idx, "foo", "", "", false);
    assertEq(_getLink(idx), "foo");

    idx = 1;
    publisher.publish(idx, "bar", "", "", false);
    assertEq(_getLink(idx), "bar");

    // Remove approval
    nft.setApprovalForAll(address(publisher), false);

    vm.expectRevert(ErrPublisherNotApproved);
    publisher.publish(idx, "bar", "", "", false);
  }

  function test_PublishAsMagistrate() public {
    address magistrate = address(sender);

    // Allow publisher to manage our NFTs
    nft.setApprovalForAll(address(publisher), true);

    assertFalse(publisher.isApprovedToPublish(address(0x1234), 1), "0x1234 should fail");

    uint256 idx = 0;
    vm.expectRevert(ErrMustBeApproved);
    publisher.publish(idx, "foo", "", "", false);

    assertFalse(publisher.isApprovedToPublish(sender, idx), "sender should fail");
    assertFalse(publisher.isApprovedToPublish(sortition.getMagistrate(), idx), "magistrate should fail");

    // Approve magistrate, but caller is not magistrate yet
    nft.setApprovalForAll(address(sortition), true);
    vm.expectRevert(ErrMustBeApproved);
    publisher.publish(idx, "foo", "", "", false);

    assertTrue(publisher.isApprovedToPublish(sortition.getMagistrate(), idx), "actual magistrate should pass");
    assertFalse(publisher.isApprovedToPublish(magistrate, idx), "future magistrate should fail");

    // Update magistrate, should pass now
    sortition.setMagistrate(magistrate);
    publisher.publish(idx, "foo", "", "", false);
    assertEq(_getLink(idx), "foo");

    assertTrue(publisher.isApprovedToPublish(magistrate, idx));

    console.log("a");

    sortition.setMagistrate(address(0x0));
    vm.expectRevert(ErrMustBeApproved);
    publisher.publish(idx, "foo", "", "", false);

    assertTrue(publisher.isApprovedToPublish(sortition.getMagistrate(), idx));
    assertFalse(publisher.isApprovedToPublish(magistrate, idx));
  }
}
