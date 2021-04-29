const { expect } = require('chai');

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

describe('KetherNFT', function() {
  it("deploy KetherNFT", async function() {
    const KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
    const [owner, withdrawWallet, metadataSigner, account1, account2] = await ethers.getSigners();
    const KH = await KetherHomepage.deploy(await owner.getAddress(), await withdrawWallet.getAddress());

    const KetherNFT = await ethers.getContractFactory("KetherNFT");

    const KNFT = await KetherNFT.deploy(KH.address, await metadataSigner.getAddress());

    // Buy an ad
    const txn = await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    const receipt = await txn.wait();
    const event = receipt.events.pop();
    const [idx] = event.args;
    expect(idx).to.equal(0);

    await KH.connect(account1).publish(idx, "link", "image", "title", false);

    // TODO: Test wrapping to non-owner
    // TODO: Test wrapping by non-owner

    const [salt, precomputeAddress] = await KNFT.connect(account1).precompute(idx, await account1.getAddress());

    // TODO: Check precompute in js
    expect(precomputeAddress).to.not.equal("0x0");
    expect(salt).to.not.equal("0x0");

    await KH.connect(account1).setAdOwner(idx, precomputeAddress);

    // Wrap ad
    await KNFT.connect(account1).wrap(idx, await account1.getAddress());

    // Confirm owner can't publish directly anymore
    expect(
      KH.connect(account1).publish(idx, "foo", "bar", "baaz", false)
    ).to.revert;

    const ad = await KH.ads(idx);
    expect(ad).to.equal([await KNFT.getAddress(), 0, 0, 10, 10, idx, "link", "image", "title", false, false]);
  });
});

