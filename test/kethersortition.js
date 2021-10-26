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

    expect(
      KS.connect(account1).completeElection()
    ).to.be.revertedWith(Errors.MustHaveEntropy);

    expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.MustHaveNominations);

    await buyNFT(account1, x=0, y=0);
    await KS.connect(account1).nominateSelf();

    expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.TermNotExpired);

    const termExpires = await KS.connect(account1).termExpires();
    await network.provider.send("evm_setNextBlockTimestamp", [termExpires.toNumber()]);
    await network.provider.send("evm_mine");

    expect(
      VRF.connect(owner).sendRandomness(KS.address, ethers.utils.formatBytes32String(""), 42)
    ).to.be.revertedWith(Errors.NotExecuted);

    await KS.connect(account1).startElection();

    expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    expect(
      KS.connect(account1).nominateSelf()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    expect(
      KS.connect(account1).completeElection()
    ).to.be.revertedWith(Errors.MustHaveEntropy);

    await VRF.connect(owner).sendRandomness(KS.address, ethers.utils.formatBytes32String(""), 42);

    expect(
      KS.connect(account1).startElection()
    ).to.be.revertedWith(Errors.AlreadyStarted);

    expect(
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
    const termExpires = await KS.connect(account1).termExpires();
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
  });

  // needed tests
  xit("should not nominate ads you don't own");
  xit("should be able to override nomination");
  xit("changing owners after magistrate is set changes magistrate");
  xit("changing owners allows new owner to re-nominate"); // esp nominateAll
  xit("test multiple terms"); // cant do election with 0 noms, make sure nominations from prev elections don't count
  xit("chainlink helpers are private")
  xit("should withdraw");
  xit("stepdown works");

  // nice to have tests
  xit("should withdraw LINK");


});
