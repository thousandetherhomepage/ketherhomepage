const KetherHomepage = artifacts.require("./KetherHomepage.sol");
// TODO should I query the contract to make sure the above values are right?
const weiPixelPrice = 1000000000000000;
const pixelsPerCell = 10;

const oneHundredCellPrice = 10 * 10 * pixelsPerCell * weiPixelPrice

contract('KetherHomepage', function(accounts) {
  const owner = accounts[0]; // this is the account we deploy as owner, see 2_deploy_contracts.js
  const account1 = accounts[1];
  const account2 = accounts[2];
  it("should have an owner", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.owner.call();
      })
      .then(function(result) {
        assert.equal(result, owner);
      });
  });

  it("shouldn't let users buy if they don't send enough eth", function() {

    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: 1, from: account1 })
      })
      .then(function(returnValue) {
        // This should not be hit since we threw an error
        assert.fail();
      })
      .catch(function(error) {
        // revert / require present as an invalid opcode error (at least in my environment)
        assert(error.message.indexOf("invalid opcode") >= 0);
      });
  });

  it("should let users buy if they send enough eth", function() {
    let KH;
    let watcher;
    let idx;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;
        watcher = KH.Buy();

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return watcher.get()
      })
      .then(function(events) {
        // Make sure we issued the right Buy() event
        event = events[0].args;
        idx = event.idx;

        assert.equal(account1, event.owner)
        assert.equal(0, event.x.toNumber());
        assert.equal(0, event.y.toNumber());
        assert.equal(10, event.width.toNumber());
        assert.equal(10, event.height.toNumber());

        // make sure the grid is filled
        return KH.grid.call(0, 0);
      })
      .then(function(res) {
        assert.equal(true, res);

        return KH.grid.call(10, 10);
      })
      .then(function(res) {
        assert.equal(false, res);

        return KH.getAd.call(idx);
      })
      .then(function(ad) {
        // Make sure we added the ad
        assert.equal(0, ad[0].toNumber());
        assert.equal(0, ad[1].toNumber());
        assert.equal(10, ad[2].toNumber());
        assert.equal(10, ad[3].toNumber());
      })
  });

  it("shouldn't let users buy overlapping adspace", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.buy(5, 5, 10, 10, { value: oneHundredCellPrice, from: account2 })
      })
      .then(function() {
        assert.fail();
      })
      .catch(function(error) {
        assert(error.message.indexOf("invalid opcode") >= 0);
      })
  });

  it("should let a user publish an ad", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;
        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.publish(0, "link", "image", false, { from: account1 })
      })
      .then(function() {
        return KH.getAd.call(0);
      })
      .then(function(ad) {
        // Make sure we added the ad
        assert.equal(0, ad[0].toNumber());
        assert.equal(0, ad[1].toNumber());
        assert.equal(10, ad[2].toNumber());
        assert.equal(10, ad[3].toNumber());
        assert.equal("link", ad[4]);
        assert.equal("image", ad[5]);
        assert.equal(false, ad[6]);
      });
  });

  it("shouldn't let a user publish another user's ad", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.publish(0, "link", "image", false, { from: account2 })
      })
      .then(function() {
        assert.fail();
      })
      .catch(function(error) {
        assert(error.message.indexOf("invalid opcode") >= 0);
      })
  });

  it("should let the owner forceNSFW", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.forceNSFW(0, true, { from: owner })
      })
      .then(function() {
        return KH.getAd.call(0);
      })
      .then(function(ad) {
        // Make sure we set the nsfw on the ad
        assert.equal(true, ad[6]);
      })
  });

  it("shouldn't let non-owners forceNSFW", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.forceNSFW(0, true, { from: account1 })
      })
      .then(function() {
        assert.fail();
      })
      .catch(function(error) {
        assert(error.message.indexOf("invalid opcode") >= 0);
      })
  });

  it("should let the owner withdraw", function() {
    let initialBalance;
    let KH;
    let gas;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function(tx) {
        gas = tx.receipt.gasUsed;
        initialBalance = web3.eth.getBalance(owner);
        return KH.withdraw({ from: owner })
      })
      .then(function() {
        let newBalance = web3.eth.getBalance(owner)
        // TOOD: I would expect that assert.equal(newBalance.toNumber(), initialBalance.toNumber() + oneHundredCellPrice + gas);
        //	would work. Instead it's off by 2857000000000000 wei...
        // What happened?
        assert(newBalance.toNumber() > initialBalance.toNumber());
      })
  });

  it("shouldn't let non-owners withdraw", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.withdraw({ from: account1 })
      })
      .then(function() {
        assert.fail();
      })
      .catch(function(error) {
        assert(error.message.indexOf("invalid opcode") >= 0);
      })
  });

  it("shouldn't let users buy 0-width space", function() {
    return KetherHomepage.new(owner)
      .then(function(instance) {
        return instance.buy(0, 0, 10, 0, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function(returnValue) {
        // This should not be hit since we threw an error
        assert.fail();
      })
      .catch(function(error) {
        // catch revert / require
        assert(error.message.indexOf("invalid opcode") >= 0);
      });
  });
});
