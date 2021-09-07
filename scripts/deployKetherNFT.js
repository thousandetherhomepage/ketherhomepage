const hre = require("hardhat");
const ethers = hre.ethers;

const deployed = {
  'rinkeby': {
    ownerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherHomepageAddress: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
    ketherNFTOwnerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherNFTRendererAddress: "0xc767472dddaa5eb84e4dcc237101ae7fd7f2e03c",
    ketherNFTAddress: "0xB7fCb57a5ce2F50C3203ccda27c05AEAdAF2C221",
    ketherViewAddress: "0x126C76281Fb6ee945BeF9b92aaC5D46eB8bDA299",
  },
  'mainnet': {
    ownerAddress: "0xd534d9f6e61780b824afaa68032a7ec11720ca12",
    ketherNFTOwnerAddress: "0x714439382A47A23f7cdF56C9764ec22943f79361",
    ketherHomepageAddress: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
    ketherNFTRendererAddress: "0x228c17030a866CcBf6734fA4262Dee64f0E392be",
    ketherNFTAddress: "0x7bb952AB78b28a62b1525acA54A71E7Aa6177645",
    ketherViewAddress: "0xaC292791A8b398698363F820dd6FbEE6EDF71442",
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

  const feeData = await ethers.provider.getFeeData();
  console.log("Current fee data", ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei"));

  const gasPrice = await ethers.provider.getGasPrice();
  console.log("Current gas price", ethers.utils.formatUnits(gasPrice, "gwei"));

  const maxFeePerGas = feeData.maxFeePerGas;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
  //const maxFeePerGas = ethers.utils.parseUnits("80" , "gwei")
  //const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");

  // Confirm the contract is actually there
  const KH = await ethers.getContractAt("KetherHomepage", cfg.ketherHomepageAddress);

  const [account] = await ethers.getSigners();
  if (account === undefined) {
    throw "Signer account not provided, specify ACCOUNT_PRIVATE_KEY";
  } else if (account.address !== cfg.ketherNFTOwnerAddress) {
   // throw "Did not acquire signer for owner address: " + cfg.ketherNFTOwnerAddress + "; got: " + account.address;
  }
  console.log("Starting deploys from address:", account.address);

  const KetherNFT = await ethers.getContractFactory("KetherNFT");
  const KetherNFTRender = await ethers.getContractFactory("KetherNFTRender");
  const KetherView = await ethers.getContractFactory("KetherView");


  let ketherNFTRendererAddress = cfg["ketherNFTRendererAddress"];
  if (ketherNFTRendererAddress === undefined) {
    const KNFTrender = await KetherNFTRender.deploy({ maxFeePerGas, maxPriorityFeePerGas });
    console.log("Deploying KetherNFTRender to:", KNFTrender.address);
    ketherNFTRendererAddress = KNFTrender.address;

    const tx = await KNFTrender.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherNFTRender already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherNFTRendererAddress}`);

  let ketherNFTAddress = cfg["ketherNFTAddress"];
  if (ketherNFTAddress === undefined) {
    const KNFT = await KetherNFT.deploy(KH.address, ketherNFTRendererAddress, { maxFeePerGas, maxPriorityFeePerGas });
    console.log("Deploying KetherNFT to:", KNFT.address);
    ketherNFTAddress = KNFT.address;

    const tx = await KNFT.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherNFT already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherNFTAddress} "${KH.address}" "${ketherNFTRendererAddress}"`);

  let ketherViewAddress = cfg["ketherViewAddress"];
  if (ketherViewAddress === undefined) {
    const KView = await KetherView.deploy({ maxFeePerGas, maxPriorityFeePerGas });
    console.log("Deploying KetherView to:", KView.address);
    ketherViewAddress = KView.address;

    const tx = await KView.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherView already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherViewAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
