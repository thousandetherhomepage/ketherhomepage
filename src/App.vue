<template>
  <div id="app">
    <h1>Kether Homepage</h1>

    <router-view :web3="web3" :contract="contract" class="view"></router-view>
  </div>
</template>

<script>
import Web3 from 'web3'

import contractJSON from 'json-loader!../build/contracts/KetherHomepage.json'

const contractAddr = '0x47b20b71d0e4039a85e1d67e48af138cf4b05fea'

function waitForWeb3(cb) {
  function getWeb3() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      web3 = new Web3(web3.currentProvider);
    } else {
      web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    try {
      if (web3.currentProvider.isConnected()) return web3;
    } catch (_) {
      return null;
    }
  }
  window.addEventListener('load', function() {
    const interval = setInterval(function() {
      let r = getWeb3()
      if (r) {
        clearInterval(interval)
        cb(r);
      }
    }, 500);
  });
}

export default {
  name: 'app',
  data() {
    return {
      'web3': null,
      'contract': null,
    }
  },
  created() {
    this.$router.push({ name: 'connecting' })
    waitForWeb3(function(web3) {
      // VueJS tries to inspect/walk/observe objects unless they're frozen. This breaks web3.
      this.web3 = Object.freeze(web3);

      // Load contract data
      const contract = this.web3.eth.contract(contractJSON.abi);
      this.contract = Object.freeze(contract.at(contractAddr));

      this.$router.push({ name: 'home', props: true})
    }.bind(this));
  },
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 1em;
}

h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
