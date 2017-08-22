<style lang="scss">
#adBuy {
  position: absolute;
  background: white;
  border: 2px solid #d90006;
  display: block;
  width: 400px;
  height: 100px;
  margin-top: -130px;
  padding: 5px;
  text-align: center;
}
#adBuy.available {
  border-color: #97d900;
}

.error {
  color: red;
}
</style>

<template>
  <div id="adBuy" v-show="$parent.active" v-bind:class="{ available: isAvailable }">
    <div>
      {{$parent.width}}x{{$parent.height}} = {{ $parent.width * $parent.height }} pixels at position ({{$parent.left}}, {{$parent.top}}).
    </div>
    <div>
      Price: {{price($parent.width, $parent.height)}} ETH + gas fees.
    </div>

    <p v-if="error" class="error">{{error}}</p>

    <p v-if="isAvailable">
      <strong>Slot is available.</strong>
      <button v-on:click="buy">Buy Slot</button>
    </p>
    <p v-else>
      Slot is not available.
    </p>
  </div>
</template>

<script>
const ethPerPixel = 1000 / 1000000;

export default {
  props: ["web3", "contract"],
  data() {
    return {
      error: null,
      available: false,
    }
  },
  computed: {
    isAvailable: function() {
      return this.checkAvailable(this.$parent.left, this.$parent.top, this.$parent.width, this.$parent.height, this.$store.state.ads);
    }
  },
  methods: {
    price(height, width) {
      // Round up to the nearest 0.01
      return Math.ceil(height * width * ethPerPixel * 100) / 100;
    },
    checkAvailable(x, y, width, height) {
      const x1 = Math.floor(x/10);
      const y1 = Math.floor(y/10);
      const x2 = x1 + Math.floor(width/10) - 1;
      const y2 = y1 + Math.floor(height/10) - 1;
      return !this.$store.getters.isColliding(x1, y1, x2, y2);
    },
    buy() {
      const ad = {x: this.$parent.left, y: this.$parent.top, width: this.$parent.width, height: this.$parent.height}
      if (!this.checkAvailable(ad.x, ad.y, ad.width, ad.height)) {
        this.error = `Slot is not available: ${ad}`
        return;
      }
      const x = Math.floor(this.x/10), y = Math.floor(this.y/10), width = Math.floor(this.width/10), height = Math.floor(this.height/10);
      const weiPrice = this.web3.toWei(this.price(width, height), "ether");
      const account = this.$store.state.activeAccount;
      this.contract.buy.sendTransaction(x, y, width, height, { value: weiPrice, from: account }, function(err, res) {
        if (err) {
          this.error = err;
        }
        // TODO: Transition to Publish route?
      }.bind(this));
    }
  },
}
</script>
