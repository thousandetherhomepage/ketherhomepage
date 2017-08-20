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
    </p>

    <p>
      Price: {{price}} ETH + gas fees.
    </p>

    <p v-if="error" class="error">{{error}}</p>

    <button v-on:click="buy">Buy Slot</button>
  </div>
</template>

<script>
import vueSlider from 'vue-slider-component';

const sliderThickness = 6;
const sliderLength = 300;
const ethPerPixel = 1000 / 1000000;

export default {
  props: ["web3", "contract", "account"],
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
      // TODO: Implement this
      return true;
    },
    buy() {
      const x = Math.floor(this.x/10), y = Math.floor(this.y/10), width = Math.floor(this.width/10), height = Math.floor(this.height/10);
      const weiPrice = this.web3.toWei(this.price, "ether");
      const account = this.account;
      if (!this.isAvailable(x, y, width, height)) {
        this.error = `Slot is not available: ${width*10}x${height*10} at position (${x*10}, ${y*10})`
        return;
      }
      this.contract.buy.sendTransaction(x, y, width, height, { value: weiPrice, from: account }, function(err, res) {
        if (err) {
          this.error = err;
        }
        this.$dispatch('purchased', account)
      }.bind(this));
    }
  },
  components: {
    vueSlider
  },
}
</script>
