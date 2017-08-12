<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{status}}</p>
  </div>
</template>

<script>
export default {
  props: ['web3'],
  data() {
    return {
      status: web3.eth.accounts[0],
    }
  },
}
</script>
