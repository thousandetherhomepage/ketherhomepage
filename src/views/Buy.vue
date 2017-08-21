<style lang="scss">
#adBuy input {
  width: 3em;
  text-align: center;
}
.error {
  color: red;
}
</style>

<template>
  <div id="adBuy">
    <h2>Buy ad slot</h2>
    <p>
      Ad slots are sold in 10-pixel increments.
    </p>

    <p>
      width: <vue-slider v-bind="sliderWidth" v-model="width"></vue-slider>
      height: <vue-slider v-bind="sliderHeight" v-model="height"></vue-slider>
    </p>
    <p>
      Position:
      (<input v-model="x" placeholder="X" maxlen="4">,
      <input v-model="y" placeholder="Y" maxlen="4">)

      x: <vue-slider v-bind="sliderWidth" v-model="x"></vue-slider>
      y: <vue-slider v-bind="sliderHeight" v-model="y"></vue-slider>
    </p>

    <p>
      Price: {{price}} ETH + gas fees.
    </p>

    <p v-if="error" class="error">{{error}}</p>

    <p v-if="isAvailable(x, y, width, height, $store.state.ads)">
      <strong>Slot is available.</strong>
      <button v-on:click="buy">Buy Slot</button>
    </p>
    <p v-else>
      Slot is not available.
    </p>

  </div>
</template>

<script>
import vueSlider from 'vue-slider-component';

const sliderThickness = 6;
const sliderLength = 300;
const ethPerPixel = 1000 / 1000000;

export default {
  props: ["web3", "contract"],
  data() {
    return {
      width: 10,
      height: 10,
      x: 0,
      y: 0,
      sliderWidth: {
        interval: 10,
        min: 10,
        max: 1000,
      },
      sliderHeight: {
        interval: 10,
        min: 10,
        max: 1000,
        "tooltip-dir": "bottom",
      },
      error: null,
    }
  },
  computed: {
    price: function () {
      // Round up to the nearest 0.01
      return Math.ceil(this.height * this.width * ethPerPixel * 100) / 100;
    }
  },
  methods: {
    isAvailable(x, y, width, height) {
      const x1 = Math.floor(x/10);
      const y1 = Math.floor(y/10);
      const x2 = x1 + Math.floor(width/10) - 1;
      const y2 = y1 + Math.floor(height/10) - 1;

      return !this.$store.getters.isColliding(x1, y1, x2, y2);
    },
    buy() {
      const ad = {x: this.x, y: this.y, width: this.width, height: this.height}
      const weiPrice = this.web3.toWei(this.price, "ether");
      const account = this.$store.state.activeAccount;
      if (!this.isAvailable(ad.x, ad.y, ad.width, ad.height)) {
        this.error = `Slot is not available: ${ad}`
        return;
      }
      const x = Math.floor(this.x/10), y = Math.floor(this.y/10), width = Math.floor(this.width/10), height = Math.floor(this.height/10);
      this.contract.buy.sendTransaction(x, y, width, height, { value: weiPrice, from: account }, function(err, res) {
        if (err) {
          this.error = err;
        }
        // TODO: Transition to Publish route?
      }.bind(this));
    }
  },
  components: {
    vueSlider
  },
}
</script>
