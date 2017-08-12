<template>
  <div id="app">
    <h1>Kether Homepage</h1>

    <router-view :web3="web3" class="view"></router-view>
  </div>
</template>

<script>
import Web3 from 'web3'
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
        console.log("ready", r.currentProvider.isConnected());
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
    }
  },
  created() {
    this.$router.push({ name: 'connecting' })
    waitForWeb3(function(web3) {
      this.web3 = web3;
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
