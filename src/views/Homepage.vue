<template>
  <div>
    <h2>Million dollar homepage here.</h2>

    <p>Ready: {{accounts}}</p>
  </div>
</template>

<script>
export default {
  props: ['web3'],
  data() {
    return {
      accounts: 'foo',
      //accounts: this.web3.eth.accounts,
    }
  },
}
</script>
