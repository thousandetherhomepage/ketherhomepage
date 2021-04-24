<template>
  <div id="app" class="container">
  <Header>
    <BuyButton v-if="ready"/>
  </Header>
    <template v-if="ready">
      <Homepage v-if="ready" :web3="web3" :contract="contract" :isReadOnly="isReadOnly" :showNSFW="showNSFW" :prerendered="prerendered"></Homepage>
    </template>
    <template v-else>
      <div class="adGrid">
        <p style="text-align: center; padding: 2em; color: #666;">
          Waiting for Web3... (Must be on MainNet or Rinkeby)
        </p>
      </div>
    </template>
    <BuyButton v-if="ready"/>
    <div class="info">
      <p>
        Ads displayed above are loaded directly from the Ethereum Blockchain. This Decentralized Application (<a href="https://ethereum.stackexchange.com/questions/383/what-is-a-dapp">DApp</a>) does not have a traditional backend. No MVC framework, no SQL database. It's just a JavaScript application served statically from Github which speaks to the Ethereum blockchain using <a href="https://github.com/ethereum/web3.js/">Web3.js</a>. Pretty cool, right?
      </p>
      <p>
        Want to see it in action? <a href="https://gfycat.com/BleakSimilarGermanspaniel">Here's a GIF!</a>
      </p>
    </div>
    <Footer>
      <ul>
        <li><h3>Blockchain</h3></li>
        <li>
          <Dropdown :options="availableNetworks" :default="activeNetwork" @selected="setNetwork" :disabled="!isReadOnly" invalidName="Unsupported Network"></Dropdown>
          <span v-if="!networkConfig.etherscanLink">
            Contract is only on MainNet and Rinkeby.
          </span>
        </li>
        <li v-if="networkConfig.etherscanLink">
          <a :href="networkConfig.etherscanLink" target="_blank">
            Contract on Etherscan
          </a>
        </li>
        <li>
          <a v-if="$store.state.gridVis" v-on:click="$store.commit('setVis', 'list')">List View</a>
          <a v-else v-on:click="$store.commit('setVis', 'grid')">Grid View</a>
        </li>
        <li v-if="$store.state.numNSFW > 0">
          <a v-if="!showNSFW" v-on:click="showNSFW = true">Show NSFW ({{$store.state.numNSFW}})</a>
          <a v-else v-on:click="showNSFW = false">Hide NSFW</a>
        </li>
      </ul>
      </Footer>
  </div>
</template>

<script>
import Web3 from 'web3'
import contractJSON from '../build/contracts/KetherHomepage.json'

const deployConfig = {
  "rinkeby": {
    contractAddr: '0xb88404dd8fe4969ef67841250baef7f04f6b1a5e',
    web3Fallback: 'https://rinkeby.infura.io/v3/fa9f29a052924745babfc1d119465148',
    etherscanLink: 'https://rinkeby.etherscan.io/address/0xb88404dd8fe4969ef67841250baef7f04f6b1a5e',
    prerendered: {
      image: 'https://storage.googleapis.com/storage.thousandetherhomepage.com/rinkeby.png',
      data: 'https://storage.thousandetherhomepage.com/rinkeby.json',
      loadRemoteImages: true,
      loadFromWeb3: true,
    },
  },
  "main": {
    contractAddr: '0xb5fe93ccfec708145d6278b0c71ce60aa75ef925',
    web3Fallback: 'https://mainnet.infura.io/v3/fa9f29a052924745babfc1d119465148',
    etherscanLink: 'https://etherscan.io/address/0xb5fe93ccfec708145d6278b0c71ce60aa75ef925',
    prerendered: {
      image: 'https://storage.googleapis.com/storage.thousandetherhomepage.com/mainnet.png',
      data: 'https://storage.thousandetherhomepage.com/mainnet.json',
      loadRemoteImages: true,
      loadFromWeb3: true,
    },
  }
}
const defaultNetwork = 'main';

import Dropdown from './Dropdown.vue'
import Homepage from './Homepage.vue'

function waitForWeb3(options, cb) {


  const web3Fallback = options.web3Fallback || "http://localhost:8545/";

  function getWeb3() {
    window.Web3 = Web3;
    let web3 = window.ethereum;
    if (typeof web3 !== 'undefined') {
      // we're using a wallet browser
      window.ethereum.enable()
      web3 = new Web3(window.ethereum)
    } else {
      // we're using a fallback
      //web3 = new Web3(Web3.givenProvider || web3Fallback);
      web3 = new Web3(new Web3.providers.HttpProvider(web3Fallback));
    }
    return web3;
    /*
    try {
      if (web3.currentProvider.connected) return web3;
    } catch (_) {
      return null;
    }
    */
  }
  function startWaiting() {
    const interval = setInterval(function() {
      let r = getWeb3()
      if (r) {
        clearInterval(interval)
        cb(r);
      }
    }, 1000);
  }
  if (window.web3Loading === true) {
    // Can't do on window load too late.
    return;
  }
 window.addEventListener('load', function() {
    debugger;
    window.web3Loading = true;
    startWaiting();
 });
}

export default {
  name: 'app',
  data() {
    return {
      'availableNetworks': deployConfig,
      'activeNetwork': null,
      'networkConfig': {},
      'selecting': false,
      'web3': null,
      'contract': null,
      'ready': false,
      'isReadOnly': false,
      'showNSFW': false,
      'prerendered': null,
    }
  },
  methods: {
    setNetwork(network) {
      if (this.activeNetwork === network) return;
      this.activeNetwork = network;
      this.ready = false;
      waitForWeb3(deployConfig[network || defaultNetwork], function(web3) {
        // VueJS tries to inspect/walk/observe objects unless they're frozen. This breaks web3.
        this.web3 = Object.freeze(web3);

        this.web3.eth.net.getNetworkType(function(error, networkVersion) {
          if (error) throw error;

          if (this.activeNetwork === undefined) {
            this.activeNetwork = networkVersion;
          }

          const providerHost = this.web3.currentProvider.host
          this.isReadOnly = providerHost && providerHost.indexOf('infura.io') !== -1;
          if (this.activeNetwork === undefined) {
            this.isReadOnly = false;
            return;
          }

          // Load contract data
          const options = deployConfig[this.activeNetwork];
          this.networkConfig = options;
          const contractAt = new this.web3.eth.Contract(contractJSON.abi, options.contractAddr);
          contractAt._network = this.activeNetwork;
          this.contract = Object.freeze(contractAt);
          this.ready = true;
          this.prerendered = options.prerendered;

          if (web3.currentProvider.isMetaMask) {
            // Poll for network changes, because MetaMask no longer reloads
            const app = this;
            const interval = setInterval(function() {
              web3.eth.net.getNetworkType(function(error, newNetworkVersion) {
                if (error || newNetworkVersion !== networkVersion) {
                  clearInterval(interval)
                  app.setNetwork();
                }
              }.bind(this));
            }, 2000);
          }
        }.bind(this))
      }.bind(this));
    },
  },
  created() {
    this.setNetwork();
  },
  components: {
    'Homepage': Homepage,
    'Dropdown': Dropdown,
  }
}
</script>

<style lang="scss">
header {
  h2 {
    display: inline-block;
  }
}
</style>
