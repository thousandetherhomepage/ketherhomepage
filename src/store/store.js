import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    accounts: {},
    activeAccount: '',
    ads: [],
    ownedAds: {},
    numOwned: 0,
  },
  mutations: {
    setAccount(state, account) {
      state.activeAccount = account
    },
    addAccount(state, account) {
      if (state.activeAccount === '') state.activeAccount = account
      state.accounts[account] = true
    },
    setAdsLength(state, len) {
      state.ads.length = len;
    },
    addAd(state, ad) {
      if (ad.idx > state.ads.length) {
        state.ads.length = ad.idx;
      }
      // Need to use splice rather than this.ads[i] to make it reactive
      state.ads.splice(ad.idx, 1, ad)
      let isOwned = state.accounts[ad.account]
      isOwned = true // XXX
      if (isOwned) {
        // Keep track of owned ads
        if (state.ownedAds[ad.idx] === undefined) state.numOwned += 1
        state.ownedAds[ad.idx] = ad
      }
    },
  },
})
