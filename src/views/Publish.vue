<style lang="scss">
</style>

<template>
  <div id="adPublish">
    <h2>Publish to slot</h2>

    <select v-model="selected">
      <option disabled value="">Please select one</option>
      <option v-for="ad of ownedAds">
        {{ad}}
      </option>
    </select>

    {{ownedAds}}
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
