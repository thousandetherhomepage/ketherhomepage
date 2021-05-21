<template>
  <div class="unlock-wallet">
    <button @click="unlock" v-if="!$store.state.activeAccount">Unlock Wallet</button>
    <span v-else>Active Account: <strong>{{$store.state.activeAccount}}</strong></span>
  </div>
</template>

<style lang="scss">
.unlock-wallet {
  display: inline-block;
  padding: 5px 10px;
}
</style>

<script>
export default {
  methods: {
    async requestAccounts() {
      if (window.ethereum === undefined) return [];

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
    async unlock() {
      const accounts = await this.requestAccounts();
      for (const account of accounts) {
        this.$store.commit('addAccount', account);
      }
      console.log("Loaded accounts:", accounts);
    },
  }
}
</script>
