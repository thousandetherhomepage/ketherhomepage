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

.editAd, .wrapAd {
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
  <div id="adPublish">
    <form v-if="$store.getters.numOwned > 0" v-on:submit='publish' v-on:submit.prevent>
      <select v-model="ad">
        <option disabled value="">Select ad to edit</option>
        <option v-for="ad of $store.state.ownedAds" :key="ad.idx" v-bind:value="ad">>
        #{{ad.idx}} ({{ad.wrapped ? "NFT" : "Not wrapped"}})- {{ad.width*10}}x{{ad.height*10}}px at ({{ad.x}}, {{ad.y}}): {{ad.title}} - {{ ad.link || "(no link)" }}
        </option>
      </select>

      <div v-if="ad" class="wrapAd">
        <h3>NFT</h3>
        <p v-if="ad.wrapped">
          Ad is wrapped to NFT. 
          <button type="button" v-on:click="unwrap">Unwrap</button>
        </p>
        <p v-else>
          <label>
            <button type="button" v-on:click="wrap">Wrap to NFT</button> 
            <span>(Queue up 2 on-chain transactions)</span>
          </label>
        </p>
      </div>

      <div v-if="ad" class="editAd">
        <h3>Publish Changes</h3>
        <p>
          What do you want your ad to look like? Some rules:
        </p>
        <ul>
          <li>If your ad contains adult content, please self-mark it as NSFW. NSFW ads are opt-in by viewers. You can change it later if you self-mark as NSFW.</li>
          <li>Don't link to, or put, inappropriate or illegal content in the ad.</li>
          <li><strong>Keep your image size small, under 100KB.</strong> PNG is preferred, but JPG or non-animated GIF is acceptable.</li>
          <li>If your ad breaks any rules, it can be forced to NSFW by the moderators of this contract and then only a moderator can change it back to non-NSFW.</li>
        </ul>
        <label>
          <span>Idx</span>
          <input type="text" disabled :value="ad.idx">
        </label>
        <label>
          <span>Title</span>
          <input type="text" v-model="ad.title" placeholder="Come visit MyCorp" />
        </label>
        <label>
          <span>Link</span>
          <input type="text" v-model="ad.link" placeholder="https://..." />
          <small class="error" v-if="ad.link && ad.link.indexOf('://') === -1">Missing https://?</small>
        </label>
        <label>
          <span>Image</span>
          <input type="text" v-model="ad.image" placeholder="https://...." />
          <small>URL to PNG image. Preferably <code>ipfs://</code> or <code>data:image/png,base64,...</code> encoded. Can be <code>https://</code> but <strong>do not hotlink</strong> because they tend to break. Link to an actual image, not a website containing it. <br />Must be less than 100KB.</small>
        </label>
        <label>
          <span>NSFW</span>
          <input type="checkbox" v-model="ad.NSFW" />
          <strong v-if="ad.forceNSFW">Forced NSFW by moderator</strong>
        </label>
        <div>
          <h3>Preview <small>(not published yet)</small></h3>
          <div class="mini-adGrid">
            <Ad :showNSFW="showNSFW" :ad="ad" class="previewAd"></Ad>
          </div>
        </div>
        <div>
          <button type="submit">Publish Changes</button>
        </div>
        <small>
          It can take between 10 seconds to a few minutes for your published ad
          to get mined into the blockchain and show up. The fees are paid to miners
          to get the changes into the next block.
        </small>
      </div>
    </form>
    <p v-else>
      No purchased ads detected for active accounts. Listening to Purchase events on the blockchain...
    </p>

    <p v-if="error" class="error">
      {{ error }}
    </p>
  </div>
</template>

<script>
import Ad from './Ad.vue'

export default {
  props: ["provider", "contract", "ketherNFT", "showNSFW"],
  data() {
    return {
      ad: false,
      error: null,
    }
  },
  methods: {
    async publish() {
      ga('send', {
        hitType: 'event',
        eventCategory: this.contract._network,
        eventAction: 'publish-submit',
      });
      const signer = await this.provider.getSigner();
      const signerAddr = await signer.getAddress();
      if (signerAddr.toLowerCase() != this.ad.owner) {
        this.error = 'Incorrect active wallet. Must publish with: ' + this.ad.owner;
        return;
      }
      try {
        if (this.ad.wrapped) {
          await this.ketherNFT.connect(signer).publish(this.ad.idx, this.ad.link, this.ad.image, this.ad.title, Number(this.ad.NSFW));
        } else {
          await this.contract.connect(signer).publish(this.ad.idx, this.ad.link, this.ad.image, this.ad.title, Number(this.ad.NSFW));
        }

      } catch(err) {
        ga('send', {
          hitType: 'event',
          eventCategory: this.contract._network,
          eventAction: 'publish-error',
          eventLabel: JSON.stringify(err),
        });
        this.error = err;
        return;
      } finally {
        this.ad = false;
      }
      ga('send', {
        hitType: 'event',
        eventCategory: this.contract._network,
        eventAction: 'publish-success',
      });
      return false;
    },
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
  components: {
    Ad,
  },
}
</script>
