var KetherHomepage = artifacts.require("./KetherHomepage.sol");

module.exports = function(deployer, network, accounts) {
  console.log(deployer, network, accounts);
  // We deploy the contract with the ownder being the first address from accounts
  // TODO PRODUCTION: when we deploy to the real blockchain we may want to make this an environment variable
  deployer.deploy(KetherHomepage, accounts[0], accounts[1]);
};
