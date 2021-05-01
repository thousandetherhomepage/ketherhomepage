const { expect } = require('chai');

const BN = ethers.BigNumber.from;

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

describe('KetherNFT', function() {
  it("deploy KetherNFT", async function() {
    // NOTE: We're using V2 here because it's ported to newer solidity so we can debug more easily. It should also work with V1.
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

    const Wrapper = await ethers.getContractFactory("Wrapper");

    const [salt, precomputeAddress] = await KNFT.connect(account1).precompute(idx, await account1.getAddress());

    // TODO: Test salt
    expect(salt).to.not.equal("0x0");

    const wrappedPayload = KH.interface.encodeFunctionData("setAdOwner", [idx, KNFT.address]); // Confirmed this matches KetherNFT._wrapPayload

    const bytecode = ethers.utils.hexlify(
      ethers.utils.concat([
        Wrapper.bytecode,
        // KH.address, wrappedPayload,
        ethers.utils.defaultAbiCoder.encode(['address', 'bytes'], [KH.address, wrappedPayload]),
      ]));

    const precomputed = ethers.utils.getCreate2Address(KNFT.address, salt, ethers.utils.keccak256(bytecode));

    // TODO: Check precompute in js
    expect(precomputeAddress).to.equal(precomputed);

    await KH.connect(account1).setAdOwner(idx, precomputeAddress);

    // Wrap ad
    await KNFT.connect(account1).wrap(idx, await account1.getAddress());

    // Confirm owner can't publish directly anymore
    expect(
      KH.connect(account1).publish(idx, "foo", "bar", "baaz", false)
    ).to.reverted;

    {
      const [addr,,,,,link,image,title] = await KH.ads(idx);
      expect(addr).to.equal(KNFT.address);
      expect(link).to.equal("link");
      expect(image).to.equal("image");
      expect(title).to.equal("title");
    }
  });
});

