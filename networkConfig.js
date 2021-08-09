export const deployConfig = {
    homestead: {
        name: "main",
        contractAddr: "0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
        ketherNFTAddr: "TODO", // Must be normalized per normalizeAddr (lowercase)
        web3Fallback:
            "https://mainnet.infura.io/v3/fa9f29a052924745babfc1d119465148",
        etherscanLink:
            "https://etherscan.io/address/0xb5fe93ccfec708145d6278b0c71ce60aa75ef925",
        prerendered: {
            image:
                "https://storage.googleapis.com/storage.thousandetherhomepage.com/mainnet.png",
            data: "https://storage.thousandetherhomepage.com/mainnet.json",
            loadRemoteImages: true,
            loadFromWeb3: true,
        },
    },
    rinkeby: {
        name: "rinkeby",
        contractAddr: "0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
        ketherNFTAddr: "TODO", // Must be normalized per normalizeAddr (lowercase)
        web3Fallback:
            "https://rinkeby.infura.io/v3/fa9f29a052924745babfc1d119465148",
        etherscanLink:
            "https://rinkeby.etherscan.io/address/0xb88404dd8fe4969ef67841250baef7f04f6b1a5e",
        prerendered: {
            image:
                "https://storage.googleapis.com/storage.thousandetherhomepage.com/rinkeby.png",
            data: "https://storage.thousandetherhomepage.com/rinkeby.json",
            loadRemoteImages: true,
            loadFromWeb3: true,
        },
    },
};
deployConfig.mainnet = deployConfig.homestead;
export const defaultNetwork = "homestead";
