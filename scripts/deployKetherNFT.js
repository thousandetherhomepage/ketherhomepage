const hre = require("hardhat");
const ethers = hre.ethers;

const deployed = {
  'rinkeby': {
    ownerAddress: "0x961Aa96FebeE5465149a0787B03bFa14D8e9033F",
    ketherHomepageAddress: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
    ketherNFTRendererAddress: "0xA6fE3123bE665C716F71944705ecC8057E35cd90",
    ketherNFTAddress: "0xd81620fc592c6DC4104FAa9bec1E1e5F5562d8fd",
  },
  'mainnet': {
    ownerAddress: "0xd534d9f6e61780b824afaa68032a7ec11720ca12",
    ketherHomepageAddress: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
  },
};

deployed['homestead'] = deployed['mainnet']; // Alias for ethers

async function main() {
  const network = await ethers.provider.getNetwork();
  const cfg = deployed[network.name];

  if (cfg === undefined) {
    throw "Unsupported network: "+ network.name;
  }

  if (network.name !== 'rinkeby') {
    throw "Only rinkeby allowed by default";
  }

  // Confirm the contract is actually there
  const KH = await ethers.getContractAt("KetherHomepage", cfg.ketherHomepageAddress);

  const [account] = await ethers.getSigners();
  if (account === undefined) {
    throw "Signer account not provided, specify ACCOUNT_PRIVATE_KEY";
  } else if (account.address === cfg.ownerAddress) {
    throw "Did not acquire signer for owner address: " + cfg.ownerAddress;
  }
  console.log("Starting deploys from address:", account.address);

  const KetherNFT = await ethers.getContractFactory("KetherNFT");
  const KetherNFTRender = await ethers.getContractFactory("KetherNFTRender");

  let ketherNFTRendererAddress = cfg["ketherNFTRendererAddress"];
  if (ketherNFTRendererAddress === undefined) {
    const KNFTrender = await KetherNFTRender.deploy();
    console.log("Deploying KetherNFTRender to:", KNFTrender.address);
    ketherNFTRendererAddress = KNFTrender.address;

    const tx = await KNFTrender.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherNFTRender already deployed");
  }

  if (cfg["ketherNFTAddress"] === undefined) {
    const KNFT = await KetherNFT.deploy(KH.address, ketherNFTRendererAddress);
    console.log("Deploying KetherNFT to:", KNFT.address);

    const tx = await KNFT.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherNFT already deployed");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
