<style lang="scss">
.edit {
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

section {
  margin-bottom: 2em;
}
</style>

<template>
  <div class="container">
    <AdGrid v-if="$store.state.gridVis" :provider="provider" :contract="contract" :showNSFW="showNSFW" :isReadOnly="isReadOnly" :prerendered="prerendered" />
    <LazyAdList v-else />

    <div class="edit" v-if="$store.getters.numOwned > 0">
      {{$store.getters.numOwned}} ads owned by you, {{$store.getters.numOwnedWrapped}} wrapped as NFT.
      <form>
        <p>
          <select v-model="ad">
            <option disabled value="">Select ad to edit</option>
            <option v-for="ad of $store.state.ownedAds" :key="ad.idx" v-bind:value="ad">>
            #{{ad.idx}} ({{ad.wrapped ? "NFT" : "Not wrapped"}})- {{ad.width*10}}x{{ad.height*10}}px at ({{ad.x}}, {{ad.y}}): {{ad.title}} - {{ ad.link || "(no link)" }}
            </option>
          </select>
        </p>
        <p>
          <button v-on:click="tab = 'publish'" :disabled="tab == 'publish' || !ad">Edit Ad</button>
          <button v-on:click="tab = 'wrap'" :disabled="tab == 'wrap' || !ad">Wrap / Unwrap</button>
          <button type="button" v-on:click="$store.dispatch('detectHalfWrapped', { ketherContract: contract, nftContract: ketherNFT })">Check for Half-Wrapped Ads</button>
        </p>
      </form>
    </div>
    <p v-else-if="$store.state.activeAccount">
      No purchased ads detected for active accounts. Reload after buying an ad.
    </p>

    <section>
      <LazyPublish v-if="tab == 'publish'" :ad="ad" :provider="provider" :contract="contract" :ketherNFT="ketherNFT" :showNSFW="showNSFW" />
      <LazyWrap v-else-if="tab == 'wrap'" :ad="ad" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" />
    </section>

  </div>
</template>

<script>
import AdGrid from './AdGrid.vue'
import AdList from './AdList.vue'
import Offline from './Offline.vue'

export default {
  props: ["provider", "contract", "ketherNFT", "isReadOnly", "showNSFW", "prerendered"],
  data() {
    return {
      ad: null,
      tab: null,
    }
  },
  components: {
    Offline,
    AdGrid,
    AdList,
  },
}
</script>
