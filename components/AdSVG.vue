<template>
  <svg width="1000" height="1000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#fff">
    <style>
        rect {
            stroke: #fff;
            stroke-width: 0.1;
        }
    </style>

    <rect v-for="ad in $store.state.ads" v-if="ad !== undefined" :key="ad.idx" :x="ad.x" :y="ad.y" :width="ad.width" :height="ad.height" :fill="mono(ad.idx)" />
  </svg>
</template>

<script>
export default {
  methods: {
    'rainbow': (idx) => { return '#' + Number(idx * 10000).toString(16).padStart(6, 'f'); },
    'mono': (idx) => {
      const color = Math.round(50 + 155 * idx/1621).toString(16).padStart(2, '0');
      return '#' + color.repeat(3);
    },
  }
}
</script>
