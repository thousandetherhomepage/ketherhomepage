<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{status}}</p>
  </div>
</template>

<script>
import abi from 'json-loader!../../build/contracts/KetherHomepage.json'

const contractAddr = '0x2b97c190581935243698bfe1064fa2f3cef7af1b'

export default {
  props: ['web3'],
  data() {
    return {
      status: web3.eth.accounts[0],
    }
  },
  methods: {
    getContract() {
      const contract = this.web3.eth.contract(abi);
      return contract.at(contractAddr);
    },
  }
}
</script>
