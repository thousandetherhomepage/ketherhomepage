<style lang="scss">
.adList {
  background: #fff;

  img {
    vertical-align: middle;
    padding: 5px;
  }

  li {
    background: #ddd;
    margin-bottom: 0.5em;
  }
}
</style>

<template>
  <div class="adList">
    <ul v-for="ad in $store.state.ads" v-if="ad && ad.image">
      <li>
        <Ad :showNSFW="showNSFW" :ad="ad"></Ad>
      </li>
    </ul>
    <p>Empty ads are omitted in list view.</p>
  </div>
</template>

<script>
import Ad from './Ad.vue'

export default {
  props: ["showNSFW"],
  components: {
    Ad,
  },
}
</script>
