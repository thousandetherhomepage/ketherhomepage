<style lang="scss">
</style>

<template>
  <div id="adPublish">
    <h2>Publish to slot</h2>

    <select v-model="selected" v-if="Object.keys(ownedAds).length > 0">
      <option disabled value="">Select ad slot</option>
      <option v-for="ad of ownedAds" :value="ad.idx">
        {{ad.width}}x{{ad.height}} at ({{ad.x}}, {{ad.y}}): {{ ad.link || "(no link)" }}
      </option>
    </select>
    <p v-else>
      No purchased ads detected for active accounts. Listening to Purchase events on the blockchain...
    </p>

    TODO: Add publish form here.
  </div>
</template>

<script>
export default {
  props: ["web3", "contract", "account", "ownedAds"],
  data() {
    return {
      selected: '',
    }
  },
}
</script>
