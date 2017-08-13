<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{status}}</p>
  </div>
</template>

<script>
import contractJSON from 'json-loader!../../build/contracts/KetherHomepage.json'

const contractAddr = '0x2b97c190581935243698bfe1064fa2f3cef7af1b'

export default {
  data() {
    return {
      status: web3.eth.accounts[0],
    }
  },
  methods: {
    getContract() {
      const contract = web3.eth.contract(contractJSON.abi);
      return contract.at(contractAddr);
    },
    getTiles(contract, cb) {
      // TODO: ...
      // contract.getAdsLength.call(function(err, res) {
      //   // loop and aggregate...
      //   contract.getAd.call(0, funcion(err, res) {
      //     ...
      //   }
      // }
    },
  }
}
</script>
