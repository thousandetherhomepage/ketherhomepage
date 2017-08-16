<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{status}}</p>
  </div>
</template>

<script>
import contractJSON from 'json-loader!../../build/contracts/KetherHomepage.json'

const contractAddr = '0x47b20b71d0e4039a85e1d67e48af138cf4b05fea'

export default {
  props: ["web3"],
  data() {
    return {
      status: "connecting..."
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
  },
  created() {
    this.web3.eth.getAccounts(function(err, res) {
      this.status = res;
    }.bind(this));
  }
}
</script>
