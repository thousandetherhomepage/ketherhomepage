<style lang="scss">
.adGrid {
  img, .nsfwAd, a div {
    position: absolute;
    display: block;
    overflow: hidden;
    font-size: 11px;
    color: #888;
    white-space: nowrap;
  }

  .nsfwAd {
    background: #000;
  }

  &.active img {
    box-shadow: 0px 0px 0px 1px rgba(255, 255, 255, 0.4) inset;
  }

  .previewAd {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.9);
    z-index: 5;
  }
  .previewAd.locked {
    background: #ffcc47;
  }
}
</style>

<template>
  <div class="container">
    <div :class="{ adGrid: true, active: !!$store.state.previewAd }" :style="gridStyle(prerendered)">
      <template v-for="ad in $store.state.ads" v-if="ad">
        <Ad :showNSFW="showNSFW" :ad="ad" :skipImage="!loadRemoteImages"></Ad>
      </template>
      <vue-draggable-resizable :active="true" :minw="10" :minh="10" :x="$store.state.previewAd.x" :y="$store.state.previewAd.y" :w="80" :h="40" :grid="[10,10]" :parent="true" @dragstop="updatePreview" @resizestop="updatePreview" :draggable="!previewLocked" :resizable="!previewLocked" v-if="$store.state.previewAd" v-bind:class="{previewAd: true, locked: previewLocked}">
        <Buy :web3="web3" :contract="contract" :isReadOnly="isReadOnly" @buy="onBuy"></Buy>
      </vue-draggable-resizable>
    </div>

    <p v-if="$store.state.numOwned > 0">{{$store.state.numOwned}} ads owned by you. <button v-on:click="showPublish = true" v-if="!showPublish">Edit Ads</button></p>
    <Publish v-if="showPublish" :web3="web3" :contract="contract" :showNSFW="showNSFW"></Publish>

    <Offline v-if="isReadOnly"></Offline>
  </div>
</template>

<script>
import Ad from './Ad.vue'
import Buy from './Buy.vue'
import Publish from './Publish.vue'
import Offline from './Offline.vue'
import VueDraggableResizable from 'vue-draggable-resizable'

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
      previewLocked: false,
      showPublish: false,
      loadRemoteImages: true,
    }
  },
  methods: {
    onBuy: function (ad) {
      this.previewLocked = true;
    },
    updatePreview(x, y, width, height) {
      this.$store.commit('updatePreview', {x, y, width, height})
    },
    isOwner(account) {
      this.$store.state.accounts[account] || false;
    },
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
    gridStyle(config) {
      if (!config) return;
      return {
        'background-image': 'url(' + config.image + ')',
      }
    },
  },
  created() {
    this.web3.eth.getAccounts(function(err, res) {
      for (const acct of res) {
        this.$store.commit('addAccount', acct)
      }
    }.bind(this));

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
    'vue-draggable-resizable': VueDraggableResizable,
    Ad,
    Buy,
    Publish,
    Offline,
  },
}
</script>
