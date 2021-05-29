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
export default {
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
      const accounts = await this.requestAccounts();
      if (!accounts) {
        console.log("Failed to connect wallet");
        return;
      }
      for (const account of accounts) {
        this.$store.commit('addAccount', account);
      }
      console.log("Loaded accounts:", accounts);
    },
  }
}
</script>
