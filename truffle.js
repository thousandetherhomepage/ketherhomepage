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
      gasCost: 20,
    }
  }
};
