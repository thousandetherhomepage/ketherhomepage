var TestRPC = require('ethereumjs-testrpc');

module.exports = {
  networks: {
    test: {
      provider: TestRPC.provider(), // in-memory TestRPC provider
      network_id: "*" // Match any network id
    },
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      network_id: 4,
      host: '127.0.0.1',
      port: 8545,
    },
    live: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "1", // Only mainnet
      gasPrice: "10000000000", // 10 gwei
      gas: "5000000", // 0.02 eth at 4 gwei price
    },
  }
};
