import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import store from './store/store'
import App from './App.vue'
import Homepage from './Homepage.vue'

const Index = {
  template: `
    <div class="adGrid">
      <p style="text-align: center; padding: 2em; color: #666;">
        Waiting for Web3...
      </p>
    </div>
  `,
}

const routes = [
  { name: 'index', component: Index },
  { name: 'homepage', component: Homepage },
];

const router = new VueRouter({
  routes,
})

const vm = new Vue({
  el: '#app',
  store,
  router,
  render: h => h(App),
})

export { vm }
