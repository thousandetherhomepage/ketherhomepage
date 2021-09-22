<template>
  <div id="app" class="container">
    <Header>
      <BuyButton :x="20" :y="20" />
    </Header>
    <Homepage
      :provider="provider"
      :contract="contract"
      :ketherNFT="ketherNFT"
      :isReadOnly="isReadOnly"
      :showNSFW="showNSFW"
      :prerendered="prerendered"
      />
    <BuyButton :x="20" :y="940" />

    <LazyConnectWallet v-if="walletConnect" :networkConfig="networkConfig" @wallet-connect="connectEthereum" @wallet-disconnect="walletConnect = false"/>
    <button type="button" @click="walletConnect = true" v-if="!$store.state.activeAccount">
      {{walletConnect ? "Loading..." : "Connect Wallet" }}
    </button>
    <div v-else>
      Active Account: <strong>{{$store.state.activeAccount}}</strong>
    </div>


    <div class="info">
      <p>✅ Loaded {{$store.getters.numAds}} ads ({{$store.getters.numWrapped}} are wrapped as NFTs!) as of block {{$store.state.loadedBlockNumber}} ({{timeSinceLoaded}})</p>

      <p>
        Ads displayed above are loaded directly from the Ethereum Blockchain.
        This Decentralized Application (<a
          href="https://ethereum.stackexchange.com/questions/383/what-is-a-dapp"
          >DApp</a
        >) does not have a traditional backend. No MVC framework, no SQL
        database. It's just a JavaScript application served statically from
        Github which speaks to the Ethereum blockchain using
        <a href="https://github.com/ethereum/web3.js/">Web3.js</a>. Pretty cool,
        right?
      </p>
      <p>
        Want to see it in action?
        <a href="https://gfycat.com/BleakSimilarGermanspaniel">Here's a GIF!</a>
      </p>
    </div>
    <a v-if="$store.state.offlineMode"
      href="javascript:window.location.reload()"
      id="offline-mode"
      title="Reload page to reconnect.">Offline</a>
    <Footer>
      <ul>
        <li><h3>Blockchain</h3></li>
        <li>
          <Dropdown
            :options="availableNetworks"
            :default="activeNetwork"
            @selected="setReadOnlyNetwork"
            :disabled="!isReadOnly"
            invalidName="Unsupported Network"
          ></Dropdown>
          <span v-if="!networkConfig">
            Contract is only on MainNet and Rinkeby.
          </span>
        </li>
        <li v-if="networkConfig">
          <a :href="networkConfig.etherscanLink" target="_blank">
            Contract on Etherscan
          </a>
        </li>
        <li>
          <a v-if="$store.state.gridVis" v-on:click="$store.commit('setVis', 'list')">List View</a>
          <a v-else v-on:click="$store.commit('setVis', 'grid')">Grid View</a>
        </li>
        <li v-if="$store.state.numNSFW > 0">
          <a v-if="!showNSFW" v-on:click="showNSFW = true"
            >Show NSFW ({{ $store.state.numNSFW }})</a
          >
          <a v-else v-on:click="showNSFW = false">Hide NSFW</a>
        </li>
        <li><a href="https://v1.thousandetherhomepage.com">Switch to v1 (2017)</a></li>
      </ul>
    </Footer>
  </div>
</template>

<script>
import { ethers } from "ethers";

import { defaultNetwork, deployConfig, loadContracts } from '~/networkConfig';

import Dropdown from "./Dropdown.vue";
import Homepage from "./Homepage.vue";

