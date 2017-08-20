<style lang="scss">
#adGrid {
  position: relative;
  width: 1000px;
  height: 1000px;
  background: #eee;

  img {
    position: absolute;
    display: block;
    overflow: hidden;
  }
}
</style>

<template>
  <div>
    <p>{{ads.length}} Ads Purchased, {{numOwned}} by you.</p>

    <div id="adGrid">
      <template v-for="ad in ads" v-if="ad">
        <a :href="ad.link"><img :src="ad.image" :style="adStyle(ad)" /></a>
      </template>
    </div>
  </div>
</template>

<script>

function toAd(i, r) {
  return {
    // TODO: Add owner
    idx: i,
    x: r[0].toNumber(),
    y: r[1].toNumber(),
    width: r[2].toNumber(),
    height: r[3].toNumber(),
    link: r[4],
    image: r[5] || "",
    nsfw: r[6],
  }
}

export default {
  props: ["web3", "contract", "ownedAds"],
  data() {
    return {
      accounts: {},
      ads: [],
      numOwned: 0,
    }
  },
  methods: {
    isOwner(account) {
      return true; // XXX
      return this.accounts[account] || false;
    },
    loadAd(ad) {
      if (ad.idx > this.ads.length) {
        this.ads.length = ad.idx;
      }
      // Need to use splice rather than this.ads[i] to make it reactive
      this.ads.splice(ad.idx, 1, ad);
      if (this.isOwner(ad.owner)) {
        if (this.ownedAds[ad.idx] === undefined) {
          this.numOwned++;
        }
        this.ownedAds[ad.idx] = ad;

        // FIXME: This is a dirty hack to pass data up and down again -_-, remove after switching to VueX or similar
        this.$emit('update:ownedAds', JSON.parse(JSON.stringify(this.ownedAds)));
      }
    },
    loadAds() {
      this.contract.getAdsLength.call(function(err, res) {
        const num = res.toNumber();
        this.ads.length = num;

        for (let i=0; i<num; i++) {
          this.contract.getAd.call(i, function(err, res) {
            this.loadAd(toAd(i, res));
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
      if (!ad.image) {
        s["background"] = "#000";
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
        this.accounts[acct] = true;
      }
    }.bind(this));

    this.loadAds();
  }
}
</script>
