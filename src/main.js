import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

import App from './App.vue'
import Home from './views/Homepage.vue'

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
})

export { vm }
