<style lang="scss">
form {
  margin-bottom: 2em;
  width: 600px;
}
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
  .mini-adGrid {
    padding: 10px;
    background: #ddd;
    margin-bottom: 1em;
  }
}

.wrapAd {
  label {
    display: flex;
    line-height: 2em;

    button {
      margin-right: 0.25em;
    }
  }

}
</style>

<template>
  <div>
    <form v-on:submit.prevent class="wrapAd">
      <h3>NFT</h3>
      <p v-if="ad.wrapped">
      Ad is wrapped to NFT. 
      <button type="button" v-on:click="unwrap">Unwrap #{{ad.idx}} to Legacy Contract</button>
      </p>
      <p v-else>
      <label>
        <button type="button" v-on:click="wrap">Wrap #{{ad.idx}} to NFT</button> 
        <span>(Queue up 2 on-chain transactions)</span>
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
      wrapInProgress: false,
    }
  },
  methods: {
    async wrap() {
      const signer = await this.provider.getSigner();
      const signerAddr = await signer.getAddress();
      if (signerAddr.toLowerCase() != this.ad.owner) {
        this.error = 'Incorrect active wallet. Must publish with: ' + this.ad.owner;
        return;
      }
      try {
        const { predictedAddress } = (await this.ketherNFT.precompute(this.ad.idx, signerAddr));

        // TODO we need to be able to rescue if only the first part worked (e.g. if you have an ad at your predicted address)
        // Right now it won't show up after a refresh in the UI because it belongs to a precomputed address and hasn't been minted yet..
        await (await this.contract.connect(signer).setAdOwner(this.ad.idx, predictedAddress)).wait();
        await this.ketherNFT.connect(signer).wrap(this.ad.idx, signerAddr);
        //TODO trigger reload here?
        //TODO throbber or message that transaction has been submitted
      } catch(err) {
         this.error = err;
      } finally {
        this.ad = false;
      }
    },
    async unwrap() {
      const signer = await this.provider.getSigner();
      const signerAddr = await signer.getAddress();
      if (signerAddr.toLowerCase() != this.ad.owner) {
        this.error = 'Incorrect active wallet. Must publish with: ' + this.ad.owner;
        return;
      }
      try {
        await this.ketherNFT.connect(signer).unwrap(this.ad.idx, signerAddr)
      } catch(err) {
         this.error = err;
      } finally {
        this.ad = false;
      }
    }
  },
}
</script>
