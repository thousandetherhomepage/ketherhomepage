<style lang="scss">
.offline {
  background: #fffab2;
  width: 40em;
  padding: 5px 10px;
  margin: 1em 0em;
  font-size: 0.8rem;

  h3 {
    margin: 0.5em 0 0.5em 0;
    color: rgba(0, 0, 0, 0.5);
    text-transform: uppercase;
    font-size: 1em;
  }
  p {
    margin: 0.5em 0;
  }
}
</style>

<template>
  <div class="offline">
    <h3>Your Browser does not support Smart Contracts</h3>

    <p>
      You're seeing a read-only view of the Ethereum blockchain. In order to
      interact with it from your browser, download an Ethereum enabled browser
      like
      <a href="https://github.com/ethereum/mist/releases">Mist</a>,
      <a href="https://ethcore.io/parity.html">Parity</a>, or install the
      <a href="https://metamask.io">Metamask Chrome Extension</a>.
    </p>
  </div>
</template>
