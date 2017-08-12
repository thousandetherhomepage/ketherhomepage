import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

import App from './App.vue'
import Home from './views/Homepage.vue'

import Web3 from 'web3'

function getWeb3() {
  let web3 = window.web3;
  if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }
  try {
    if (web3.currentProvider.isConnected()) return web3;
  } catch (_) {
    return null;
  }
}


const Connecting = {
  template: '<div>Connecting...</div>',
}

const vm = new Vue({
  el: '#app',
  render: h => h(App),
  router: new VueRouter({
    routes: [
      { path: '/connecting', name: 'connecting', component: Connecting },
      { path: '/home', name: 'home', component: Home },
    ],
  }),
  data() {
    return {
      'web3': getWeb3(),
    }
  },
  created() {
    if (!this.web3) {
        this.$router.push({ name: 'connecting' })
    }

    const interval = setInterval(function() {
      // Waiting for web3
      this.web3 = getWeb3()
      if (this.web3) {
        clearInterval(interval)
        this.$router.push({ name: 'home' })
      }
    }.bind(this), 500);
  },
})

export { vm }
