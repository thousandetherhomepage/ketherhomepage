<template>
  <div class="connect-wallet">
    <button @click="connect" v-if="!$store.state.activeAccount">Connect Wallet</button>
    <span v-else>Active Account: <strong>{{$store.state.activeAccount}}</strong></span>
  </div>
</template>

<style lang="scss">
.connect-wallet {
  display: inline-block;
  padding: 5px 10px;
}
</style>

<script>
import { ethers } from "ethers";

import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider"

export default {
  props: ["networkConfig"],
  methods: {
    async requestAccounts() {
      if (process.server || window.ethereum === undefined) return [];

      if (window.ethereum.request === undefined) {
        return await window.ethereum.enable();
      }

      try {
        return await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        if (error.code === 4001) {
          // User rejected request
          return;
        }
        console.error(error);
      }
    },
    async connect() {
      const web3Modal = new Web3Modal({
        providerOptions: {
          walletconnect: {
            package: WalletConnectProvider,
            options: {
              infuraId: this.networkConfig.web3Fallback.split('/').pop()
            }
          }
        },
      });
      let web3Provider = await web3Modal.connect();

      const provider = new ethers.providers.Web3Provider(web3Provider);
      const accounts = await provider.listAccounts();

      for (const account of accounts) {
        this.$store.dispatch('addAccount', account);
      }
      console.log("Loaded accounts:", accounts);

      this.$emit('wallet-connect', web3Provider);
    },
  }
}
</script>
