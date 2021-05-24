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

<template v-if="ready">
  <div class="container">
    <AdGrid v-if="$store.state.gridVis" :provider="provider" :contract="contract" :showNSFW="showNSFW" :isReadOnly="isReadOnly" :prerendered="prerendered"></AdGrid>

    <div class="edit" v-if="$store.state.numOwned > 0">
      {{$store.state.numOwned}} ads owned by you. <button v-on:click="showPublish = true" v-if="!showPublish">Edit Ads</button>
    </div>
    <Publish v-if="showPublish" :provider="provider" :contract="contract" :showNSFW="showNSFW"></Publish>


  </div>
</template>

<script>
import AdGrid from './AdGrid.vue'
import AdList from './AdList.vue'
import Publish from './Publish.vue'
import Offline from './Offline.vue'

function toAd(i, r) {
  return {
    idx: i,
    owner: r[0].toLowerCase(),
    x: r[1],
    y: r[2],
    width: r[3],
    height: r[4],
    link: r[5] || "",
    image: r[6] || "",
    title: r[7],
    NSFW: r[8] || r[9],
    forcedNSFW: r[9],
  }
}

export default {
  props: ["provider", "contract", "isReadOnly", "showNSFW", "prerendered"],
  data() {
    return {
      showPublish: false,
    }
  },
  methods: {
    async loadAds() {
      this.$store.commit('clearAds');
      this.$store.commit('initGrid');

      // TODO: error handling?
      let numAds = await this.contract.getAdsLength();
      this.$store.commit('setAdsLength', numAds);
      let ads = [...Array(numAds.toNumber()).keys()].map(i => this.contract.ads(i));
      for await (const [i, ad] of ads.entries()) {
        this.$store.commit('addAd', toAd(i, await ad));
      }
    },
    // FIXME: Removed loadAdsStatic, replace it using nuxt pregen
  },
  watch: {
    contract() {
      // Changing networks (and thus contract instances) will reload the ads
      this.loadAds();
    }
  },
  created() {
    this.loadAds();
  },
  components: {
    Publish,
    Offline,
    AdGrid,
    AdList,
  },
}
</script>
