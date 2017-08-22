<style lang="scss">
#adGrid {
  position: relative;
  width: 1000px;
  height: 1000px;
  background: #ddd;

  img {
    position: absolute;
    display: block;
    overflow: hidden;
    background: #000;
  }

  .previewAd {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.9);
    z-index: 3;
  }
}
</style>

<template>
  <div>
    <p>{{$store.state.adsPixels}} pixels sold. <button v-on:click="updatePreview()" v-if="!previewAd">Buy Pixels</button></p>
    <p v-if="$store.state.numOwned > 0">{{$store.state.numOwned}} ads owned by you. <button v-on:click="showPublish = true" v-if="!showPublish">Edit Ads</button></p>

    <Publish v-if="showPublish" :web3="web3" :contract="contract"></Publish>

    <div id="adGrid">
      <template v-for="ad in $store.state.ads" v-if="ad">
        <a :href="ad.link"><img :src="ad.image" :style="adStyle(ad)" /></a>
      </template>
      <vue-draggable-resizable :minw="10" :minh="10" :w="80" :h="40" :grid="[10,10]" :parent="true" @dragstop="updatePreview" @resizestop="updatePreview" v-if="previewAd" class="previewAd">
        <Buy :web3="web3" :contract="contract"></Buy>
      </vue-draggable-resizable>
    </div>
  </div>
</template>

<script>

import Buy from './Buy.vue'
import Publish from './Publish.vue'
import VueDraggableResizable from 'vue-draggable-resizable'

function toAd(i, r) {
  return {
    idx: i,
    owner: r[0],
    x: r[1].toNumber(),
    y: r[2].toNumber(),
    width: r[3].toNumber(),
    height: r[4].toNumber(),
    link: r[5],
    image: r[6] || "",
    title: r[7],
    nsfw: r[8],
  }
}

export default {
  props: ["web3", "contract"],
  data() {
    return {
      previewAd: null,
      showPublish: false,
    }
  },
  methods: {
    updatePreview(x, y, width, height) {
      this.previewAd = {x, y, width, height}
    },
    isOwner(account) {
      this.$store.state.accounts[account] || false;
    },
    loadAds() {
      this.contract.getAdsLength.call(function(err, res) {
        const num = res.toNumber();
        this.$store.commit('setAdsLength', num);

        for (let i=0; i<num; i++) {
          this.contract.getAd.call(i, function(err, res) {
            this.$store.commit('addAd', toAd(i, res));
          }.bind(this));
        }

        // TODO: Watch events for new Buys and Publish's here?
        // contract.Buy().watch(function() { console.log("event", arguments); })

      }.bind(this));
    },
    adStyle(ad) {
      const s = {
        "margin-left": ad.x * 10 + "px",
        "margin-top": ad.y * 10 + "px",
        "width": ad.width * 10 + "px",
        "height": ad.height * 10 + "px",
      }
      return s;
    }
  },
  events: {
    purchased: function(account) {
      console.log("Purchase detected");
    }
  },
  created() {
    this.web3.eth.getAccounts(function(err, res) {
      for (const acct of res) {
        this.$store.commit('addAccount', acct)
      }
    }.bind(this));

    this.loadAds();
  },
  components: {
    'vue-draggable-resizable': VueDraggableResizable,
    Buy,
    Publish,
  }
}
</script>
