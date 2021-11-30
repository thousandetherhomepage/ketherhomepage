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
    <LazyAdList v-if="$store.state.vis == 'list'" />
    <LazyAdSVG v-else-if="$store.state.vis == 'svg'"/>
    <AdGrid v-else :provider="provider" :contract="contract" :showNSFW="showNSFW" :isReadOnly="isReadOnly" :prerendered="prerendered" />
    <div class="edit" v-if="$store.getters.numOwned > 0 > 0">
      {{$store.getters.numOwned}} ads owned by you, {{$store.getters.numOwnedWrapped}} wrapped as NFT.
      <div v-if="$store.getters.numHalfWrapped >0">{{$store.getters.numHalfWrapped}} half wrapped and can be rescued.</div>
      <form v-on:submit.prevent>
        <p>
          <select v-model="ad">
            <option disabled value="">Select ad to edit</option>

            <option v-for="idx of Object.keys($store.state.halfWrapped)" :key="idx" v-bind:value="$store.state.ads[idx]">>
            #{{idx}} - Rescue Half Wrapped
            </option>

            <option v-for="ad of $store.state.ownedAds" :key="ad.idx" v-bind:value="ad">>
            #{{ad.idx}} ({{ad.wrapped ? "NFT" : "Not wrapped"}})- {{ad.width*10}}x{{ad.height*10}}px at ({{ad.x}}, {{ad.y}}): {{ad.title}} - {{ ad.link || "(no link)" }}
            </option>
          </select>
        </p>
       </form>
      <p>
        <button type="button" v-on:click="tab = 'publish'" :disabled="tab == 'publish' || !ad || $store.state.halfWrapped[ad.idx]">Edit Ad</button>
        <button type="button" v-on:click="tab = 'wrap'" :disabled="tab == 'wrap' || !ad">Wrap / Unwrap</button>
        <button type="button" v-on:click="tab = 'missing'" :disabled="tab == 'missing'">Find Missing Ad</button>
      </p>
    </div>
    <p v-else-if="$store.state.activeAccount">
      No purchased ads detected for active accounts. Reload after buying an ad.
    </p>

    <section>
      <LazyPublish v-if="tab == 'publish'" :ad="ad" :provider="provider" :contract="contract" :ketherNFT="ketherNFT" :showNSFW="showNSFW" />
      <LazyWrap v-else-if="tab == 'wrap'" :ad="ad" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" @refresh="refresh" />
      <LazyMissing v-else-if="tab == 'missing'" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" />
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
  methods: {
    refresh({ idx }) {
      this.ad = this.$store.state.ads[idx];
    },
  },
  components: {
    Offline,
    AdGrid,
    AdList,
  },
}
</script>
