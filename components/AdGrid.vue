<style lang="scss">
.adGrid {
  /* Checkerboard: */
  background-image: /* tint image */
    linear-gradient(to right, rgba(255,255,255, 0.97), rgba(255,255,255, 0.97)),
    /* checkered effect */
    linear-gradient(to right, black 50%, white 50%),
    linear-gradient(to bottom, black 50%, white 50%);
  background-blend-mode: normal, difference, normal;
  background-size: 20px 20px;
  /***/

  img, .nsfwAd, a div {
    position: absolute;
    display: block;
    overflow: hidden;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.7);
    white-space: nowrap;
    image-rendering: pixelated;
    outline: 2px solid rgba(0,0,0,0.1);
    outline-offset: -2px;
  }

  .nsfwAd {
    background: #000;
  }

  &.active img {
    box-shadow: 0px 0px 0px 1px rgba(255, 255, 255, 0.4) inset;
  }

  .previewAd {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.9);
    z-index: 5;
    outline: 20px solid rgba(0,0,0,0.4);
  }
  .previewAd.locked {
    background: #ffcc47;
  }
}
</style>

<template>
  <div :class="{ adGrid: true, active: !!$store.state.previewAd }" :style="gridStyle(prerendered)">
    <template v-for="ad in $store.state.ads">
      <a v-if="ad" href="ad.link" target="_blank" :key="ad.idx">
        <img v-if="loadRemoteImages" :src="image(ad)" :title="ad.title" :style="adStyle(ad)" @error="setBroken"/>
        <div v-else :title="ad.title" :style="adStyle(ad)"></div>
      </a>
    </template>
    <vue-draggable-resizable ref="draggable" :active="true" :minWidth="10" :minHeight="10"
      :x="$store.state.previewAd.x" :y="$store.state.previewAd.y"
      :w="80" :h="40" :grid="[10,10]" :parent="true"
      @dragstop="updatePreview" @resizestop="updatePreview"
      :draggable="!previewLocked" :resizable="!previewLocked" v-if="$store.state.previewAd" v-bind:class="{previewAd: true, locked: previewLocked}">
      <Buy :provider="provider" :contract="contract" :isReadOnly="isReadOnly" @buy="onBuy"></Buy>
    </vue-draggable-resizable>
  </div>
</template>

<script>
import Buy from './Buy.vue';
import VueDraggableResizable from 'vue-draggable-resizable';
import 'vue-draggable-resizable/dist/VueDraggableResizable.css';

const REPLACE_BROKEN_IMAGES = "/broken-image.png"; // Alternative: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
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
export default {
  props: ["provider", "contract", "isReadOnly", "showNSFW", "prerendered"],
  data() {
    return {
      previewLocked: false,
      loadRemoteImages: this.prerendered ? this.prerendered.loadRemoteImages : true,
    }
  },
  methods: {
    onBuy: function (ad) {
      this.previewLocked = true;
    },
    updatePreview(x, y, width, height) {
      const dragged = this.$refs.draggable;
      this.$store.commit('updatePreview', {
        'x': dragged.left,
        'y': dragged.top,
        'width': dragged.width,
        'height': dragged.height,
      });
    },
    gridStyle(config) {
      if (!config) return;
      return {
        'background-image': 'url(' + config.image + ')',
      }
    },
    setBroken(el) {
      el.src = REPLACE_BROKEN_IMAGES;
    },

    adStyle(ad) {
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
        "background": '#' + ad.owner.slice(-6) + 'cc'
      }
      return s;
    },
    image(ad) {
      //if (!this.shown) return "";
      const imageSrc = gatewayURL(ad.image);
      if (imageSrc === "") {
        //this.blank = true;
        if (ad.title) return imageSrc; // Blank image so it's transparent but title renders
        return REPLACE_BROKEN_IMAGES;
      }
      return imageSrc;
    },
  },
  components: {
    'vue-draggable-resizable': VueDraggableResizable,
    Buy,
  },
}
</script>
