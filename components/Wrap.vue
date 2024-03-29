<style lang="scss">
label {
  display: block;
  margin-bottom: 0.5em;
  span {
    display: inline-block;
    min-width: 6em;
  }
}
input {
  width: 200px;
}

.wrapAd {
  width: 700px;
  border-left: 10px solid #eee;
  padding-left: 10px;

  .previewAd img {
    display: block;
    overflow: hidden;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.7);
    white-space: nowrap;
  }

  small {
    color: #966;
    margin: 0.5em;
    display: inline-block;
  }

  button {
    font-size: 1em;
    padding: 5px;
    background: #fff8db;
    display: block;
    border-width: 2px;
  }
  label {
    line-height: 2em;

    button {
      display: inline-block;
      margin-right: 0.25em;
    }
  }
  .mini-adGrid {
    padding: 10px;
    background: #ddd;
    margin-bottom: 1em;
  }
}
</style>

<template>
  <div>
    <form v-on:submit.prevent class="wrapAd">
      <h3>NFT</h3>
      <p class="progress" v-if="wrapInProgress">
        <img src="/throbber.svg" style="width: 32px; height: 18px; vertical-align: text-bottom;" alt="⏳" />
        <strong>Transaction in progress.</strong>
        <span>{{wrapInProgress}}</span>
      </p>
      <p v-if="ad.wrapped">
      Ad is wrapped to NFT.
      <button type="button" v-on:click="unwrap" v-bind:disabled="!!wrapInProgress">Unwrap #{{ad.idx}} to Legacy Contract</button>
      </p>
      <p v-else-if="$store.state.halfWrapped[ad.idx]">
        <label>
          <button type="button" v-on:click="wrap" v-bind:disabled="!!wrapInProgress">Finish Wrapping #{{ad.idx}} to NFT</button>
          <small>Complete the wrapping of this ad as NFT</small>
        </label>
      </p>
      <p v-else>
        <label>
          <button type="button" v-on:click="wrap" v-bind:disabled="!!wrapInProgress">Wrap #{{ad.idx}} to NFT</button>
          <small>Queue up 2 on-chain transactions, roughly 31,249 + 231,727 gas = 0.0262 ETH at 100 gwei</small>
        </label>
      </p>
    </form>
    <p v-if="error" class="error">
      {{ error }}
    </p>
  </div>
</template>

<script>

export default {
  props: ["provider", "contract", "ketherNFT", "ad"],
  data() {
    return {
      error: null,
      wrapInProgress: "",
    }
  },
  methods: {
    async wrap() {
      const signer = await this.provider.getSigner();
      const signerAddr = await signer.getAddress();

      try {
        const { salt, predictedAddress } = (await this.ketherNFT.precompute(this.ad.idx, signerAddr));

        if (predictedAddress.length != 42 || predictedAddress == "0x0000000000000000000000000000000000000000") {
          throw "Invalid predictedAddress, something is wrong: " + predictedAddress;
        }

        const expectedPredictedAddress = this.$store.getters.precomputeEscrow({idx: this.ad.idx, KH: this.contract, KNFT: this.ketherNFT});
        if (!this.$address.equal(predictedAddress, expectedPredictedAddress)) {
          throw "predictedAddress does not match expected value, something went wrong: " + predictedAddress + " != " + expectedPredictedAddress;
        }

        this.wrapInProgress = "Fetching latest state...";

        // Change ad owner if not already changed (check for stale state)
        if (this.$address.equal((await this.contract.ads(this.ad.idx)).owner, predictedAddress)) {
          // setAdOwner already done, skip
          this.$store.commit('addHalfWrapped', {idx: this.ad.idx, account: signerAddr});

        } else if (!this.$store.state.halfWrapped[this.ad.idx]) {
          this.wrapInProgress = "Check your wallet for queued transactions, there will be 2 in total.";
          const tx = await this.contract.connect(signer).setAdOwner(this.ad.idx, predictedAddress);
          this.wrapInProgress = "First transaction submitted, waiting... (This can take a few minutes)";
          await tx.wait();
          this.$store.commit('addHalfWrapped', {idx: this.ad.idx, account: signerAddr});
        }

        // Wrap if not already wrapped (check for stale state again)
        if (!this.$address.equal((await this.contract.ads(this.ad.idx)).owner, this.ketherNFT.address)) {
          this.wrapInProgress = "Confirm 2nd wrap transaction, check your wallet queue.";
          const tx = await this.ketherNFT.connect(signer).wrap(this.ad.idx, signerAddr);
          this.wrapInProgress = "Second transaction submitted, waiting...";
          await tx.wait();
        }

        this.$store.commit('updateAds', [{idx: this.ad.idx, update: {owner: signerAddr, wrapped: true}}]);
        this.$store.commit('removeHalfWrapped', this.ad.idx);

        this.$emit("refresh", {idx: this.ad.idx});

        this.error = null; // Reset error if completed successfully.
      } catch(err) {
        this.error = err;
      } finally {
        this.wrapInProgress = false;
      }
    },
    async unwrap() {
      const signer = await this.provider.getSigner();
      const signerAddr = await signer.getAddress();

      try {
        // Unwrap if ketherNFT is the owner (check for stale state)
        if (this.$address.equal((await this.contract.ads(this.ad.idx)).owner, this.ketherNFT.address)) {
          const tx = await this.ketherNFT.connect(signer).unwrap(this.ad.idx, signerAddr);
          this.wrapInProgress = "Unwrapping transaction submitted, waiting...";
          await tx.wait();
        }
        this.$store.commit('updateAds', [{idx: this.ad.idx, update: {wrapped: false}}]);
        this.$emit("refresh", {idx: this.ad.idx});

        this.error = null; // Reset error if completed successfully.
      } catch(err) {
        this.error = err;
      } finally {
        this.wrapInProgress = false;
      }
    }
  },
}
</script>
