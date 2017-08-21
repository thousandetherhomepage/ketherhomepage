<template>
  <div id="app">
    <h1>Kether Homepage</h1>

    <div id="nav">
      <router-link to="/">Home</router-link>
      <router-link to="/buy">Buy</router-link>
      <router-link to="/publish">Publish</router-link>
    </div>
    <router-view :web3="web3" :contract="contract" class="view"></router-view>

    <Homepage v-if="ready" :web3="web3" :contract="contract"></Homepage>
    <p v-else>
      Connecting to Web3...
    </p>
  </div>
</template>

<script>
import Web3 from 'web3'
import contractJSON from 'json-loader!../build/contracts/KetherHomepage.json'

const contractAddr = '0x47b20b71d0e4039a85e1d67e48af138cf4b05fea'

import Homepage from './views/Homepage.vue'

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

a.router-link-exact-active {
  color: #aaa;
  text-decoration: none;
}
</style>
