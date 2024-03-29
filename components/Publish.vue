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

.editAd {
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
</style>

<template>
  <div id="adPublish">
    <form v-on:submit='publish' v-on:submit.prevent>

      <div class="editAd">
        <h3>Publish Changes</h3>
        <p v-if="asPublisher"><strong style="color: purple">Editing as delegated publisher</strong></p>
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
          <input type="text" @change="checkImage" v-model="ad.image" placeholder="https://...." />
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
            <Ad :showNSFW="showNSFW" :ad="ad" class="previewAd" ref="adPreview"></Ad>
          </div>
        </div>
        <ul v-if="warnings.length > 0">
          <li v-for="w in warnings" :key="w">⚠️ {{w}}</li>
        </ul>
        <div>
          <button type="submit" v-bind:disabled="!canPublish">Publish Changes</button>
        </div>
        <p class="progress" v-if="inProgress">
          <img src="/throbber.svg" style="width: 32px; height: 18px; vertical-align: text-bottom;" alt="⏳" />
          <strong>Transaction in progress.</strong>
          <span>{{inProgress}}</span>
        </p>
        <small>
          It can take between 10 seconds to a few minutes for your published ad
          to get mined into the blockchain and show up. The fees are paid to miners
          to get the changes into the next block.
        </small>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error }}
    </p>
  </div>
</template>

<script>
import Ad from './Ad.vue'
import Wrap from './Wrap.vue'

export default {
  props: ["ad", "provider", "contract", "ketherNFT", "ketherPublisher", "asPublisher", "showNSFW"],
  data() {
    return {
      canPublish: true,
      warnings: [],
      inProgress: false,
      error: null,
    }
  },
  watch: {
    ad() {
      // Reset checkImage
      this.canPublish = true;
      this.warnings = [];
    },
  },
  methods: {
    async checkImage() {
      // FIXME: This is hacky AF for now
      const warnings = [];
      const el = this.$refs.adPreview.$el.children[0];
      const maxWidth = this.ad.width * 20;
      const maxHeight = this.ad.height * 20;
      const maxRes = maxWidth * maxHeight * 2;

      if (el.naturalWidth > maxWidth) {
        warnings.push(`Image is too wide: Width is ${el.naturalWidth}px but it should be ${maxWidth / 2}px (or ${maxWidth}px for HiDPI).`);
      }
      if (el.naturalHeight > maxHeight) {
        warnings.push(`Image is too tall: Height is ${el.naturalHeight}px but it should be ${maxHeight / 2}px (or ${maxHeight}px for HiDPI).`);
      }
      if ((el.naturalWidth / el.naturalHeight) != (maxWidth / maxHeight)) {
        warnings.push(`Image aspect ratio is incorrect, it will appear squished and blurry.`);
      }
      const resTooBig = (el.naturalWidth * el.naturalHeight > maxRes);
      if (resTooBig) {
        warnings.push(`Image is way too big. Please resize to ${maxWidth}x${maxHeight}px or smaller before publishing.`);
      }
      this.canPublish = !resTooBig;
      this.warnings = warnings;
    },
    async publish() {
      await this.checkImage();
      if (!this.canPublish) return;
      const ad = this.ad;
      const signer = await this.provider.getSigner();
      const signerAddr = await signer.getAddress();
      if (!this.asPublisher && signerAddr.toLowerCase() != ad.owner) {
        this.error = 'Incorrect active wallet. Must publish with: ' + ad.owner;
        return;
      }
      this.inProgress = 'Waiting for wallet to confirm.';

      // Load latest wrapped state from blockchain (avoid stale state)
      const isWrapped = this.$address.equal((await this.contract.ads(ad.idx)).owner, this.ketherNFT.address);

      try {
        let tx;
        if (this.asPublisher && signerAddr.toLowerCase() != ad.owner) {
          const ok = await this.ketherPublisher.isApprovedToPublish(signerAddr, ad.idx);
          if (!ok) {
            throw "KetherNFTPublisher: Signer is not approved to publish to this ad: " + ad.idx;
          }
          tx = await this.ketherPublisher.connect(signer).publish(ad.idx, ad.link, ad.image, ad.title, Number(ad.NSFW));
        } else if (isWrapped) {
          tx = await this.ketherNFT.connect(signer).publish(ad.idx, ad.link, ad.image, ad.title, Number(ad.NSFW));
        } else {
          tx = await this.contract.connect(signer).publish(ad.idx, ad.link, ad.image, ad.title, Number(ad.NSFW));
        }
        this.inProgress = 'Submitted, waiting...';
        await tx.wait();
        this.inProgress = false;
      } catch(err) {
        this.error = err;
        return;
      } finally {
        this.inProgress = false;
      }
      // TODO: (Re)load this.ad from contract?
      return false;
    },
  },
  components: {
    Ad,
    Wrap,
  },
}
</script>
