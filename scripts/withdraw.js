var KetherHomepage = artifacts.require("./KetherHomepage.sol");

const deployed = {
  'rinkeby': {
    ownerAddress: "0x961Aa96FebeE5465149a0787B03bFa14D8e9033F",
    contractAddress: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
  },
  'mainnet': {
    ownerAddress: "0xd534d9f6e61780b824afaa68032a7ec11720ca12",
    contractAddress: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
  },
};

module.exports = function(callback) {
  const cfg = deployed.mainnet;
  KetherHomepage
    .at(cfg.contractAddress)
    .then(function(contract) {
      return contract.withdraw({from: cfg.ownerAddress, gas: 84968 })
    })
    .then((err, res) => { console.log("success: ", err, res) })
    .catch(callback)
};
