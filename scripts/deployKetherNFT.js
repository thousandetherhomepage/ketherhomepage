const hre = require("hardhat");
const ethers = hre.ethers;

const deployed = {
  'rinkeby': {
    ownerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherHomepageAddress: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
    ketherNFTRendererAddress: "0x7cdA37F0d0c0a3e85747c7270721B472171cF39E",
    ketherNFTAddress: "0xfDb8591751FCd30105Ae409d56529c8D8039fCD9",
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
  } else if (account.address !== cfg.ownerAddress) {
    throw "Did not acquire signer for owner address: " + cfg.ownerAddress + "; got: " + account.address;
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

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${cfg["ketherNFTRendererAddress"]}`);

  if (cfg["ketherNFTAddress"] === undefined) {
    const KNFT = await KetherNFT.deploy(KH.address, ketherNFTRendererAddress);
    console.log("Deploying KetherNFT to:", KNFT.address);

    const tx = await KNFT.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherNFT already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${cfg["ketherNFTAddress"]} "${KH.address}" "${ketherNFTRendererAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
