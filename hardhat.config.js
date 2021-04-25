require("@nomiclabs/hardhat-waffle");

const INFURA_API_KEY = process.env['INFURA_API_KEY'];

const ACCOUNT_PRIVATE_KEY = process.env['ACCOUNT_PRIVATE_KEY'];

const ACCOUNTS = [];
if (ACCOUNT_PRIVATE_KEY !== undefined) {
  ACCOUNTS.push('0x' + ACCOUNT_PRIVATE_KEY);
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + INFURA_API_KEY,
      accounts: ACCOUNTS,
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + INFURA_API_KEY,
      accounts: ACCOUNTS,
    }
  },
  solidity: {
    compilers: [
      {
        // Original KetherHomepage contract
        version: "0.4.15",
      },
      {
        version: "0.8.0",
      },
    ],
  },
};

