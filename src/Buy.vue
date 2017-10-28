<style lang="scss">
#adBuy {
  position: absolute;
  background: white;
  border: 2px solid #d90006;
  display: block;
  width: 400px;
  height: 80px;
  margin-top: -110px;
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
  <div id="adBuy" v-show="$parent.enabled" v-bind:class="{ available: isAvailable }">
    <div>
      {{$parent.width}}x{{$parent.height}} = {{ $parent.width * $parent.height }} pixels at position ({{$parent.left}}, {{$parent.top}}).
    </div>
    <div>
      Price: {{price($parent.width, $parent.height)}} ETH + gas fees.
    </div>

    <p v-if="error" class="error">{{error}}</p>
    <p v-else-if="success" class="success">{{success}}</p>
    <p v-else-if="isAvailable">
      <strong>Slot is available.</strong>
      <button v-on:click="buy" v-bind:disabled="isReadOnly" v-if="this.$store.state.activeAccount">Buy Pixels</button>
      <button v-on:click="checkAccounts" v-else-if="isReadOnly" disabled="disabled">Buy disabled (read-only mode)</button>
      <button v-on:click="checkAccounts" v-else>Unlock Account to Buy</button>
    </p>
    <p v-else>
      Slot is not available.
    </p>
  </div>
</template>

<script>
const ethPerPixel = 1000 / 1000000;

export default {
  props: ["web3", "contract", "isReadOnly"],
  data() {
    ga('send', {
      hitType: 'event',
      eventCategory: this.contract._network,
      eventAction: 'buy-open',
    });

    return {
      error: null,
      success: null,
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
      // TODO: BigNumber?
      return Math.ceil(height * width * ethPerPixel * 100) / 100;
    },
    checkAccounts() {
      this.web3.eth.getAccounts(function(err, res) {
        for (const acct of res) {
          this.$store.commit('addAccount', acct)
        }
      }.bind(this));
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
      const weiPrice = this.web3.toWei(this.price(ad.width, ad.height), "ether");
      const x = Math.floor(ad.x/10), y = Math.floor(ad.y/10), width = Math.floor(ad.width/10), height = Math.floor(ad.height/10);
      const account = this.$store.state.activeAccount;
      ga('send', {
        hitType: 'event',
        eventCategory: this.contract._network,
        eventAction: 'buy-submit',
        eventValue: weiPrice,
        eventLabel: ad.width + "x" + ad.height,
      });

      this.contract.buy.sendTransaction(x, y, width, height, { value: weiPrice, from: account }, function(err, res) {
        if (err) {
          ga('send', {
            hitType: 'event',
            eventCategory: this.contract._network,
            eventAction: 'buy-error',
            eventLabel: JSON.stringify(err),
          });

          if (err.message && err.message.indexOf('User denied transaction signature.') !== -1)  {
            // Aborted, revert to original state.
            return;
          }
          this.error = err.toString();
          return;
        }

        this.success = 'Transaction sent successfully.'
        this.$emit("buy", {x, y, width, height})
        ga('send', {
          hitType: 'event',
          eventCategory: this.contract._network,
          eventAction: 'buy-success',
          eventValue: weiPrice,
          eventLabel: ad.width + "x" + ad.height,
        });
        // TODO: Transition to Publish route?
      }.bind(this));
    }
  },
}
</script>
