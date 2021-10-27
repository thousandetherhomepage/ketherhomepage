const { expect } = require('chai');

const weiPixelPrice = ethers.utils.parseUnits("0.001", "ether");
const pixelsPerCell = ethers.BigNumber.from(100);
const oneHundredCellPrice = pixelsPerCell.mul(weiPixelPrice).mul(100);

// FIXME: Is there a good way to import this from KetherSortition.sol?
const Errors = {
  MustHaveBalance: "must have tokens to nominate",
  OnlyMagistrate: "only active magistrate can do this",
  MustHaveEntropy: "waiting for entropy",
  MustHaveNominations: "must have nominations",
  AlreadyStarted: "election already started",
  NotExecuted: "election not executed",
  TermNotExpired: "term not expired",
  NotEnoughLink: "not enough LINK",
  NotNominated: "token is not nominated"
};

describe('KetherSortition', function() {
  let KetherHomepage, KetherNFT, KetherSortition;
  let accounts, KH, KNFT, KS;

  beforeEach(async () => {
    // NOTE: We're using V2 here because it's ported to newer solidity so we can debug more easily. It should also work with V1.
    KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
    KetherNFT = await ethers.getContractFactory("KetherNFT");
    KetherNFTRender = await ethers.getContractFactory("KetherNFTRender");
    KetherSortition = await ethers.getContractFactory("KetherSortition");
    MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    MockLink = await ethers.getContractFactory("MockLink");

    const [owner, withdrawWallet, account1, account2, account3] = await ethers.getSigners();
    accounts = {owner, withdrawWallet, account1, account2, account3};

    const keyHash = ethers.utils.formatBytes32String("🤷");
    const fee = 0;

    VRF = await MockVRFCoordinator.deploy();
    LINK = await MockLink.deploy();
    KH = await KetherHomepage.deploy(await owner.getAddress(), await withdrawWallet.getAddress());
    KNFTrender = await KetherNFTRender.deploy();
    KNFT = await KetherNFT.deploy(KH.address, KNFTrender.address);
    let hour = 60*60;
    KS = await KetherSortition.deploy(KNFT.address, KH.address, VRF.address, LINK.address, keyHash, fee, 2 * hour, 1 * hour);
  });

  const buyNFT = async function(account, x=0, y=0, width=10, height=10, link="link", image="image", title="title", NSFW=false, value=undefined) {
    if (value === undefined) {
      value = oneHundredCellPrice;
    }
    const txn = await KNFT.connect(account).buy(x, y, width, height, { value: value });
    const receipt = await txn.wait();
    const event = receipt.events.pop();
    const [idx] = event.args;
    //await KNFT.connect(account).publish(idx, link, image, title, false);
    return idx;
  }

  it("should respect the state machine", async function() {
    const {
      owner,
      account1,
    } = accounts;

    await expect(
      KS.connect(account1).completeElection()
    ).to.be.revertedWith(Errors.MustHaveEntropy);

    await expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.MustHaveNominations);

    await buyNFT(account1, x=0, y=0);
    await KS.connect(account1).nominateSelf();

    await expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.TermNotExpired);

    const termExpires = await KS.connect(account1).termExpires();
    await network.provider.send("evm_setNextBlockTimestamp", [termExpires.toNumber()]);
    await network.provider.send("evm_mine");

    await expect(
      VRF.connect(owner).sendRandomness(KS.address, ethers.utils.formatBytes32String(""), 42)
    ).to.be.revertedWith(Errors.NotExecuted);

    await KS.connect(account1).startElection();

    await expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    await expect(
      KS.connect(account1).nominateSelf()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    await expect(
      KS.connect(account1).completeElection()
    ).to.be.revertedWith(Errors.MustHaveEntropy);

    await VRF.connect(owner).sendRandomness(KS.address, ethers.utils.formatBytes32String(""), 42);

    await expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    await expect(
      KS.connect(account1).nominateSelf()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    await KS.connect(account1).completeElection();
  });

  it("should nominate ads by owner", async function() {
    const {
      owner,
      account1,
      account2,
    } = accounts;

    await buyNFT(account2, x=10, y=0); // 0th ad is the default magistrate
    expect(await KS.connect(account1).getMagistrate()).to.equal(await account2.getAddress());

    // Buy some more ads
    await buyNFT(account1, x=0, y=0); // 1
    await buyNFT(account1, x=0, y=10); // 2
    await buyNFT(account1, x=0, y=20); // 3

    await buyNFT(account2, x=10, y=10); // 4

    expect(await KS.connect(account1).nominatedPixels()).to.equal(0);
    await KS.connect(account1).nominateSelf();
    const nominatedPixels = 3*10*10*100;
    expect(await KS.connect(account1).nominatedPixels()).to.equal(nominatedPixels);

    // Fast forward to term expiring
    let termExpires = await KS.connect(account1).termExpires();
    await network.provider.send("evm_setNextBlockTimestamp", [termExpires.toNumber()]);
    await network.provider.send("evm_mine");

    await KS.connect(account1).startElection();

    // Each ad is 10000 pixels
    // 1 is 0-9999
    // 2 is 10000-19999
    // 3 is 20000-29999
    const randomness = 10000;
    await VRF.connect(owner).sendRandomness(KS.address, ethers.utils.formatBytes32String(""), randomness);
    expect(await KS.connect(account1).electionEntropy(), randomness);

    const electedToken = await KS.connect(account1).getNextMagistrateToken();
    expect(electedToken).to.equal(2);
    expect(await KS.connect(account1).magistrateToken()).to.not.equal(electedToken); // Election not completed yet

    await KS.connect(account1).completeElection();
    expect(await KS.connect(account1).magistrateToken()).to.equal(electedToken);

    expect(await KS.connect(account1).getMagistrate()).to.equal(account1.address);
    await KNFT.connect(account1).transferFrom(account1.address, account2.address, electedToken)
    expect(await KS.connect(account1).getMagistrate()).to.equal(account2.address);

    // Withdraw
    await owner.sendTransaction({to: KS.address, value: 1000});
    await expect(await KS.connect(account2).withdraw(account2.address)).to.changeEtherBalance(account2, 1000);

    // Check that we can start a new election
    expect(await KS.connect(account1).nominatedPixels()).to.equal(0);
    await KS.connect(account1).nominateSelf();
    expect(await KS.connect(account1).nominatedPixels()).to.equal(20000);

    // Fast forward to term expiring
    termExpires = await KS.connect(account1).termExpires();
    await network.provider.send("evm_setNextBlockTimestamp", [termExpires.toNumber()]);
    await network.provider.send("evm_mine");
    await KS.connect(account1).startElection();
    await VRF.connect(owner).sendRandomness(KS.address, ethers.utils.formatBytes32String(""), randomness+1);
    expect(await KS.connect(account1).electionEntropy(), randomness+1);
    await KS.connect(account1).completeElection();
    expect(await KS.connect(account1).getMagistrate()).to.equal(account1.address);


    // Withdraw
    await owner.sendTransaction({to: KS.address, value: 1001});
    await expect(KS.connect(account2).withdraw(account2.address)).to.be.revertedWith(Errors.OnlyMagistrate);
    await expect(await KS.connect(account1).withdraw(account1.address)).to.changeEtherBalance(account1, 1001);

    // Step down
    termExpires = await KS.connect(account1).termExpires();
    await KS.connect(account1).stepDown();
    expect((await KS.connect(account1).termExpires()).toNumber()).to.be.lessThan(termExpires.toNumber());

  });

  // needed tests
  it("should not nominate ads you don't own", async function() {
    const {
      account1,
      account2
    } = accounts;
     await buyNFT(account2, x=10, y=0); // 0
     await buyNFT(account1, x=0, y=0);   // 1
     await buyNFT(account1, x=0, y=10); // 2
     await buyNFT(account1, x=0, y=20); // 3

     // account2 only has one ad
     expect(await KS.connect(account2).nominatedPixels()).to.equal(0);
     await KS.connect(account2).nominateSelf();
     expect(await KS.connect(account2).nominatedPixels()).to.equal(10000);
     await expect(KS.connect(account2).nominate(1,1)).to.be.revertedWith(Errors.MustHaveBalance);
     expect(await KS.connect(account2).nominatedPixels()).to.equal(10000);

    // nominate as account 1
    await KS.connect(account1).nominateSelf();
    expect(await KS.connect(account2).nominatedPixels()).to.equal(40000);

    // transfer 0 token
    expect(await KS.connect(account1).getNominatedToken(0)).to.equal(0);
    await KNFT.connect(account2).transferFrom(account2.address, account1.address, 0)
    KS.connect(account1).nominate(0,1)
    expect(await KS.connect(account1).getNominatedToken(0)).to.equal(1);
    expect(await KS.connect(account1).nominatedPixels()).to.equal(40000);


  });
  it("should be able to override nomination", async function() {
    const {
      account1,
      account2
    } = accounts;

    await buyNFT(account1, x=0, y=0);
    await expect(KS.connect(account1).getNominatedToken(0)).to.be.revertedWith(Errors.NotNominated);
    await KS.connect(account1).nominateSelf();
    expect(await KS.connect(account1).getNominatedToken(0)).to.equal(0);
    // token hasn't been minted
    await expect(KS.connect(account1).nominateAll(1)).to.be.reverted;

    await buyNFT(account2, x=10, y=0);
    await KS.connect(account1).nominateAll(1);
    expect(await KS.connect(account1).getNominatedToken(0)).to.equal(1);
  });

  // nice to have tests
  xit("should withdraw LINK");


});
