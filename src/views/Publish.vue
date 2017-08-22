<style lang="scss">
form {
  margin-bottom: 2em;
}
label {
  display: block;
  span {
    display: inline-block;
    min-width: 6em;
  }
}
</style>

<template>
  <div id="adPublish">
    <form v-if="$store.state.numOwned > 0" v-on:submit='publish' v-on:submit.prevent>
      <select v-model="ad">
        <option disabled value="">Select ad to edit</option>
        <option v-for="ad of $store.state.ownedAds" v-bind:value="ad">
          {{ad.width}}x{{ad.height}} at ({{ad.x}}, {{ad.y}}): {{ ad.link || "(no link)" }}
        </option>
      </select>
      <div v-if="ad">
        <label>
          <span>Link</span>
          <input type="text" v-model="ad.link" />
        </label>
        <label>
          <span>Image</span>
          <input type="text" v-model="ad.image" />
        </label>
        <label>
          <span>Title</span>
          <input type="text" v-model="ad.title" />
        </label>
        <label>
          <span>NSFW</span>
          <input type="checkbox" v-model="ad.nsfw" />
        </label>
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
      this.contract.publish.sendTransaction(this.ad.idx, this.ad.link, this.ad.image, this.ad.title, this.ad.nsfw, { from: this.ad.owner }, function(err, res) {
        if (err) {
          this.error = err;
        }
        console.log("success");
        this.ad = false;
      }.bind(this));
      return false;
    },
  },
}
</script>
