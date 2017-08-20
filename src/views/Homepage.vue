<style lang="scss">
#adGrid {
  position: relative;
  width: 1000px;
  height: 1000px;
  background: #eee;
}
</style>

<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{accounts}}</p>

    <p>Num Ads: {{numAds}}</p>
    <ul id="adGrid">
      <li v-for="tile in tiles" :style="tile.style">
        <a :href="tile.link"><img :src="tile.image" /></a>
      </li>
    </ul>
  </div>
</template>

<script>

function toAd(r) {
  const ad = {
    x: r[0].toNumber(),
    y: r[1].toNumber(),
    width: r[2].toNumber(),
    height: r[3].toNumber(),
    link: r[4],
    image: r[5],
    nsfw: r[6],
  }
  ad.style = {
    "position": "absolute",
    "margin-left": ad.x * 10,
    "margin-top": ad.y * 10,
    "width": ad.width,
    "height": ad.height,
  }
  return ad;
}

export default {
  props: ["web3", "contract"],
  data() {
    return {
      accounts: "connecting...",
      numAds: 0,
      tiles: [],
    }
  },
  methods: {
    loadTiles() {
      this.contract.getAdsLength.call(function(err, res) {
        this.numAds = res.toNumber();

        for (let i=0; i<this.numAds; i++) {
          this.contract.getAd.call(i, function(err, res) {
            this.tiles.push(toAd(res));
          }.bind(this));
        }

      }.bind(this));
    },
  },
  created() {
    this.web3.eth.getAccounts(function(err, res) {
      this.accounts = res;
    }.bind(this));

    this.loadTiles();
  }
}
</script>
