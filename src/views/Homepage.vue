<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{accounts}}</p>

    <p>Num Ads: {{numAds}}</p>
    <ul>
      <li v-for="tile in tiles">
        {{ tile }}
      </li>
    </ul>
  </div>
</template>

<script>
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
            this.tiles.push(res);
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
