<style lang="scss">
section {
  margin-bottom: 2em;
}
</style>

<template>
  <div class="container">
    <LazyAdList v-if="$store.state.vis == 'list'" />
    <LazyAdSVG v-else-if="$store.state.vis == 'svg'"/>
    <AdGrid v-else :provider="provider" :contract="contract" :showNSFW="showNSFW" :isReadOnly="isReadOnly" :prerendered="prerendered" />
    <Editor :provider="provider" :contract="contract" :ketherNFT="ketherNFT" :ketherPublisher="ketherPublisher" :showNSFW="showNSFW" />
  </div>
</template>

<script>
import AdGrid from './AdGrid.vue'
import AdList from './AdList.vue'
import Offline from './Offline.vue'

export default {
  props: ["provider", "contract", "ketherNFT", "ketherPublisher", "isReadOnly", "showNSFW", "prerendered"],
  components: {
    Offline,
    AdGrid,
    AdList,
  },
}
</script>
