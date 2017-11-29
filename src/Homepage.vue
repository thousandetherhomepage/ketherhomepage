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
    <AdGrid v-if="$store.state.gridVis" :web3="web3" :contract="contract" :showNSFW="showNSFW" :isReadOnly="isReadOnly" :prerendered="prerendered"></AdGrid>
    <AdList v-else :showNSFW="showNSFW"></AdList>

    <div class="edit" v-if="$store.state.numOwned > 0">
      {{$store.state.numOwned}} ads owned by you. <button v-on:click="showPublish = true" v-if="!showPublish">Edit Ads</button>
    </div>
    <Publish v-if="showPublish" :web3="web3" :contract="contract" :showNSFW="showNSFW"></Publish>

    <Offline v-if="isReadOnly"></Offline>
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
    owner: r[0],
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
  props: ["web3", "contract", "isReadOnly", "showNSFW", "prerendered"],
  data() {
    return {
      showPublish: false,
    }
  },
  methods: {
    loadAds() {
      this.$store.commit('clearAds');
      this.contract.getAdsLength.call(function(err, res) {
        const num = res.toNumber();
        this.$store.commit('setAdsLength', num);

        for (let i=0; i<num; i++) {
          this.contract.ads.call(i, function(err, res) {
            this.$store.commit('addAd', toAd(i, res));
          }.bind(this));
        }

      }.bind(this));
    },
    loadAdsStatic() {
      this.$store.commit('clearAds');
      var xhr = new XMLHttpRequest();
      xhr.open("GET", this.prerendered.data, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;

        const resp = JSON.parse(xhr.responseText);
        const ads = resp.ads;
        this.$store.commit('setAdsLength', ads.length);
        for (let i=0; i<ads.length; i++) {
          const ad = ads[i];
          // FIXME: Remove polyfill from old version
          if (ad.userNSFW) ad.NSFW = ad.userNSFW;
          this.$store.commit('addAd', ad);
        }
      }.bind(this);
      xhr.send();
    },
  },
  created() {
    this.web3.eth.getAccounts(function(err, res) {
      for (const acct of res) {
        this.$store.commit('addAccount', acct)
      }
    }.bind(this));

    if (!this.prerendered.loadFromWeb3) {
      this.loadAdsStatic();
      return;
    }

    this.loadAds();

    // Setup event monitoring:
    this.contract.Buy().watch(function(err, res) {
      if (err) {
        // TODO: Surface this in UI?
        console.log("Buy event monitoring disabled, will need to refresh to see changes.")
        return;
      }

      this.$store.commit('addAd', res.args);

      const previewAd = this.$store.state.previewAd;
      if (this.previewLocked && Number(res.args.x*10) == previewAd.x && Number(res.args.y*10) == previewAd.y) {
        // Colliding ad purchased
        this.previewLocked = false;
        this.$store.commit('clearPreview');
      }
    }.bind(this))

    this.contract.Publish().watch(function(err, res) {
      if (err) {
        // TODO: Surface this in UI?
        console.log("Publish event monitoring disabled, will need to refresh to see changes.")
        return;
      }

      this.$store.commit('addAd', res.args);
    }.bind(this))
  },
  components: {
    Publish,
    Offline,
    AdGrid,
    AdList,
  },
}
</script>
