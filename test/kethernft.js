const { expect } = require('chai');

const BN = ethers.BigNumber.from;

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

describe('KetherNFT', function() {
  let KetherHomepage, KetherNFT, Wrapper;
  let accounts, KH, KNFT;

  before(async() => {
    // NOTE: We're using V2 here because it's ported to newer solidity so we can debug more easily. It should also work with V1.
    KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
    KetherNFT = await ethers.getContractFactory("KetherNFT");
    Wrapper = await ethers.getContractFactory("Wrapper");


    const [owner, withdrawWallet, metadataSigner, account1, account2] = await ethers.getSigners();
    accounts = {owner, withdrawWallet, metadataSigner, account1, account2};

    KH = await KetherHomepage.deploy(await owner.getAddress(), await withdrawWallet.getAddress());
    KNFT = await KetherNFT.deploy(KH.address, await metadataSigner.getAddress());
  });

  it("wrap ad with KetherNFT", async function() {
    const {owner, withdrawWallet, metadataSigner, account1, account2} = accounts;

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

    // Set owner to precommitted wrap address
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

  it("verify precompute", async function() {
    const idx = 42;
    const account = accounts.account1;

    const [salt, precomputeAddress] = await KNFT.connect(account).precompute(42, await account.getAddress());

    {
      // Validate salt generation
      const expected = ethers.utils.sha256(await account.getAddress());
      expect(salt).to.equal(expected);
    }

    const wrappedPayload = KH.interface.encodeFunctionData("setAdOwner", [idx, KNFT.address]); // Confirmed this matches KetherNFT._wrapPayload

    {
      // Validate wrapped payload encoding
      const expected = KH.interface.encodeFunctionData('setAdOwner', [idx, KNFT.address]);
      expect(wrappedPayload).to.equal(expected);
    }

    const bytecode = ethers.utils.hexlify(
      ethers.utils.concat([
        Wrapper.bytecode,
        Wrapper.interface.encodeDeploy([KH.address, wrappedPayload]),
        // Same as: ethers.utils.defaultAbiCoder.encode(['address', 'bytes'], [KH.address, wrappedPayload]),
      ]));

    {
      // Validate full create2 address precompute
      const expected = ethers.utils.getCreate2Address(KNFT.address, salt, ethers.utils.keccak256(bytecode));
      expect(precomputeAddress).to.equal(expected);
    }

  });

});

