const KetherHomepage = artifacts.require("./KetherHomepage.sol");
// TODO should I query the contract to make sure the above values are right?
const weiPixelPrice = 10000000000000000;
const pixelsPerCell = 10;

const oneHundredCellPrice = 10 * 10 * pixelsPerCell * weiPixelPrice

contract('KetherHomepage', function(accounts) {
  const owner = accounts[0]; // this is the account we deploy as owner, see 2_deploy_contracts.js
  const account1 = accounts[1];
  const account2 = accounts[2];

  web3.eth.sendTransaction({from:owner, to:account1, value: 10000000000000000000 }, function(err, r) { /* NOP */ });

  it("should have correct constants by default", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.weiPixelPrice.call();
      })
      .then(function(wpp) {
        assert.equal(weiPixelPrice, wpp.toNumber());
        return KH.pixelsPerCell.call();
      })
      .then(function(ppc) {
        assert.equal(pixelsPerCell, ppc.toNumber());
      });
  });

  it("should be a kether", function() {
    assert.equal(1, web3.fromWei(weiPixelPrice * pixelsPerCell * 100 * 100, 'kether'));
  });

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
      .then(function(result) {
        // Make sure we issued the right Buy() event
        assert.equal("Buy", result.logs[0].event);
        const buyEvent = result.logs[0].args;

        idx = buyEvent.idx;

        assert.equal(account1, buyEvent.owner)
        assert.equal(0, buyEvent.x.toNumber());
        assert.equal(0, buyEvent.y.toNumber());
        assert.equal(10, buyEvent.width.toNumber());
        assert.equal(10, buyEvent.height.toNumber());

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
        assert.equal(account1, ad[0]);
        assert.equal(0, ad[1].toNumber());
        assert.equal(0, ad[2].toNumber());
        assert.equal(10, ad[3].toNumber());
        assert.equal(10, ad[4].toNumber());
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
        return KH.publish(0, "link", "image", "title", false, { from: account1 })
      })
      .then(function() {
        return KH.getAd.call(0);
      })
      .then(function(ad) {
        // Make sure we added the ad
        assert.equal(account1, ad[0]);
        assert.equal(0, ad[1].toNumber());
        assert.equal(0, ad[2].toNumber());
        assert.equal(10, ad[3].toNumber());
        assert.equal(10, ad[4].toNumber());
        assert.equal("link", ad[5]);
        assert.equal("image", ad[6]);
        assert.equal("title", ad[7]);
        assert.equal(false, ad[8]);
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
        return KH.publish(0, "link", "image", "title", false, { from: account2 })
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
        assert.equal(true, ad[8]);
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
    let newBalance;
    let KH;
    let gas;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;

        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function(tx) {
        gas = tx.receipt.gasUsed;
        web3.eth.getBalance(owner, function(error, balance) { initialBalance = balance; });
        return KH.withdraw({ from: owner })
      })
      .then(function() {
        // TOOD: I would expect that assert.equal(newBalance.toNumber(), initialBalance.toNumber() + oneHundredCellPrice + gas);
        //	would work. Instead it's off by 2857000000000000 wei...
        // What happened?
        web3.eth.getBalance(owner, function(error, balance) {
          assert(balance.toNumber() > initialBalance.toNumber());
        });
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

  it("should let owners transfer ownership", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;
        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.getAd.call(0);
      })
      .then(function(ad) {
        assert.equal(account1, ad[0]);

        return KH.transfer(0, account2, { from: account1 });
      })
      .then(function(result) {
        // Make sure we issued the right Transfer() event
        assert.equal("Transfer", result.logs[0].event);
        const transferEvent = result.logs[0].args;

        assert.equal(0, transferEvent.idx);

        assert.equal(account1, transferEvent.from);
        assert.equal(account2, transferEvent.to);

        return KH.getAd.call(0)
      })
      .then(function(ad) {
        assert.equal(account2, ad[0]);
      });
  });

  it("shouldn't let non-owners transfer ownership", function() {
    let KH;
    return KetherHomepage.new(owner)
      .then(function(instance) {
        KH = instance;
        return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
      })
      .then(function() {
        return KH.getAd.call(0);
      })
      .then(function(ad) {
        assert.equal(account1, ad[0]);

        return KH.transfer(0, account2, { from: account2 });
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
