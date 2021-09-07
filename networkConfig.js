import { ethers } from "ethers";

import contractJSON from "~/artifacts/contracts/KetherHomepage.sol/KetherHomepage.json";
import ketherNFTJSON from "~/artifacts/contracts/KetherNFT.sol/KetherNFT.json";
import ketherViewJSON from "~/artifacts/contracts/KetherView.sol/KetherView.json";

export const deployConfig = {
    homestead: {
        name: "main",
        contractAddr: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
        ketherNFTAddr: "0x7bb952ab78b28a62b1525aca54a71e7aa6177645",
        ketherViewAddr: "0xaC292791A8b398698363F820dd6FbEE6EDF71442",
        web3Fallback: "https://mainnet.infura.io/v3/fa9f29a052924745babfc1d119465148",
        etherscanLink: "https://etherscan.io/address/0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
        prerendered: {
            image: "https://storage.googleapis.com/storage.thousandetherhomepage.com/mainnet.png",
            data: "https://storage.thousandetherhomepage.com/mainnet.json",
            loadRemoteImages: true,
            loadFromWeb3: true,
        },
    },
    rinkeby: {
        name: "rinkeby",
        contractAddr: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
        ketherNFTAddr: "0xb7fcb57a5ce2f50c3203ccda27c05aeadaf2c221",
        ketherViewAddr: "0xd58D4ff574140472F9Ae2a90B6028Df822c10109",
        web3Fallback: "https://rinkeby.infura.io/v3/fa9f29a052924745babfc1d119465148",
        etherscanLink: "https://rinkeby.etherscan.io/address/0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
        prerendered: {
            image: "https://storage.googleapis.com/storage.thousandetherhomepage.com/rinkeby.png",
            data: "https://storage.thousandetherhomepage.com/rinkeby.json",
            loadRemoteImages: true,
            loadFromWeb3: true,
        },
    },
};
deployConfig.mainnet = deployConfig.homestead;
export const defaultNetwork = "homestead";

export const loadContracts = (networkConfig, provider) => {
    const contract = new ethers.Contract(networkConfig.contractAddr, contractJSON.abi, provider);
    const ketherNFT = new ethers.Contract(networkConfig.ketherNFTAddr, ketherNFTJSON.abi, provider);
    const ketherView = new ethers.Contract(networkConfig.ketherViewAddr, ketherViewJSON.abi, provider);

    return {contract, ketherNFT, ketherView}
}
