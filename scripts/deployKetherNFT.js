const hre = require("hardhat");
const ethers = hre.ethers;

const deployed = {
  'sepolia': {
    ownerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherHomepageAddress: "0xA6fE3123bE665C716F71944705ecC8057E35cd90",
    ketherNFTOwnerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherNFTRendererAddress: "0xd81620fc592c6DC4104FAa9bec1E1e5F5562d8fd", // V2
    ketherNFTAddress: "0x6B69B05a5478A2390493765b496F70A52fE7b816",
    ketherViewAddress: "0xc7Eaa7aC2dE304d9cDAd21AF81BffA273363d3d1",
    ketherSortitionAddress: "0x09BCa032F3b3a08afCFf03826edf4F36481b486C",
  },
  'rinkeby': {
    ownerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherHomepageAddress: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
    ketherNFTOwnerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherNFTRendererAddress: "0xf611Ee721450Aa52bB16283D32784469eBF106E7", // V2
    ketherNFTAddress: "0xB7fCb57a5ce2F50C3203ccda27c05AEAdAF2C221",
    ketherViewAddress: "0xd58D4ff574140472F9Ae2a90B6028Df822c10109",
    ketherSortitionAddress: "0xA194a30C201523631E29EFf80718D72994eFa1d6",
  },
  'mainnet': {
    ownerAddress: "0xd534d9f6e61780b824afaa68032a7ec11720ca12",
    ketherNFTOwnerAddress: "0x714439382A47A23f7cdF56C9764ec22943f79361",
    ketherHomepageAddress: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
    ketherNFTRendererAddress: "0xdAdf78F35dED924823dd80A2312F1b97549C4f7b", // V2
    ketherNFTAddress: "0x7bb952AB78b28a62b1525acA54A71E7Aa6177645",
    ketherViewAddress: "0xaC292791A8b398698363F820dd6FbEE6EDF71442",
    ketherSortitionAddress: "0xa9a57f7d2A54C1E172a7dC546fEE6e03afdD28E2",
  },
};
deployed['homestead'] = deployed['mainnet']; // Alias for ethers

const rendererConfig = {
  'sepolia': {
    'baseURI': "ipfs://QmYhpcC8esDv2uL9cJUdY5FSUdDHAZQDsk7pwBb7BJgeXo/",
  },
  'rinkeby': {
    'baseURI': "ipfs://QmYhpcC8esDv2uL9cJUdY5FSUdDHAZQDsk7pwBb7BJgeXo/",
  },
  'mainnet': {
    'baseURI': "ipfs://QmXZtDgNBy4kL6meGcvNHqgrGFCV7uer6h3ixFy1BjCMr7/",
  },
};
rendererConfig['homestead'] = rendererConfig['mainnet']; // Alias for ethers

// Via https://docs.chain.link/docs/vrf-contracts/#config
const sortitionConfig = {
  'sepolia': {
    'vrfCoordinator': '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
    'link': '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    'keyHash': '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
    'fee': ethers.BigNumber.from('250000000000000000'), // 0.25 LINK (18 decimals)
    'termDuration': ethers.BigNumber.from(60 * 60), // 1 hour
    'minElectionDuration': ethers.BigNumber.from(60 * 10), // 10 minutes
  },
  'rinkeby': {
    'vrfCoordinator': '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B',
    'link': '0x01BE23585060835E02B77ef475b0Cc51aA1e0709',
    'keyHash': '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311',
    'fee': ethers.BigNumber.from('100000000000000000'), // 0.1 LINK (18 decimals)
    'termDuration': ethers.BigNumber.from(60 * 60), // 1 hour
    'minElectionDuration': ethers.BigNumber.from(60 * 10), // 10 minutes
  },
  'mainnet': {
    'vrfCoordinator': '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952',
    'link': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    'keyHash': '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445',
    'fee': ethers.BigNumber.from('2000000000000000000'), // 2 LINK (18 decimals)
    'termDuration': ethers.BigNumber.from(60 * 60 * 24 * 7 * 6), // 6 weeks
    'minElectionDuration': ethers.BigNumber.from(60 * 60 * 24 * 3), // 3 days
  },
};
sortitionConfig['homestead'] = sortitionConfig['mainnet']; // Alias for ethers

