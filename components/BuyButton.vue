<template>
  <div class="sold">
    {{$store.state.adsPixels}} pixels sold <button v-on:click="$store.commit('updatePreview', {x: 20, y: 920})" v-if="!$store.state.previewAd">Buy Pixels</button>
  </div>
</template>

<style lang="scss">
.sold {
  display: inline-block;
  margin-left: 5px;
  padding: 5px 10px;
  border-radius: 3px;
  background: #4A90E2;
  color: white;
  font-weight: bold;

    button {
      margin-left: 5px;
    }
  }
</style>