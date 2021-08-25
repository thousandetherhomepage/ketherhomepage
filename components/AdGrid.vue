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
  }

  .blank {
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
      <Ad :showNSFW="showNSFW" :ad="ad" :skipImage="!loadRemoteImages" v-if="ad" :key="ad.idx"></Ad>

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
import Ad from './Ad.vue';
import Buy from './Buy.vue';
import VueDraggableResizable from 'vue-draggable-resizable';
import 'vue-draggable-resizable/dist/VueDraggableResizable.css';


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
  },
  components: {
    'vue-draggable-resizable': VueDraggableResizable,
    Ad,
    Buy,
  },
}
</script>
