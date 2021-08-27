const { expect } = require('chai');

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

describe('KetherNFT', function() {
  let KetherHomepage, KetherNFT, KetherNFTRender, FlashEscrow;
  let accounts, KH, KNFT, KNFTrender;

  beforeEach(async() => {
    // NOTE: We're using V2 here because it's ported to newer solidity so we can debug more easily. It should also work with V1.
    KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
    KetherNFT = await ethers.getContractFactory("KetherNFT");
    KetherNFTRender = await ethers.getContractFactory("KetherNFTRender");
    FlashEscrow = await ethers.getContractFactory("FlashEscrow");

    const [owner, withdrawWallet, metadataSigner, account1, account2, account3] = await ethers.getSigners();
    accounts = {owner, withdrawWallet, metadataSigner, account1, account2, account3};

    KH = await KetherHomepage.deploy(await owner.getAddress(), await withdrawWallet.getAddress());
    KNFTrender = await KetherNFTRender.deploy();
    KNFT = await KetherNFT.deploy(KH.address, KNFTrender.address);
  });

  const buyAd = async function(account, x=0, y=0, width=10, height=10, link="link", image="image", title="title", NSFW=false, value=oneHundredCellPrice) {
    const txn = await KH.connect(account).buy(x, y, width, height, { value: value });
    const receipt = await txn.wait();
    const event = receipt.events.pop();
    const [idx] = event.args;
    await KH.connect(account).publish(idx, link, image, title, false);
    return idx;
  }

  it("should wrap ad with KetherNFT", async function() {
    const {account1} = accounts;

    // Buy an ad
    const idx = await buyAd(account1);
    expect(idx).to.equal(0);

    const [salt, precomputeAddress] = await KNFT.connect(account1).precompute(idx, await account1.getAddress());

    // Set owner to precommitted wrap address
    await KH.connect(account1).setAdOwner(idx, precomputeAddress);

    // Wrap ad
    await KNFT.connect(account1).wrap(idx, await account1.getAddress());

    // Confirm owner can't publish directly anymore
    await expect(
      KH.connect(account1).publish(idx, "foo", "bar", "baaz", false)
    ).to.be.reverted;

    {
      const [addr,,,,,link,image,title] = await KH.ads(idx);
      expect(addr).to.equal(KNFT.address);
      expect(link).to.equal("link");
      expect(image).to.equal("image");
      expect(title).to.equal("title");
    }

    // Confirm NFT owner can publish through the NFT
    await KNFT.connect(account1).publish(idx, "foo2", "baar2", "baaz2", false);

    {
      const [addr,,,,,link,image,title] = await KH.ads(idx);
      expect(addr).to.equal(KNFT.address);
      expect(link).to.equal("foo2");
      expect(image).to.equal("baar2");
      expect(title).to.equal("baaz2");
    }

  });

  it('should wrap to non-owner', async function() {
    const {account1, account2, account3} = accounts;
    const idx = await buyAd(account1);
    {
      const otherIdx = await buyAd(account2, x=20, y=20);
      expect(otherIdx).to.not.equal(idx);
    }

    // Generate precommit to wrap idx (owned by account1) to ownership of account2.
    // Note that account2 can generate this precommit, as in this case.
    const [salt, precomputeAddress] = await KNFT.connect(account2).precompute(idx, await account2.getAddress());

    // Non-owner cannot change the ad ownership to precomputed address.
    await expect(
      KH.connect(account2).setAdOwner(idx, precomputeAddress)
    ).to.be.reverted;

    // Non-owner cannot wrap, either
    await expect(
      KNFT.connect(account2).wrap(idx, await account2.getAddress())
    ).to.be.revertedWith("KetherNFT: owner needs to be the correct precommitted address");

    // Same precomputed transaction is fine for the owner to run (precommit wrap to account2)
    await KH.connect(account1).setAdOwner(idx, precomputeAddress);

    // Rando can't wrap to themselves
    await expect(
      KNFT.connect(account3).wrap(idx, await account3.getAddress())
    ).to.be.revertedWith("KetherNFT: owner needs to be the correct precommitted address");

    // Rando can't wrap to owner (since the precommit is for account2)
    await expect(
      KNFT.connect(account3).wrap(idx, await account1.getAddress())
    ).to.be.revertedWith("KetherNFT: owner needs to be the correct precommitted address");

    // Rando *can* wrap to the precommitted account2
    // FIXME: Is this desirable? It allows non-owner to pay for the wrap, which is nice.
    await KNFT.connect(account3).wrap(idx, await account2.getAddress())

  });

  it("should generate tokenURI based on wrapped ad", async function() {
    const {account1, account2} = accounts;
    const idx = await buyAd(account1, 1, 2, 3, 4);
    const [salt, precomputeAddress] = await KNFT.connect(account1).precompute(idx, await account1.getAddress());

    await KH.connect(account1).publish(idx, "link", "image", "title", false);
    await KH.connect(account1).setAdOwner(idx, precomputeAddress);

    await KNFT.connect(account1).wrap(idx, await account1.getAddress());

    {
      const expected = {
        "name": "Thousand Ether Homepage Ad: 30x40 at [10,20]",
        "description": "This NFT represents an ad unit on thousandetherhomepage.com, the owner of the NFT controls the content of this ad unit.",
        "external_url": "https://thousandetherhomepage.com",
        "image": "omitted for testing", // TODO: Test image elsewhere
        "properties": {"width": 30, "height": 40},
      };
      const r = await KNFT.connect(account1).tokenURI(idx);
      const prefix = 'data:application/json;base64';
      expect(r).to.to.have.string(prefix);

      const got = Buffer.from(r.slice(prefix.length), 'base64').toString();

      let parsed;
      try {
        parsed = JSON.parse(got);
      } catch (e) {
        console.log("Failed to parse:", got);
        throw e;
      }
      expect(parsed['image']).to.have.string('data:image/svg+xml;base64,');

      parsed['image'] = expected['image'];
      expect(parsed).to.deep.equal(expected);
    }
  });

  it("should unwrap", async function() {
    const {account1, account2} = accounts;
    const idx = await buyAd(account1);

    {
      // Wrap from account1 to account2
      const [salt, precomputeAddress] = await KNFT.connect(account1).precompute(idx, await account1.getAddress());
      await KH.connect(account1).setAdOwner(idx, precomputeAddress);
      await KNFT.connect(account1).wrap(idx, await account1.getAddress());

      expect(await KNFT.connect(account2).balanceOf(await account1.getAddress())).to.equal(1);
      expect(await KNFT.connect(account2).tokenURI(idx)).to.not.equal("");
    }

    await expect(
      KNFT.connect(account2).unwrap(idx, await account2.getAddress())
    ).to.be.revertedWith("KetherNFT: unwrap for sender that is not owner")

    await KNFT.connect(account1).unwrap(idx, await account2.getAddress());

    {
      const [addr] = await KH.ads(idx);
      expect(addr).to.equal(await account2.getAddress());
    }

    // Confirm that the NFT is gone
    expect(await KNFT.connect(account2).balanceOf(await account2.getAddress())).to.equal(0);
    await expect(
      KNFT.connect(account2).tokenURI(idx)
    ).to.be.revertedWith("KetherNFT: tokenId does not exist");

    {
      // Wrap again, from account2 to account2
      const [salt, precomputeAddress] = await KNFT.connect(account2).precompute(idx, await account2.getAddress());
      await KH.connect(account2).setAdOwner(idx, precomputeAddress);
      await KNFT.connect(account2).wrap(idx, await account2.getAddress());

      expect(await KNFT.connect(account2).balanceOf(await account2.getAddress())).to.equal(1);
      expect(await KNFT.connect(account2).tokenURI(idx)).to.not.equal("");
    }
  });

  it("should generate correct precompute address and salt", async function() {
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
        FlashEscrow.bytecode,
        FlashEscrow.interface.encodeDeploy([KH.address, wrappedPayload]),
        // Same as: ethers.utils.defaultAbiCoder.encode(['address', 'bytes'], [KH.address, wrappedPayload]),
      ]));

    {
      // Validate full create2 address precompute
      const expected = ethers.utils.getCreate2Address(KNFT.address, salt, ethers.utils.keccak256(bytecode));
      expect(precomputeAddress).to.equal(expected);
    }
  });

  it("should not allow eth receive", async function() {
    const {account1} = accounts;

    expect(
      account1.sendTransaction({
        to: KNFT.address,
        value: ethers.utils.parseEther("42.0")
      })
    ).to.be.reverted;
  });

  it('should be buyable as NFT', async function() {
    const {account1} = accounts;

    const txn = await KNFT.connect(account1).buy(42, 69, 10, 10, {value: oneHundredCellPrice });
    const receipt = await txn.wait();
    const event = receipt.events.pop();
    const [idx] = event.args;

    await KNFT.connect(account1).publish(idx, "link", "image", "title", false);

    {
      const [addr,,,,,link,image,title] = await KH.ads(idx);
      expect(addr).to.equal(KNFT.address);
      expect(link).to.equal("link");
      expect(image).to.equal("image");
      expect(title).to.equal("title");
    }

    // Unwrap
    await KNFT.connect(account1).unwrap(idx, await account1.getAddress());
    {
      const [addr] = await KH.ads(idx);
      expect(addr).to.equal(await account1.getAddress());
    }
  });

  it("should be recoverable if ownership is transferred without minting", async function() {
    const {owner, account1} = accounts;

    // Buy an ad
    const idx = await buyAd(account1);
    expect(idx).to.equal(0);

    // One more
    const idx2 = await buyAd(account1, x=20, y=20);
    expect(idx2).to.equal(1);

    // Oopsie, transferred the ad to the KetherNFT contract rather than the commitment address (don't do this!)
    await KH.connect(account1).setAdOwner(idx, KNFT.address);
    {
      const [addr,..._] = await KH.ads(idx);
      expect(addr).to.equal(KNFT.address);
    }

    // Admin can't transfer non-stuck ads
    expect(
      KNFT.connect(owner).adminRecoverTrapped(idx2, await owner.getAddress())
    ).to.be.revertedWith("KetherNFT: ad not held by contract");

    // Rando can't call admin recover
    expect(
      KNFT.connect(account1).adminRecoverTrapped(idx, await account1.getAddress())
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // Benevolent admin steps in and transfers trapped ad back
    await KNFT.connect(owner).adminRecoverTrapped(idx, await account1.getAddress());

    {
      const [addr,..._] = await KH.ads(idx);
      expect(addr).to.equal(await account1.getAddress());
    }
  });

  it("it should return all of the ads as a helper", async function() {
    const {owner, account1} = accounts;

    // Buy an ad
    const idx = await buyAd(account1);

    // One more
    const idx2 = await buyAd(account1, x=20, y=20);
    expect(idx2).to.equal(1);

    const ads = await KNFT.connect(account1).allAds();
    expect(ads).to.equal(true);
  });
});

