const { expect } = require('chai');

describe('KetherHomepage', function(accounts) {
  let KetherHomagepage;

  // TODO: should we query the contract to make sure the above values are right?
  const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
  const pixelsPerCell = ethers.BigNumber.from(100);
  const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

  let owner, withdrawWallet, account1, account2;
  before(async () => {
    KetherHomepage = await ethers.getContractFactory("KetherHomepage");

    // Initialize
    const accounts = await ethers.getSigners();
    owner = accounts[0]; // this is the account we deploy as owner, see 2_deploy_contracts.js
    withdrawWallet = accounts[1];
    account1 = accounts[2];
    account2 = accounts[3];

    await owner.sendTransaction({
      to: account1.getAddress(),
      value: ethers.utils.parseEther("100.0")
    })
  })

  let KH;
  beforeEach(async function () {
    KH = await KetherHomepage.deploy(owner.getAddress(), withdrawWallet.getAddress());
  });

  it("should have correct constants by default", async function() {
    const wpp = await KH.weiPixelPrice();
    expect(weiPixelPrice).to.equal(wpp);

    const ppc = await KH.pixelsPerCell();
    expect(pixelsPerCell).to.equal(ppc);
  });

  it("should be a kether", function() {
    const amount = weiPixelPrice.mul(pixelsPerCell).mul('10000'); // 100 * 100
    const ether = ethers.utils.formatUnits(amount, 'ether');
    expect(ether).to.equal('1000.0'); // 1 kether
  });

  it("shouldn't let users buy if they don't send enough eth", async function() {
    await expect(
      KH.connect(account1).buy(0, 0, 10, 10, { value: 1 })
    ).to.be.revertedWith("Transaction reverted without a reason");
  });

  it("should let users buy if they send enough eth", async function() {
    const result = await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    const receipt = await result.wait(); // Let events populate

    const events = await KH.queryFilter(KH.filters.Buy(), receipt.blockHash)
    const buyEvent = events[0];
    const idx = buyEvent.args.idx;

    // Make sure we issued the right Buy() event
    expect(buyEvent.event).to.equal('Buy');
    expect(idx).to.equal(0);

    expect(await account1.getAddress()).to.equal(buyEvent.args.owner);
    expect(0).to.equal(buyEvent.args.x.toNumber());
    expect(0).to.equal(buyEvent.args.y.toNumber());
    expect(10).to.equal(buyEvent.args.width.toNumber());
    expect(10).to.equal(buyEvent.args.height.toNumber());

    // Make sure the grid is filled
    expect(await KH.grid(0, 0)).to.be.true;
    expect(await KH.grid(10, 0)).to.be.false;

    const ads = await KH.ads(idx);

    // Make sure we added the ad
    expect(await account1.getAddress()).to.equal(ads[0]);
    expect(0).to.equal(ads[1].toNumber());
    expect(0).to.equal(ads[2].toNumber());
    expect(10).to.equal(ads[3].toNumber());
    expect(10).to.equal(ads[4].toNumber());
  });

  it("shouldn't let users buy overlapping adspace", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    await expect(
      KH.connect(account2).buy(5, 5, 10, 10, { value: oneHundredCellPrice })
    ).to.be.reverted
  });

  it("should let a user publish their own ad", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    await KH.connect(account1).publish(0, "link", "image", "title", false)
    const ad = await KH.ads(0);

    // Make sure we added the ad
    expect(await account1.getAddress()).to.equal(ad[0]);
    expect(0).to.equal(ad[1].toNumber());
    expect(0).to.equal(ad[2].toNumber());
    expect(10).to.equal(ad[3].toNumber());
    expect(10).to.equal(ad[4].toNumber());
    expect("link").to.equal(ad[5]);
    expect("image").to.equal(ad[6]);
    expect("title").to.equal(ad[7]);
    expect(false).to.equal(ad[8]);
  });

  it("shouldn't let a user publish another user's ad", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    await expect(
      KH.connect(account2).publish(0, "link", "image", "title", false)
    ).to.be.reverted
  });

  it("should let the contract owner forceNSFW", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    await KH.connect(owner).forceNSFW(0, true);
    const ad = await KH.ads(0);

    // Make sure we set the nsfw on the ad
    expect(ad[9]).to.be.true;
  });

  it("shouldn't let non contract owners forceNSFW", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    await expect(
      KH.connect(account1).forceNSFW(0, true)
    ).to.be.reverted
  });

  it("should let the owner withdraw", async function() {
    const tx = await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    const receipt = await tx.wait();
    const initialBalance = await withdrawWallet.getBalance();

    await KH.connect(owner).withdraw();

    const newBalance = await withdrawWallet.getBalance();
    expect(newBalance).to.equal(initialBalance.add(oneHundredCellPrice));
  });

  it("shouldn't let non-owners withdraw", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    await expect(
      KH.connect(account1).withdraw()
    ).to.be.reverted
  });

  it("shouldn't let users buy 0-width space", async function() {
    await expect(
      KH.connect(account1).buy(0, 0, 10, 0, { value: oneHundredCellPrice })
    ).to.be.reverted
  });

  it("shouldn't let users buy negative space", async function() {
    await expect(
      KH.connect(account1).buy(30, 30, -10, -10, { value: oneHundredCellPrice })
    ).to.be.reverted
  });

  it("shouldn't let users buy out of bounds space", async function() {
    await expect(
      KH.connect(account1).buy(99, 99, 10, 10, { value: oneHundredCellPrice })
    ).to.be.reverted
  });

  it("should let a user setAdOwner on their own ad", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    {
      const ad = await KH.ads(0);
      expect(await account1.getAddress()).to.equal(ad[0]);
    }
    const result = await KH.connect(account1).setAdOwner(0, await account2.getAddress());
    const receipt = await result.wait();

    const events = await KH.queryFilter(KH.filters.SetAdOwner(), receipt.blockHash)
    const event = events[0].args;

    expect(0).to.equal(event.idx);
    expect(await account1.getAddress()).to.equal(event.from);
    expect(await account2.getAddress()).to.equal(event.to);
    {
      const ad = await KH.ads(0);
      expect(await account2.getAddress()).to.equal(ad[0]);
    }
  });

  it("shouldn't let a user setAdOwner on another user's ad", async function() {
    await KH.connect(account1).buy(0, 0, 10, 10, { value: oneHundredCellPrice });
    {
      const ad = await KH.ads(0);
      expect(await account1.getAddress()).to.equal(ad[0]);
    }

    await expect(
      KH.connect(account2).setAdOwner(0, await account2.getAddress())
    ).to.be.reverted;
  });
});
