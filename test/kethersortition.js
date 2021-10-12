const { expect } = require('chai');

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

describe('KetherSortition', function() {
  let KetherHomepage, KetherNFT, KetherSortition;
  let accounts, KH, KNFT, KS;

  beforeEach(async () => {
    // NOTE: We're using V2 here because it's ported to newer solidity so we can debug more easily. It should also work with V1.
    KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
    KetherNFT = await ethers.getContractFactory("KetherNFT");
    KetherNFTRender = await ethers.getContractFactory("KetherNFTRender");
    KetherSortition = await ethers.getContractFactory("KetherSortition");

    const [owner, withdrawWallet, account1, account2, account3] = await ethers.getSigners();
    accounts = {owner, withdrawWallet, account1, account2, account3};

    const vrfCoordinator = await owner.getAddress();
    const linkAddress = await owner.getAddress();
    const keyHash = ethers.utils.formatBytes32String("🤷");
    const fee = 0;

    KH = await KetherHomepage.deploy(await owner.getAddress(), await withdrawWallet.getAddress());
    KNFTrender = await KetherNFTRender.deploy();
    KNFT = await KetherNFT.deploy(KH.address, KNFTrender.address);
    KS = await KetherSortition.deploy(KNFT.address, KH.address, vrfCoordinator, linkAddress, keyHash, fee);
  });

  const buyNFT = async function(account, x=0, y=0, width=10, height=10, link="link", image="image", title="title", NSFW=false, value=undefined) {
    if (value === undefined) {
      value = weiPixelPrice.mul(width * height * 100);
    }
    const txn = await KNFT.connect(account).buy(x, y, width, height, { value: value });
    const receipt = await txn.wait();
    const event = receipt.events.pop();
    const [idx] = event.args;
    //await KNFT.connect(account).publish(idx, link, image, title, false);
    return idx;
  }

  it("it should nominate ads by owner", async function() {
    const {
      owner,
      account1,
      account2,
    } = accounts;

    // Buy some ads
    await buyNFT(account1, x=0, y=0);
    await buyNFT(account1, x=0, y=10);
    await buyNFT(account1, x=0, y=20);

    await buyNFT(account2, x=10, y=0);
    await buyNFT(account2, x=10, y=10);

    expect(await KS.connect(account1).nominatedPixels()).to.equal(0);
    await KS.connect(account2).nominateSelf();
    expect(await KS.connect(account1).nominatedPixels()).to.equal(10*10*10*2);

    // TODO: Write more tests
 });
});
