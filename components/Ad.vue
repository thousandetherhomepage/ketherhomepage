<template>
  <a :href="link" target="_blank">
    <div v-if="skipImage" :style="style" :title="title" :class="classMap"></div>
    <img v-else :src="image" :style="style" :title="title" :class="classMap" @error="placeholder"/>
  </a>
</template>

<style lang="scss">
</style>

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

function adStyle(ad, blank) {
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
  if (blank || !ad.image) {
    s["background"] = '#' + ad.owner.slice(-6) + 'cc';
  } else {
    s["background"] = '#fff';
  }
  return s;
}

function blacklist(link) {
  // For now we are blacklisting for XSS. This is wrong, but we're in the process of building a whitelist that includes the interesting usecases we'd like to support (i.e. magnet links)
  // See https://github.com/thousandetherhomepage/ketherhomepage/issues/7 for more
  let sanitized = link.trim().toLowerCase();
  if (sanitized.startsWith('javascript:') || sanitized.startsWith('data:')) {
    return true;
  } else {
    return false;
  }
}

export default {
  props: ["ad", "showNSFW", "skipImage"],
  data: () => {
    return {
      blank: false,
    };
  },
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
      if (!this.shown || this.blank) return "";
      return gatewayURL(this.ad.image);
    },
    style() {
      return adStyle(this.ad, this.blank);
    },
    classMap() {
      return {
        "nsfwAd": !this.shown,
        "blank": this.blank,
      };
    },
  },
  methods: {
    placeholder(el) {
      this.blank = true;
    },
  },
}
</script>
