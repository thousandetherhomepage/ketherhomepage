<template>
  <a :href="link" target="_blank">
    <div v-if="skipImage" :style="style" :title="title" :class="{ nsfwAd: !shown }" />
    <img v-else :src="image" :style="style" :title="title" :class="{ nsfwAd: !shown }" />
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
  if (!ad.width) {
    return {
      "display": "none",
    }
  }
  const s = {
    "left": ad.x * 10 + "px",
    "top": ad.y * 10 + "px",
    "width": ad.width * 10 + "px",
    "height": ad.height * 10 + "px",
  }
  if (!ad.image) {
    s["background"] = "rgba(255, 255, 255, 0.5)";
  }
  return s;
}

function blacklist(link) {
  // For now we are blacklisting for XSS. This is wrong, but we're in the process of building a whitelist that includes the interesting usecases we'd like to support (i.e. magnet links)
  // See https://github.com/thousandetherhomepage/ketherhomepage/issues/7 for more

  let sanitized =  link.trim().toLowerCase();
  if (sanitized.startsWith('javascript:') || sanitized.startsWith('data:')) {
    return true;
  } else {
    return false;
  }
}

export default {
  props: ["ad", "showNSFW", "skipImage"],
  computed: {
    shown() {
      return !this.ad.NSFW || this.showNSFW;
    },
    link() {
      if (!this.shown) return "";
      if (this.ad.link && blacklist(this.ad.link)) return "";
      return this.ad.link;
    },
    title() {
      if (!this.shown) return "NSFW hidden";
      return this.ad.title;
    },
    image() {
      if (!this.shown) return "";
      return gatewayURL(this.ad.image);
    },
    style() {
      return adStyle(this.ad);
    },
  },
}
</script>
