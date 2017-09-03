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

.editAd {
  border-left: 10px solid #eee;
  padding-left: 10px;

  .previewAd {
    display: block;
    overflow: hidden;
    background: #000;
    font-size: 11px;
    color: #eee;
    white-space: nowrap;
  }
}


</style>

<template>
  <div id="adPublish">
    <form v-if="$store.state.numOwned > 0" v-on:submit='publish' v-on:submit.prevent>
      <select v-model="ad">
        <option disabled value="">Select ad to edit</option>
        <option v-for="ad of $store.state.ownedAds" :value="ad">
          {{ad.width*10}}x{{ad.height*10}}px at ({{ad.x}}, {{ad.y}}): {{ ad.link || "(no link)" }}
        </option>
      </select>
      <div v-if="ad" class="editAd">
        <p>
          What do you want your ad to look like? Some rules:
        </p>
        <ul>
          <li>If your ad contains adult content, please self-mark it as NSFW. NSFW ads are opt-in by viewers. You can change it later if you self-mark as NSFW.</li>
          <li>Don't put inappropriate or illegal content in the ad.</li>
          <li>Keep your image size small, under 100KB. PNG is preferred, but JPG or non-animated GIF is acceptable.</li>
          <li>If your ad breaks any rules, it can be forced to NSFW by the moderators of this contract and then only a moderator can change it back to non-NSFW.</li>
        </ul>
        <label>
          <span>Title</span>
          <input type="text" v-model="ad.title" placeholder="Come visit MyCorp" />
        </label>
        <label>
          <span>Link</span>
          <input type="text" v-model="ad.link" placeholder="https://..." />
        </label>
        <label>
          <span>Image</span>
          <input type="text" v-model="ad.image" placeholder="https://...." />
          <small>URL to PNG image. Can be <code>https://</code>, <code>bzz://</code>, or <code>data:image/png,base64,...</code> encoded</small>
        </label>
        <label>
          <span>NSFW</span>
          <input type="checkbox" v-model="ad.NSFW" />
          <strong v-if="ad.forcedNSFW">Forced NSFW by moderator</strong>
        </label>
        <div>
          <h3>Live preview</h3>
          <p>
            <a :href="ad.link" target="_blank"><img class="previewAd" :src="ad.image" :style="{ width: (ad.width*10) + 'px', height: (ad.height*10) + 'px'}" :title="ad.title" /></a>
          </p>
        </div>
        <input type="submit" value="Publish Changes" />
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
export default {
  props: ["web3", "contract"],
  data() {
    return {
      ad: false,
      error: null,
    }
  },
  methods: {
    publish() {
      this.contract.publish.sendTransaction(this.ad.idx, this.ad.link, this.ad.image, this.ad.title, Number(this.ad.NSFW), { from: this.ad.owner }, function(err, res) {
        if (err) {
          this.error = err;
        }
        this.ad = false;
      }.bind(this));
      return false;
    },
  },
}
</script>
