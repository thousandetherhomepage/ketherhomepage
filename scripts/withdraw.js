const hre = require("hardhat");
const ethers = hre.ethers;

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

deployed['homestead'] = deployed['mainnet']; // Alias for ethers

async function main() {
  const network = await ethers.provider.getNetwork();
  const cfg = deployed[network.name];

  if (cfg === undefined) {
    throw "Unsupported network: "+ network.name;
  }

  const KH = await ethers.getContractAt("KetherHomepage", cfg.contractAddress);
  const ketherBalance = await ethers.provider.getBalance(KH.address)
  console.log("Withdrawing balance from KetherHomepage on network", network.name, "=", ethers.utils.formatUnits(ketherBalance), "ether");

  const [account] = await ethers.getSigners();
  if (account === undefined) {
    throw "Signer account not provided, specify ACCOUNT_PRIVATE_KEY";
  } else if (account.address === cfg.ownerAddress) {
    throw "Did not acquire signer for owner address: " + cfg.ownerAddress;
  }

  const txn = await KH.connect(account).withdraw();
  console.log("Sent withdraw transaction. Waiting for receipt:", tx.hash);

  const receipt = await txn.wait();
  console.log("Receipt:", receipt);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
