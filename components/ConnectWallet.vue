<template></template>

<style lang="scss">
.connect-wallet {
  display: inline-block;
  padding: 5px 10px;
}
</style>

<script>
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
      if (window.ethereum !== undefined) {
        // FIXME: Old flow, for some reason our current WalletConnect v2 setup doesn't detect it so we do it manually
        const accounts = await this.requestAccounts();
        if (accounts && accounts.length > 0) {
          for (const account of accounts) {
            this.$store.dispatch("addAccount", account);
          }

          this.$emit("wallet-connect", window.ethereum);
          return;
        }
      }

      const infuraId =  this.networkConfig.web3Fallback.split("/").pop();
      const provider = await EthereumProvider.init({
        projectId: 'c2b10083c2b1bda11734bd4f48101899', // required
        showQrModal: true,
        infuraId: infuraId,
        qrModalOptions: { themeMode: "light" },
        chains: [1],
        optionalChains: [11155111], // Sepolia
        metadata: {
          name: "ThousandEtherHomepage",
          description: "On-chain 1,621 ads on a 1000x1000 pixel canvas",
          url: "https://thousandetherhomepage.com",
          icons: ["https://thousandetherhomepage.com/teh-128px.png"],
        },
      });

      // 6. Set up connection listener
      provider.on("connect", () => {
        console.log("Loaded accounts:", provider.accounts);

        for (const account of provider.accounts) {
          this.$store.dispatch("addAccount", account);
        }

        this.$emit("wallet-connect", provider);
      });
      provider.on('disconnect', () => {
        this.$emit("wallet-disconnect");
      })

      try {
        provider.connect();
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
