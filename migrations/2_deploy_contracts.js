var KetherHomepage = artifacts.require("./KetherHomepage.sol");

module.exports = function(deployer, network, accounts) {
  console.log("Deploying to: ", network, accounts);
  // We deploy the contract with the ownder being the first address from accounts
  const owner = accounts[0];
  if (network == "live") {
    const withdrawWallet = "0x00010dB6b405c4Cff3185926f5BDA140703A77c5";
    deployer.deploy(KetherHomepage, owner, withdrawWallet);
    return;
  }

  deployer.deploy(KetherHomepage, owner, accounts[0]);
};
