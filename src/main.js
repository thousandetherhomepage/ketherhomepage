import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import store from './store/store'
import App from './App.vue'
import Buy from './views/Buy.vue'
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
  router: new VueRouter({
    routes: [
      { path: '/', name: 'index', component: Index },
      { path: '/buy', name: 'buy', component: Buy },
      { path: '/publish', name: 'publish', component: Publish },
    ],
  }),
})

export { vm }
