<template>
  <header>
  <h1>
    <NuxtLink v-if="$nuxt.$route.name != 'index'" to="/">The Thousand Ether Homepage</NuxtLink>
    <span v-else>The Thousand Ether Homepage</span>
  </h1>
    <h2>1,000,000 pixels &middot; 0.001 ETH per pixel &middot; Own a piece of blockchain history!</h2>
    <slot></slot>
  </header>
</template>