var KetherHomepage = artifacts.require("./KetherHomepage.sol");
// TODO should I query the contract to make sure the above values are right?
let weiPixelPrice = 1000000000000000;
let pixelsPerCell = 10;

let oneHundredCellPrice = 10 * 10 * pixelsPerCell * weiPixelPrice
contract('KetherHomepage initialization', function(accounts) {
	let owner = accounts[0]; // this is the account we deploy as owner, see 2_deploy_contracts.js

	let KH;
	before(function() {
		KetherHomepage.deployed()
			.then(function(instance) {
				KH = instance;
			});
	})

	it("should have an owner", function() {
		return KH.owner.call()
			.then(function(result) {
				assert.equal(result, owner);
			});
	});
});

contract('KetherHomepage buying', function(accounts) {
	let account1 = accounts[1];
	let account2 = accounts[2];

	let KH;
	before(function() {
		KetherHomepage.deployed()
			.then(function(instance) {
				KH = instance;
			});
	});

	it("shouldn't let users buy if they don't send enough eth", function() {
		return KH.buy(0, 0, 10, 10, { value: 1, from: account1 })
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
		let watcher = KH.Buy();
		let idx;
		return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
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
		// account1 bought 0,0,10,10 in a previous test
		KH.buy(5, 5, 10, 10, { value: oneHundredCellPrice, from: account2 })
			.then(function(returnValue) {
				assert.fail();
			})
			.catch(function(error) {
				assert(error.message.indexOf("invalid opcode") >= 0);
			})
	});
});
*/
/* contract('KetherHomepage publish', function(accounts) {
	let account1 = accounts[1];
	let account2 = accounts[2];

	let KH;
	before(function() {
		KetherHomepage.deployed()
			.then(function(instance) {
				KH = instance;
				return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
			});
	});

	it("should let a user publish an ad", function() {
		return KH.publish(0, "link", "image", false, { from: account1 })
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
			})
	});

	it("shouldn't let a user publish another user's ad", function() {
		KH.publish(0, "link", "image", false, { from: account2 })
			.then(function(returnValue) {
				assert.fail();
			})
			.catch(function(error) {
				assert(error.message.indexOf("invalid opcode") >= 0);
			})
	});
}); 

contract('KetherHomepage forceNSFW', function(accounts) {
	let owner = accounts[0];
	let account1 = accounts[1];

	let KH;
	before(function() {
		KetherHomepage.deployed()
			.then(function(instance) {
				KH = instance;

				return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
			})
	});

	it("should let the owner forceNSFW", function() {
		return KH.forceNSFW(0, true, { from: owner })
			.then(function(a) {

				return KH.getAd.call(0);
			})
			.then(function(ad) {
				// Make sure we added the ad
				assert.equal(true, ad[6]);
			})
	});

	it("shouldn't let non-owners forceNSFW", function() {
		KH.forceNSFW(0, true, { from: account1 })
			.then(function(returnValue) {
				assert.fail();
			})
			.catch(function(error) {
				assert(error.message.indexOf("invalid opcode") >= 0);
			})
	});
});

contract('KetherHomepage withdraw', function(accounts) {
	let owner = accounts[0];
	let account1 = accounts[1];

	let KH;
	before(function() {
		KetherHomepage.deployed()
			.then(function(instance) {
				KH = instance;
				return KH.buy(0, 0, 10, 10, { value: oneHundredCellPrice, from: account1 })
			})
	});

	it("should let the owner withdraw", function() {
		let initialBalance = web3.eth.getBalance(owner)

		return KH.withdraw({ from: owner })
			.then(function() {
				let newBalance = web3.eth.getBalance(owner)
				assert(newBalance.toNumber() > initialBalance.toNumber())
			})
	});

	it("shouldn't let non-owners withdraw", function() {
		KH.withdraw({ from: account1 })
			.then(function(returnValue) {
				assert.fail();
			})
			.catch(function(error) {
				assert(error.message.indexOf("invalid opcode") >= 0);
			})
	});
});
