<style lang="scss">
nav {
  font-weight: bold;
  color: white;
  padding: 0.7em 1em;
  margin-top: 0.5em;
  margin-top: 1em;
  margin-left: 5px;
  border-radius: 3px;
}

input {
  padding: 2px;
}
button {
  margin-left: 5px;
}

.edit {
  background: #246648;
}

.publisher {
  background: rgb(56,109,170);
}

.find-missing {
  background: rgb(190,140,20);
}

.message {
  color: rgba(240, 140, 140, 1);

  pre {
    text-wrap: wrap;
    overflow: hidden;
    color: rgba(255,255,255,0.5);
  }
}
</style>

<template>
  <div>
    <nav class="edit" v-if="$store.getters.numOwned > 0 > 0">
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
    </nav>
    <nav class="find-missing" v-else-if="$store.state.activeAccount">
      No purchased ads detected for active accounts. Reload after buying an ad.
      <button type="button" v-on:click="tab = 'missing'" :disabled="tab == 'missing'">Find Missing Ad</button>
    </nav>
    <nav class="publisher" v-if="$store.state.activeAccount">
      Delegated Publisher
      <input type="text" v-model.number="delegateAd" placeholder="tokenId" style="width: 5em;" />
      <button type="button" v-on:click="editAsPublisher()">Edit as Publisher</button>
      See: <a href="https://publisher.thousandetherhomepage.com/">publisher.kether.eth</a>
      <div v-if="publisherMsg" class="message">
        <p>
          {{publisherMsg.message}}
        </p>
        <pre v-if="publisherMsg.context">{{publisherMsg.context}}</pre>
      </div>
    </nav>

    <section>
      <LazyPublish v-if="tab == 'publish'" :ad="ad" :provider="provider" :contract="contract" :ketherNFT="ketherNFT" :ketherPublisher="ketherPublisher" :showNSFW="showNSFW" :asPublisher="asPublisher" />
      <LazyWrap v-else-if="tab == 'wrap'" :ad="ad" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" @refresh="refresh" />
      <LazyMissing v-else-if="tab == 'missing'" :provider="provider" :ketherNFT="ketherNFT" :contract="contract" />
    </section>
  </div>
</template>

<script>
export default {
  props: ["provider", "contract", "ketherNFT", "ketherPublisher", "showNSFW"],
  data() {
    return {
      ad: null,
      tab: null,
      delegateAd: null,
      asPublisher: false,
      publisherMsg: null,
    }
  },
  methods: {
    async editAsPublisher() {
      if (this.delegateAd === "" || this.delegateAd === null) {
        this.publisherMsg = {
          message: "Error: Must specify ad tokenId to publish as.",
        }
        return;
      }
      try {
        const addr = await (await this.provider.getSigner()).getAddress();
        const ok = await this.ketherPublisher.isApprovedToPublish(addr, this.delegateAd);
        if (!ok) {
          this.publisherMsg = {message: "Error: Not approved to publish for this ad: " + this.delegateAd};
          return;
        }
      } catch (err) {
        this.publisherMsg = {
          message: "Error: Delegated publishing is not set up for this ad: " + this.delegateAd,
          context: err.message,
        }
        return;
      }

      this.refresh({ idx: this.delegateAd });
      this.asPublisher = true;
      this.tab = 'publish';
    },
    refresh({ idx }) {
      this.ad = this.$store.state.ads[idx];
    },
  },
}
</script>
