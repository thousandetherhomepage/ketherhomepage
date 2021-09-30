<template>
  <a :href="link" target="_blank" :data-idx="ad.idx">
    <div v-if="skipImage" :style="style" :title="title" :class="classMap"></div>
    <img v-else :src="image" :style="style" :title="title" :class="classMap" @error="setBroken"/>
  </a>
</template>

<script>
function gatewayURL(url) {
  const u = url.trim().toLowerCase();
  if (!u) return "";
  if (u.startsWith('bzz://')) {
    url = 'http://swarm-gateways.net/bzz:/' + url.slice(6);
  } else if (u.startsWith('ipfs://')) {
    url = 'https://gateway.ipfs.io/ipfs/' + url.slice(7);
  } else if (u.startsWith('https://gateway.pinata.cloud/ipfs/')) { // People aren't paying for their pinata bandwidth...
    url = 'https://gateway.ipfs.io/ipfs/' + url.slice(34);
  } else if (u.startsWith('file:')) { // Disallowed by our CSP, but block it here too.
    return "";
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

function disallow(link) {
  // For now we are blacklisting for XSS. This is wrong, but we're in the process of building a whitelist that includes the interesting usecases we'd like to support (i.e. magnet links)
  // See https://github.com/thousandetherhomepage/ketherhomepage/issues/7 for more
  let sanitized = link.trim().toLowerCase();
  if (sanitized.startsWith('javascript:') || sanitized.startsWith('data:') || sanitized.startsWith('file:')) {
    return true;
  } else {
    return false;
  }
}

const REPLACE_BROKEN_IMAGES = "/broken-image.png"; // Alternative: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

export default {
  props: ["ad", "showNSFW", "skipImage"],
  data: () => {
    return {
      blank: false,
      brokenImage: "",
    };
  },
  computed: {
    shown() {
      return !this.ad.NSFW || this.showNSFW;
    },
    link() {
      if (!this.shown) return "";
      if (this.ad.link && disallow(this.ad.link)) return "";
      return this.ad.link;
    },
    title() {
      if (!this.shown) return "NSFW hidden";
      return this.ad.title;
    },
    image() {
      if (!this.shown) return "";
      const imageSrc = gatewayURL(this.ad.image);
      if (imageSrc === "" || imageSrc == this.brokenImage) {
        this.blank = true;
        if (this.ad.title) return imageSrc; // Blank image so it's transparent but title renders
        return REPLACE_BROKEN_IMAGES;
      }
      return imageSrc;
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
    setBroken(el) {
      this.brokenImage = el.target.src;
    },
  },
}
</script>
