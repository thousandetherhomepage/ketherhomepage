var KetherHomepage = artifacts.require("./KetherHomepage.sol");

const deployed = {
  'rinkeby': {
    ownerAddress: "0x961Aa96FebeE5465149a0787B03bFa14D8e9033F",
    contractAddress: "0xB33831E22216200D57EC62e2F9E601daA50ce425",
  },
  'mainnet': {
    ownerAddress: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
    contractAddress: "d534d9f6e61780b824afaa68032a7ec11720ca12",
  },
};

module.exports = function(callback) {
  const cfg = deployed.mainnet;
  KetherHomepage
    .at(cfg.contractAddress)
    .then(function(contract) {
      return contract.withdraw({from: cfg.ownerAddress, gas: 48241 })
    })
    .then((err, res) => { console.log("success: ", err, res) })
    .catch(callback)
};
