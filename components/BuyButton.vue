<template>
  <div class="sold">
    {{$store.state.adsPixels}} pixels sold
    <a target="_blank" href="https://opensea.io/collection/thousand-ether-homepage" v-if="this.$store.getters.isSoldOut" disabled>Available on OpenSea</a>
    <button type="button" v-on:click="$store.commit('updatePreview', {x, y})" v-else-if="!$store.state.previewAd">Buy Pixels</button>
  </div>
</template>

<style lang="scss">
.sold {
  display: inline-block;
  margin-left: 5px;
  padding: 8px 10px;
  border-radius: 3px;
  background: #4A90E2;
  color: white;
  font-weight: bold;

  button {
    margin-left: 5px;
  }

  a {
    background: rgba(255,255,255);
    border: 1px solid rgba(255,255,255,0.5);
    padding: 2px 0.5em;
    border-radius: 3px;
    margin-left: 0.5em;
  }
}
</style>

<script>
export default {
  props: ["x", "y"],
}
</script>
