require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");

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
  etherscan: {
    apiKey: process.env['ETHERSCAN_API_KEY']
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: false
            }
          },
        }
      },
      {
        // Original KetherHomepage contract
        version: "0.4.15",
      },
    ],
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false,
    currency: 'USD',
    // Note: Prices are hardcoded for now
    gasPrice: 100,
    ethPrice: 4000,
  },
};

