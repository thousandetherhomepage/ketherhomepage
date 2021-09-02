<style lang="scss">
.edit {
  display: inline-block;
  margin-top: 1em;
  margin-left: 5px;
  padding: 5px 10px;
  border-radius: 3px;
  background: #246648;
  color: white;
  font-weight: bold;

  button {
    margin-left: 5px;
  }
}
</style>

<template>
  <div class="container">
    <AdGrid v-if="$store.state.gridVis" :provider="provider" :contract="contract" :showNSFW="showNSFW" :isReadOnly="isReadOnly" :prerendered="prerendered" />
    <LazyAdList v-else />

    <div class="edit" v-if="$store.getters.numOwned > 0">
      {{$store.getters.numOwned}} ads owned by you. ({{$store.getters.numOwnedWrapped}} are wrapped as NFTs)<button v-on:click="showPublish = true" v-if="!showPublish">Edit Ads</button>
    </div>
    <LazyPublish v-if="showPublish" :provider="provider" :contract="contract" :ketherNFT="ketherNFT" :showNSFW="showNSFW" />
  </div>
</template>

<script>
import AdGrid from './AdGrid.vue'
import AdList from './AdList.vue'
import Publish from './Publish.vue'
import Offline from './Offline.vue'

export default {
  props: ["provider", "contract", "ketherNFT", "isReadOnly", "showNSFW", "prerendered"],
  data() {
    return {
      showPublish: false,
    }
  },
  components: {
    Publish,
    Offline,
    AdGrid,
    AdList,
  },
}
</script>
