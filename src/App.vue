<template>
  <div id="app">
    <h1>Kether Homepage</h1>
    <h2>1,000,000 pixels &middot; 0.001 ETH per pixel &middot; Own a piece of blockchain history!</h2>

    <Homepage v-if="ready" :web3="web3" :contract="contract"></Homepage>
    <p v-else>
      Connecting to Web3...
    </p>
  </div>
</template>

<script>
import Web3 from 'web3'
import contractJSON from 'json-loader!../build/contracts/KetherHomepage.json'

const contractAddr = '0xffb81a3a20e7fc1d44c3222a2b7a6d5705a7064b'
const web3Fallback = 'https://rinkeby.infura.io/VZCd1IVOZ1gcPsrc9gd7'

import Homepage from './Homepage.vue'

function waitForWeb3(cb) {
  function getWeb3() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      web3 = new Web3(web3.currentProvider);
    } else {
      web3 = new Web3(new Web3.providers.HttpProvider(web3Fallback));
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
      'ready': false,
    }
  },
  created() {
    waitForWeb3(function(web3) {
      // VueJS tries to inspect/walk/observe objects unless they're frozen. This breaks web3.
      this.web3 = Object.freeze(web3);

      // Load contract data
      const contract = this.web3.eth.contract(contractJSON.abi);
      this.contract = Object.freeze(contract.at(contractAddr));
      this.ready = true;
    }.bind(this));
  },
  components: {
    'Homepage': Homepage,
  }
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

h1 {
  font-size: 1.6rem;
  font-weight: normal;
  margin: 0.1em 0 0.5em 0;
}

h2 {
  color: #556;
  font-size: 1.1rem;
  font-weight: normal;
  margin: 0.1em 0 0.5em 0;
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

a.router-link-exact-active {
  color: #aaa;
  text-decoration: none;
}
</style>
