const { expect } = require('chai');

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

describe('KetherView', function() {
  let KetherHomepage, KetherNFT, KetherView;
  let accounts, KH, KNFT;

  beforeEach(async () => {
    // NOTE: We're using V2 here because it's ported to newer solidity so we can debug more easily. It should also work with V1.
    KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
    KetherNFT = await ethers.getContractFactory("KetherNFT");
    KetherNFTRender = await ethers.getContractFactory("KetherNFTRender");
    KetherView = await ethers.getContractFactory("KetherView");


    const [owner, withdrawWallet, metadataSigner, account1, account2, account3] = await ethers.getSigners();
    accounts = {owner, withdrawWallet, metadataSigner, account1, account2, account3};

    KH = await KetherHomepage.deploy(await owner.getAddress(), await withdrawWallet.getAddress());
    KNFTrender = await KetherNFTRender.deploy();
    KNFT = await KetherNFT.deploy(KH.address, KNFTrender.address);
    KV = await KetherView.deploy();

  });

  const buyAd = async function(account, x=0, y=0, width=10, height=10, link="link", image="image", title="title", NSFW=false, value=oneHundredCellPrice) {
    const txn = await KH.connect(account).buy(x, y, width, height, { value: value });
    const receipt = await txn.wait();
    const event = receipt.events.pop();
    const [idx] = event.args;
    await KH.connect(account).publish(idx, link, image, title, false);
    return idx;
  }

  it("it should return all of the ads as a helper", async function() {
    const {
      owner,
      account1
    } = accounts;

    // Buy an ad
    const idx = await buyAd(account1);

    // One more
    const idx2 = await buyAd(account1, x = 20, y = 20);
    expect(idx2).to.equal(1);

    // Wrap the second ad
    const [salt, precomputeAddress] = await KNFT.connect(account1).precompute(idx2, await account1.getAddress());

    // Set owner to precommitted wrap address
    await KH.connect(account1).setAdOwner(idx2, precomputeAddress);

    // Wrap ad
    await KNFT.connect(account1).wrap(idx2, await account1.getAddress());
    {
      // Get just the first ad
      const ads = await KV.connect(account1).allAds(KH.address, KNFT.address, 0, 1);
      expect(ads).to.to.have.lengthOf(1);

      // ad has us as owner and is not wrapped
      expect(ads[0].owner).to.equal(account1.address);
      expect(ads[0].wrapped).to.equal(false);
      expect(ads[0].idx).to.equal(0);
    }

    {
      // Get just the second ad
      const ads = await KV.connect(account1).allAds(KH.address, KNFT.address, 1, 1);
      expect(ads).to.to.have.lengthOf(1);

      // second ad has us as owner and is wrapped
      expect(ads[0].owner).to.equal(account1.address);
      expect(ads[0].wrapped).to.equal(true);
      expect(ads[0].idx).to.equal(1);
    }

    {
      // Get more than all the ads
      const ads = await KV.connect(account1).allAds(KH.address, KNFT.address, 0, 10000);
      expect(ads).to.to.have.lengthOf(2);
    }
 });
});