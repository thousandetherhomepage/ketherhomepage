const hre = require("hardhat");
const ethers = hre.ethers;

const fs = require("fs/promises");

const deployed = {
  'rinkeby': {
    ownerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherHomepageAddress: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
    ketherNFTOwnerAddress: "0xbCb061d2feE38DCB6DE7e5D269852B4BDb986Ed6",
    ketherNFTRendererAddress: "0xc767472dddaa5eb84e4dcc237101ae7fd7f2e03c",
    ketherNFTAddress: "0xB7fCb57a5ce2F50C3203ccda27c05AEAdAF2C221",
    ketherViewAddress: "0xd58d4ff574140472f9ae2a90b6028df822c10109",
    ketherSortitionAddress: "0xA194a30C201523631E29EFf80718D72994eFa1d6",
  },
  'mainnet': {
    ownerAddress: "0xd534d9f6e61780b824afaa68032a7ec11720ca12",
    ketherNFTOwnerAddress: "0x714439382A47A23f7cdF56C9764ec22943f79361",
    ketherHomepageAddress: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
    ketherNFTRendererAddress: "0x228c17030a866CcBf6734fA4262Dee64f0E392be",
    ketherNFTAddress: "0x7bb952AB78b28a62b1525acA54A71E7Aa6177645",
    ketherViewAddress: "0xaC292791A8b398698363F820dd6FbEE6EDF71442",
    ketherSortitionAddress: "0xa9a57f7d2A54C1E172a7dC546fEE6e03afdD28E2",
  },
};

// Alias for ethers
const networkNames = {
  'homestead': 'mainnet',
  'rinkeby': 'rinkeby'
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = networkNames[network.name];

  const cfg = deployed[networkName];

  if (cfg === undefined) {
    throw "Unsupported network: "+ network.name;
  }

  const basePath = `${__dirname}/../../kethernft-images/${networkName}`;

  const grid = await fs.readFile(`${basePath}/grid.svg`, "utf-8");

  const KetherHomepage = await ethers.getContractFactory("KetherHomepageV2");
  const KetherView = await ethers.getContractFactory("KetherView");

  const KH = await KetherHomepage.attach(cfg.ketherHomepageAddress);
  const KV = await KetherView.attach(cfg.ketherViewAddress);

  const len = await KH.getAdsLength();
  const chunkSize = 100;
  for (let offset=0; offset < len; offset += chunkSize) {
    // TODO: this fails for Rinkeby with
    // Error: cannot estimate gas; transaction may fail or may require manual gas limit (error={"name":"ProviderError","code":-32000,"_isProviderError":true}, method="call", transaction={"from":"0xd4cDdaD41Ba3475Fb5573aCbE0757cE1c15F1374","to":"0x126C76281Fb6ee945BeF9b92aaC5D46eB8bDA299","data":"0xa96cf3ea000000000000000000000000b88404dd8fe4969ef67841250baef7f04f6b1a5e000000000000000000000000b7fcb57a5ce2f50c3203ccda27c05aeadaf2c22100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001","accessList":null}, code=UNPREDICTABLE_GAS_LIMIT, version=providers/5.4.5)
    console.log("KV.allAds", cfg.ketherHomepageAddress, cfg.ketherNFTAddress, offset, chunkSize);
    let ads = await KV.allAds(cfg.ketherHomepageAddress, cfg.ketherNFTAddress, offset, chunkSize);

    for (ad of ads) {
      const path = `${basePath}/${ad.idx}.svg`;
      console.log("Generating:", path);
      await fs.writeFile(path, svg(grid, ad));
    }
  }
}

function svg(grid, ad) {
  const x = ad.x.toNumber();
  const y = ad.y.toNumber();
  const width = ad.width.toNumber();
  const height = ad.height.toNumber();

  return `
  <svg width="1000" height="1100" viewBox="0 0 1000 1110" xmlns="http://www.w3.org/2000/svg" style="background:#4a90e2">
    <style>text {font:bold 30px sans-serif;fill:#fff;}</style>
    <text x="5" y="34">Thousand Ether Homepage</text>
    <text x="995" y="34" text-anchor="end">#${ad.idx}</text>
    <svg y="50" width="1000" height="1000" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="white"></rect>
      <g width="100" height="100" opacity="0.2">
        ${grid}
      </g>
      <rect x="${x-1}" y="${y-1}" width="${width+2}" height="${height+2}" fill="rgba(255,255,255,0.5)" rx="1" stroke="rgba(66,185,131,0.1)" />
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="rgb(66,185,131)"></rect>
    </svg>
    <text x="5" y="1085">Size ${width}x${height}</text>
    <text x="995" y="1085" text-anchor="end">Position [${x},${y}]</text>
  </svg>
  `
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
