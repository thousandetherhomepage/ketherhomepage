<template>
  <a :href="link" target="_blank">
    <img :src="image" :style="style" :title="title" :class="{ nsfwAd: !shown }" />
  </a>
</template>

<script>
function gatewayURL(url) {
  if (!url) return "";
  if (url.startsWith('bzz://')) {
    url = 'http://swarm-gateways.net/bzz:/' + url.slice(6);
  } else if (url.startsWith('ipfs://')) {
    url = 'https://gateway.ipfs.io/ipfs/' + url.slice(7);
  }
  return url;
}

function adStyle(ad) {
  const s = {
    "left": ad.x * 10 + "px",
    "top": ad.y * 10 + "px",
    "width": ad.width * 10 + "px",
    "height": ad.height * 10 + "px",
  }
  return s;
}

export default {
  props: ["ad", "showNSFW"],
  computed: {
    shown() {
      return !this.ad.NSFW || this.showNSFW;
    },
    link() {
      if (!this.shown) return "";
      return this.ad.link;
    },
    title() {
      if (!this.shown) return "NSFW hidden";
      return this.ad.title;
    },
    image() {
      if (!this.shown) return ""
      return gatewayURL(this.ad.image);
    },
    style() {
      return adStyle(this.ad);
    },
  },
}
</script>
