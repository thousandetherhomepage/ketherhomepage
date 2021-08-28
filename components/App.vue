<template>
  <div id="app" class="container">
    <Header>
      <BuyButton :x="20" :y="20" />
    </Header>
    <Homepage
      :provider="provider"
      :contract="contract"
      :isReadOnly="isReadOnly"
      :showNSFW="showNSFW"
      :prerendered="prerendered"
    ></Homepage>
    <BuyButton :x="20" :y="940" />
    
    <LazyConnectWallet v-if="walletConnect" :networkConfig="networkConfig" @wallet-connect="connectEthereum" @wallet-disconnect="walletConnect = false"/>
    <button @click="walletConnect = true" v-if="!$store.state.activeAccount">
      {{walletConnect ? "Loading..." : "Connect Wallet" }}
    </button>
    <div v-else>Active Account: <strong>{{$store.state.activeAccount}}</strong></div>

    <div class="info">
      <p>✅ Loaded {{$store.state.ads.length}} ads as of block {{$store.state.loadedBlockNumber}} ({{timeSinceLoaded}})</p>

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

import { defaultNetwork, deployConfig } from '~/networkConfig';
import contractJSON from "~/artifacts/contracts/KetherHomepage.sol/KetherHomepage.json";

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
        const contract = new ethers.Contract(this.networkConfig.contractAddr, contractJSON.abi, this.provider);
        this.setContract(contract);
        this.listenContractEvents(contract);
        this.isReadOnly = false;
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
      this.provider = new ethers.providers.JsonRpcProvider(web3Fallback);
      this.activeNetwork = (await this.provider.getNetwork()).name;
      this.networkConfig = deployConfig[this.activeNetwork];
      const contract = new ethers.Contract(this.networkConfig.contractAddr, contractJSON.abi, this.provider);
      this.setContract(contract);
      this.isReadOnly = true;
    },
    async setContract(contract) {
      if (this.activeNetwork == 'homestead') {
        await this.$store.dispatch('initState');
      }
      if (this.contract) {
        this.contract.removeAllListeners();
      }
      this.contract = contract;
      this.contract.on('error', function(err) {
        console.error("Contract subscription error:", err);
      });

      await this.$store.dispatch('loadAds', contract);
    },
    listenContractEvents(contract) {
      // These listeners will long-poll the provider every block, so probably
      // only makes sense to set them up if a wallet is connected.
      console.log("Subscribing to Buy and Publish events");

      contract.on('Buy', function(idx, owner, x, y, width, height) {
        this.$store.commit('addAd', {idx: idx.toNumber(), owner, x, y, width, height});

        const previewAd = this.$store.state.previewAd;
        if (this.previewLocked && Number(x*10) == previewAd.x && Number(y*10) == previewAd.y) {
          // Colliding ad purchased
          this.previewLocked = false;
          this.$store.commit('clearPreview');
        }

        console.log("Buy event processed.");
      }.bind(this));

      contract.on('Publish', function(idx, link, image, title, NSFW) {
        this.$store.commit('addAd', {idx: idx.toNumber(), link, image, title, NSFW});
        console.log("Publish event processed.");
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