export default {
  name: "app",
  data() {
    return {
      availableNetworks: deployConfig,
      activeNetwork: null,
      networkConfig: {},
      selecting: false,
      provider: null,
      contract: null,
      ketherNFT: null,
      isReadOnly: false,
      showNSFW: false,
      prerendered: null,
      walletConnect: false,
    };
  },
  computed: {
    timeSinceLoaded() {
      const ts = this.$store.state.loadedBlockTimestamp;
      if (ts === undefined) {
        return 'cached';
      }
      const now = Math.floor(Date.now()/1000);
      return `${now - ts} seconds ago`;
    }
  },
  methods: {
    async connectEthereum(web3Provider) {
      // We load the ads in nuxtServerInit on the server
      if (process.server) return;

      if (!web3Provider) {
        // Using MetaMask or equivalent
        web3Provider = window.ethereum;
      }
      if (!web3Provider) {
        // Use an HTTP proxy
        await this.setReadOnlyNetwork(defaultNetwork);
        return;
      }

      this.provider = new ethers.providers.Web3Provider(web3Provider, "any");
      this.activeNetwork = (await this.provider.getNetwork()).name;
      this.networkConfig = deployConfig[this.activeNetwork];
      if (this.networkConfig) {
        const {contract, ketherNFT, ketherView} = loadContracts(this.networkConfig, this.provider)
        await this.setContracts(this.activeNetwork, contract, ketherNFT, ketherView);
        this.listenContractEvents(contract, ketherNFT);
        this.isReadOnly = false;

        // Find half-wrapped ads
        this.$store.dispatch('detectHalfWrapped', { ketherContract: contract, nftContract: ketherNFT });
      }

      // When the network changes, refresh the page.
        // see https://docs.ethers.io/v5/concepts/best-practices/#best-practices
      this.provider.on("network", (_, oldNetwork) => {
        // When a Provider makes its initial connection, it emits a "network"
        // event with a null oldNetwork along with the newNetwork. So, if the
        // oldNetwork exists, it represents a changing network
        if (oldNetwork) {
          window.location.reload();
        }
      });
    },
    async setReadOnlyNetwork(network) {
      const web3Fallback = deployConfig[network].web3Fallback || "http://localhost:8545/";
      this.provider = new ethers.providers.StaticJsonRpcProvider(web3Fallback);
      this.activeNetwork = (await this.provider.getNetwork()).name;
      this.networkConfig = deployConfig[this.activeNetwork];

      const {contract, ketherNFT, ketherView} = loadContracts(this.networkConfig, this.provider)
      await this.setContracts(this.activeNetwork, contract, ketherNFT, ketherView);
      this.isReadOnly = true;
    },
    async setContracts(activeNetwork, contract, ketherNFT, ketherView) {
      // Load the initial state on network change
      await this.$store.dispatch('initState', activeNetwork);
      if (this.contract) {
        this.contract.removeAllListeners();
      }
      if (this.ketherNFT) {
        this.ketherNFT.removeAllListeners();
      }
      this.contract = contract;
      this.ketherNFT = ketherNFT;
      this.contract.on('error', function(err) {
        console.error("Contract subscription error:", err);
      });
      this.$store.dispatch('loadAds', {contract, ketherNFT, ketherView});
    },
    listenContractEvents(contract, ketherNFT) {
      // These listeners will long-poll the provider every block, so probably
      // only makes sense to set them up if a wallet is connected.

      console.log("Subscribing to events");

      contract.on('Buy', function(...args) {
        // event is passed as last arg
        const event = args[args.length - 1];
        this.$store.dispatch('processBuyEvents', [event])
      }.bind(this));

      contract.on('Publish', function(...args) {
        const event = args[args.length - 1];
        this.$store.dispatch('processPublishEvents', [event]);
      }.bind(this));

      contract.on('SetAdOwner', function(...args) {
        const event = args[args.length - 1];
        this.$store.dispatch('processSetAdOwnerEvents', [event]);
      }.bind(this));

      ketherNFT.on('Transfer', function(...args) {
        const event = args[args.length - 1];
        this.$store.dispatch('processTransferEvents', [event]);
      }.bind(this));
    },
  },
  async created() {
    await this.connectEthereum();
  },

  components: {
    Homepage: Homepage,
    Dropdown: Dropdown,
  },
};
</script>

<style lang="scss">
#offline-mode {
  position: absolute;
  top: 0;
  right: 0;
  display: block;
  background: rgba(200, 50, 50, 0.8);
  color: rgba(255, 255, 255, 1.0);
  font-weight: bold;
  padding: 0.5em 1em;
  border-bottom-left-radius: 1em;
}
header {
  h2 {
    display: inline-block;
  }
}
</style>
