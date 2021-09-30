<style lang="scss">

#missingAd {
  width: 700px;
  border-left: 10px solid #eee;
  padding-left: 10px;

  li {
    margin-bottom: 0.5em;
  }

  code {
    background: #24664833;
    padding: 2px 5px;
  }
}
</style>

<template>
  <div id="missingAd">
    <h3>Is your ad missing? A checklist</h3>
    <ol>
      <li>Are you connected with the correct wallet address? Connected wallet: <code>{{$store.state.activeAccount}}</code></li>
      <li>Is your ad rented out on another contract? If your connected wallet is not holding the ownership of the ad then it won't show up here. You need to un-rent it to be able to make changes to it.</li>
      <li>Was your ad half-wrapped a long time ago? Opening this view loads more half-wrapped ads from the event history, check the dropdown again. <code>Number of half-wrapped ads found: {{$store.getters.numHalfWrapped}}</code></li>
    </ol>
  </div>
</template>

<script>

export default {
  props: ["provider", "contract", "ketherNFT"],
  mounted() {
    this.$store.dispatch('detectHalfWrapped', { ketherContract: this.contract, nftContract: this.ketherNFT, numBlocks: "all" });
  },
}
</script>
