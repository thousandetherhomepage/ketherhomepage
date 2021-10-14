<template>
  <svg width="1000" height="1000" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#fff">
    <style>
      rect {
        stroke: #ccc;
        stroke-width: 0.1;
      }
    </style>

    <rect v-for="ad in $store.state.ads" v-if="ad !== undefined" :key="ad.idx" :x="ad.x" :y="ad.y" :width="ad.width" :height="ad.height" />
  </svg>
</template>
