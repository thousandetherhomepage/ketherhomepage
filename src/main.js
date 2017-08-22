import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import store from './store/store'
import App from './App.vue'
import Publish from './views/Publish.vue'

const Index = {
  template: `
    <p>A million pixels for a thousand ether.</p>
  `,
}

const vm = new Vue({
  el: '#app',
  store,
  render: h => h(App),
})

export { vm }
