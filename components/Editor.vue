<style lang="scss">
</style>

<template>
  <div>
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

            <option v-for="ad of $store.state.ownedAds" :key="ad.idx" v-bind:value="ad">
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
      <p>
          <div>
              Delegated Publisher
              <input type="text" v-model.number="delegateAd" placholder="tokenId" style="width: 5em;" />
              <button type="button" v-on:click="editAsPublisher(); tab = 'publish'">Edit as Publisher</button>
              See: <a href="https://publisher.thousandetherhomepage.com/">publisher.kether.eth</a>
          </div>
      </p>
    </div>
    <p v-else-if="$store.state.activeAccount">
      No purchased ads detected for active accounts. Reload after buying an ad.
      <button type="button" v-on:click="tab = 'missing'" :disabled="tab == 'missing'">Find Missing Ad</button>
    </p>

    <section>
      <LazyPublish v-if="tab == 'publish'" :ad="ad" :provider="provider" :contract="contract" :ketherNFT="ketherNFT" :showNSFW="showNSFW" :asPublisher="asPublisher" />
      <LazyWrap v-else-if="tab == 'wrap'" :ad="ad" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" @refresh="refresh" />
      <LazyMissing v-else-if="tab == 'missing'" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" />
    </section>
  </div>
</template>

<script>
export default {
  props: ["provider", "contract", "ketherNFT", "showNSFW"],
  data() {
    return {
      ad: null,
      tab: null,
      delegateAd: null,
      asPublisher: false,
    }
  },
  methods: {
    editAsPublisher() {
      this.refresh({ idx: this.delegateAd });
      this.asPublisher = true;
    },
    refresh({ idx }) {
      this.ad = this.$store.state.ads[idx];
    },
  },
}
</script>