async function main() {
  const network = await ethers.provider.getNetwork();
  const cfg = deployed[network.name];

  if (cfg === undefined) {
    throw "Unsupported network: "+ network.name;
  }

  let feeData, targetGasFee, gasPrice;

  if (network.name !== 'rinkeby' && network.name !== 'sepolia') {
    throw "Only rinkeby and sepolia allowed by default";
    targetGasFee = ethers.utils.parseUnits("121" , "gwei");
  } else {
    targetGasFee = ethers.utils.parseUnits("3" , "gwei");
  }

  console.log("Waiting until target gas fee:", ethers.utils.formatUnits(targetGasFee, "gwei"));
  while (true) {
    feeData = await ethers.provider.getFeeData();
    gasPrice = feeData.gasPrice;

    console.log(+new Date(), "Current fee data: ", "priority=", ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "maxFeePerGas=", ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei"), "gasPrice=", ethers.utils.formatUnits(feeData.gasPrice, "gwei"));

    if (targetGasFee.gte(feeData.gasPrice)) {
      console.log("TARGET GAS REACHED, DEPLOYING!");
      break;
    }

    await new Promise(r => setTimeout(r, 30 * 1000)); // 30 seconds
  }


  const gasConfig = {
    maxFeePerGas: feeData.maxFeePerGas, // gasPrice is baseFee + priorityFee
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas, // This will put it a bit above what we need
    //maxFeePerGas: ethers.utils.parseUnits("106" , "gwei"),
    //maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
  };

  const [account] = await ethers.getSigners();
  if (account === undefined) {
    throw "Signer account not provided, specify ACCOUNT_PRIVATE_KEY";
  } else if (account.address !== cfg.ketherNFTOwnerAddress) {
   // throw "Did not acquire signer for owner address: " + cfg.ketherNFTOwnerAddress + "; got: " + account.address;
  }
  console.log("Starting deploys from address", account.address, "with gas config", gasConfig);


  const KetherHomepage = await ethers.getContractFactory("KetherHomepage");
  const KetherNFT = await ethers.getContractFactory("KetherNFT");
  const KetherNFTRenderV2 = await ethers.getContractFactory("KetherNFTRenderV2");
  const KetherView = await ethers.getContractFactory("KetherView");
  const KetherSortition = await ethers.getContractFactory("KetherSortition");

  let ketherHomepageAddress = cfg.ketherHomepageAddress;
  let KH;
  if (ketherHomepageAddress === undefined) {
    KH = await KetherHomepage.deploy(cfg.ownerAddress, cfg.ownerAddress, gasConfig);
    console.log("Deploying KetherHomepage to:", KH.address);
    ketherHomepageAddress = KH.address;

    const tx = await KH.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    // Confirm the contract is actually there
    KH = await ethers.getContractAt("KetherHomepage", ketherHomepageAddress);
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherHomepageAddress} "${cfg.ownerAddress}" "${cfg.ownerAddress}"`);

  const rendererCfg = rendererConfig[network.name];
  let ketherNFTRendererAddress = cfg["ketherNFTRendererAddress"];
  if (ketherNFTRendererAddress === undefined) {
    const KNFTrender = await KetherNFTRenderV2.deploy(rendererCfg.baseURI, gasConfig);
    console.log("Deploying KetherNFTRender to:", KNFTrender.address);
    ketherNFTRendererAddress = KNFTrender.address;

    const tx = await KNFTrender.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherNFTRender already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherNFTRendererAddress} "${rendererCfg.baseURI}"`);

  let ketherNFTAddress = cfg["ketherNFTAddress"];
  if (ketherNFTAddress === undefined) {
    const KNFT = await KetherNFT.deploy(KH.address, ketherNFTRendererAddress, gasConfig);
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
    const KView = await KetherView.deploy(gasConfig);
    console.log("Deploying KetherView to:", KView.address);
    ketherViewAddress = KView.address;

    const tx = await KView.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherView already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherViewAddress}`);


  const sortition = sortitionConfig[network.name];
  let ketherSortitionAddress = cfg["ketherSortitionAddress"];
  if (ketherSortitionAddress === undefined) {
    const KS = await KetherSortition.deploy(
      ketherNFTAddress, KH.address,
      sortition.vrfCoordinator, sortition.link, sortition.keyHash, sortition.fee,
      sortition.termDuration, sortition.minElectionDuration,
      gasConfig);
    console.log("Deploying KetherSortition to:", KS.address);
    ketherSortitionAddress = KS.address;

    const tx = await KS.deployTransaction.wait();
    console.log(" -> Mined with", tx.gasUsed.toString(), "gas");
  } else {
    console.log("KetherSortition already deployed");
  }

  console.log(`Verify on Etherscan: npx hardhat verify --network ${network.name} ${ketherSortitionAddress} ${ketherNFTAddress} ${KH.address} ${sortition.vrfCoordinator} ${sortition.link} ${sortition.keyHash} ${sortition.fee} ${sortition.termDuration} ${sortition.minElectionDuration}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
