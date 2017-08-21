<style lang="scss">
</style>

<template>
  <div id="adPublish">
    <h2>Publish to slot</h2>

    <select v-model="selected">
      <option disabled value="">Select ad slot</option>
      <option v-for="ad of $store.state.ownedAds" :value="ad.idx">
        {{ad.width}}x{{ad.height}} at ({{ad.x}}, {{ad.y}}): {{ ad.link || "(no link)" }}
      </option>
    </select>
    <p v-if="$store.state.numOwned == 0">
      No purchased ads detected for active accounts. Listening to Purchase events on the blockchain...
    </p>

    TODO: Add publish form here.
  </div>
</template>

<script>
export default {
  props: ["web3", "contract"],
  data() {
    return {
      selected: '',
    }
  },
}
</script>
