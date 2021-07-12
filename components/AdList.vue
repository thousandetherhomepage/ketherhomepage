<style lang="scss">
.adList {
  background: #fff;

  img {
    vertical-align: middle;
    padding: 5px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    background: #ddd;
    margin-bottom: 0.5em;
  }
}
</style>

<template>
  <div class="adList">
    <p>Listing {{ num }} published ads and omitting {{ omitted }} empty ads.</p>
    <p><strong>Newest ad first:</strong></p>

    <ul v-for="ad in listAds" :key="ad.idx">
      <li>
        <Ad :showNSFW="showNSFW" :ad="ad"></Ad>
      </li>
    </ul>
  </div>
</template>

<script>
import Ad from './Ad.vue'

export default {
  props: ["showNSFW"],
  data() {
    return {
      omitted: 0,
      num: 0,
    }
  },
  computed: {
    listAds() {
      let omitted = 0, num = 0;
      const ads = [];
      for (let ad of this.$store.state.ads) {
        if (!ad || !ad.image) {
          omitted += 1;
        }
        num += 1;
        ads.push(ad);
      }
      ads.reverse();
      this.omitted = omitted;
      this.num = num;
      return ads;
    },
  },
  components: {
    Ad,
  },
}
</script>
