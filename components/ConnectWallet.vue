<template></template>

<style lang="scss">
.connect-wallet {
  display: inline-block;
  padding: 5px 10px;
}
</style>

<script>
import { ethers } from "ethers";

import { EthereumProvider } from '@walletconnect/ethereum-provider';

export default {
  props: ["networkConfig"],
  methods: {
    async requestAccounts() {
      // Deprecated flow
      if (process.server || window.ethereum === undefined) return [];

      if (window.ethereum.request === undefined) {
        return await window.ethereum.enable();
      }

      try {
        return await window.ethereum.request({ method: "eth_requestAccounts" });
      } catch (error) {
        if (error.code === 4001) {
          // User rejected request
          return;
        }
        console.error(error);
      }
    },
    async connect() {
      const infuraId =  this.networkConfig.web3Fallback.split("/").pop();
      const ethereumProvider = await EthereumProvider.init({
        projectId: 'ketherhomepage', // required
        showQrModal: true,
        infuraId: infuraId,
        qrModalOptions: { themeMode: "light" },
        chains: [1],
        methods: ["eth_sendTransaction"],
        events: ["chainChanged", "accountsChanged"],
        metadata: {
          name: "ThousandEtherHomepage",
          description: "On-chain 1,621 ads on a 1000x1000 pixel canvas",
          url: "https://thousandetherhomepage.com",
          icons: ["https://thousandetherhomepage.com/teh-128px.png"],
        },
      });

      // 6. Set up connection listener
      ethereumProvider.on("connect", () => {
        console.log("Loaded accounts:", ethereu,Provider.accounts);

        for (const account of ethereumProvider.accounts) {
          this.$store.dispatch("addAccount", account);
        }

        this.$emit("wallet-connect", ethereumProvider);
      });

      try {
        ethereumProvider.connect();
      } catch(err) {
        console.error("WalletConnect failed", err);
        this.$emit("wallet-disconnect");
        return;
      }
    },
  },
  async fetch() {
    await this.connect();
  },
};
</script>
