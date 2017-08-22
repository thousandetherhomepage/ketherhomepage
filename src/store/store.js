import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

function grid_array2d(w, h) {
  const grid = [];
  grid.length = h;

  for (let x=0; x<w; x++) {
    const row = [];
    row.length = w;
    for(let y=0; y<h; y++) row[y] = 0;
    grid[x] = row;
  }

  return {
    set: function(x, y, value) {
      grid[x][y] = value;
    },
    get: function(x, y) {
      return grid[x][y];
    },
    checkBox: function(x1, y1, x2, y2) {
      // Returns true if has collision, inclusive.
      if (x1 < 0 || y1 < 0 || x2 >= w || y2 >= h) return true;

      for (let x=x1; x<=x2; x++) {
        for (let y=y1; y<=y2; y++) {
          if(grid[x][y]) return true;
        }
      }
      return false;
    },
    setBox: function(x1, y1, x2, y2) {
      for (let x=x1; x<=x2; x++) {
        for(let y=y1; y<=y2; y++) {
          grid[x][y] = true;
        }
      }
    },
  }
}

function filledGrid(grid, ads) {
  for(let ad of ads) {
    grid.setBox(ad.x, ad.y, ad.x+ad.width, ad.y+ad.height);
  }
  return grid;
}

export default new Vuex.Store({
  state: {
    accounts: {},
    activeAccount: '',
    ads: [],
    ownedAds: {},
    numOwned: 0,
    grid: null, // lazy load
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

      if (state.grid !== null) {
        // Fill grid cache if it's already loaded
        state.grid.setBox(ad.x, ad.y, ad.x+ad.width-1, ad.y+ad.height-1);
      }
    },
  },
  getters: {
    isColliding: (state, getters) => (x1, y1, x2, y2) => {
      if (state.grid === null) {
        // Compute grid and cache it
        state.grid = filledGrid(grid_array2d(100, 100), state.ads);
      }
      return state.grid.checkBox(x1, y1, x2, y2);
    }
  },
})
