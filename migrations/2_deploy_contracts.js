var KetherHomepage = artifacts.require("./KetherHomepage.sol");

module.exports = function(deployer, network, accounts) {
  // We deploy the contract with the ownder being the first address from accounts
  if (network == "live") {
    const withdrawWallet = "0x00010dB6b405c4Cff3185926f5BDA140703A77c5";
    deployer.deploy(KetherHomepage, accounts[0], withdrawWallet);
    return;
  }

  deployer.deploy(KetherHomepage, accounts[0], accounts[0]);
};
