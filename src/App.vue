<template>
  <div id="app">
    <router-view :web3="web3" :contract="contract" :isReadOnly="isReadOnly" :showNSFW="showNSFW">
    </router-view>

    <footer>
      <ul>
        <li><h3>Authors</h3></li>
        <li><a href="https://keybase.io/shazow">shazow</a></li>
        <li><a href="https://keybase.io/mveytsman">mveytsman</a></li>
      </ul>
      <ul>
        <li><h3>Project</h3></li>
        <li><a href="https://github.com/thousandetherhomepage">Source code</a></li>
      </ul>
      <ul>
        <li><h3>Blockchain</h3></li>
        <li>
          <Dropdown :options="availableNetworks" :default="network" @selected="setNetwork" :disabled="!isReadOnly" invalidName="Unsupported Network"></Dropdown>
          <span v-if="!networkConfig.etherscanLink">
            Contract is only on MainNet and Rinkeby.
          </span>
        </li>
        <li v-if="networkConfig.etherscanLink">
          <a :href="networkConfig.etherscanLink" target="_blank">
            Contract on Etherscan
          </a>
        </li>
        <li v-if="$store.state.numNSFW > 0">
          <a v-if="!showNSFW" v-on:click="showNSFW = true">Show NSFW ({{$store.state.numNSFW}})</a>
          <a v-else v-on:click="showNSFW = false">Hide NSFW</a>
        </li>

      </ul>
    </footer>

  </div>
</template>

<script>
import Web3 from 'web3'
import contractJSON from 'json-loader!../build/contracts/KetherHomepage.json'

const deployConfig = {
  "rinkeby": {
    id: 4,
    label: 'TestNet (Rinkeby)',
    contractAddr: '0xb88404dd8fe4969ef67841250baef7f04f6b1a5e',
    web3Fallback: 'https://rinkeby.infura.io/VZCd1IVOZ1gcPsrc9gd7',
    etherscanLink: 'https://rinkeby.etherscan.io/address/0xb88404dd8fe4969ef67841250baef7f04f6b1a5e',
  },
  "mainnet": {
    id: 1,
    label: 'MainNet',
    contractAddr: '0xb5fe93ccfec708145d6278b0c71ce60aa75ef925',
    web3Fallback: 'https://mainnet.infura.io/VZCd1IVOZ1gcPsrc9gd7',
    etherscanLink: 'https://etherscan.io/address/0xb5fe93ccfec708145d6278b0c71ce60aa75ef925',
  }
}
const web3Networks = [
  undefined, 'mainnet', undefined, undefined, 'rinkeby',
];

const defaultNetwork = 'mainnet';

import Dropdown from './Dropdown.vue'

function waitForWeb3(options, cb) {
  const web3Fallback = options.web3Fallback || "http://localhost:8545/";

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
  function startWaiting() {
    const interval = setInterval(function() {
      let r = getWeb3()
      if (r) {
        clearInterval(interval)
        cb(r);
      }
    }, 500);
  }
  if (window.web3Loading === true) {
    // Can't do on window load too late.
    startWaiting();
    return;
  }
  window.addEventListener('load', function() {
    window.web3Loading = true;
    startWaiting();
  });
}

export default {
  name: 'app',
  data() {
    return {
      'availableNetworks': deployConfig,
      'network': null,
      'networkConfig': {},
      'selecting': false,
      'web3': null,
      'contract': null,
      'isReadOnly': false,
      'showNSFW': false,
    }
  },
  methods: {
    setNetwork(network) {
      if (this.network === network) return;

      const cfg = deployConfig[network] || deployConfig[defaultNetwork];
      waitForWeb3(cfg, function(web3) {
        // VueJS tries to inspect/walk/observe objects unless they're frozen. This breaks web3.
        this.web3 = Object.freeze(web3);

        this.web3.version.getNetwork(function(error, networkVersion) {
          if (error) throw error;

          if (network === undefined) {
            network = web3Networks[networkVersion];
          }

          const providerHost = this.web3.currentProvider.host
          this.isReadOnly = providerHost && providerHost.indexOf('infura.io') !== -1;
          if (network === undefined) {
            this.isReadOnly = false;
            return;
          }

          // Load contract data
          const options = deployConfig[network];
          this.networkConfig = options;
          const contract = this.web3.eth.contract(contractJSON.abi);
          this.contract = Object.freeze(contract.at(options.contractAddr));

          console.log("changing route", network)
          this.$router.push({ name: 'homepage', query: { network }})
        }.bind(this))
      }.bind(this));
    },
  },
  created() {
    this.setNetwork();
  },
  components: {
    'Dropdown': Dropdown,
  },
}
</script>

<style lang="scss">
</style>
