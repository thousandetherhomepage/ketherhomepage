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

      for (let x=Number(x1); x<=x2; x++) {
        for (let y=Number(y1); y<=y2; y++) {
          if(grid[x][y]) return true;
        }
      }
      return false;
    },
    setBox: function(x1, y1, x2, y2) {
      for (let x=Number(x1); x<=x2; x++) {
        for (let y=Number(y1); y<=y2; y++) {
          grid[x][y] = true;
        }
      }
    },
  }
}

function filledGrid(grid, ads) {
  for(let ad of ads) {
    // Ad properties might be BigNumbers maybe which don't play well with +'s...
    // TODO: Fix this in a more general way?
    const x2 = Number(ad.x)+Number(ad.width)-1;
    const y2 = Number(ad.y)+Number(ad.height)-1;
    grid.setBox(ad.x, ad.y, x2, y2);
  }
  return grid;
}

function addAdOwned(state, ad) {
  if (state.ownedAds[ad.idx] === undefined) {
    state.numOwned += 1
    state.pixelsOwned += ad.width * ad.height * 100;
  }
  state.ownedAds[ad.idx] = ad
}

export default new Vuex.Store({
  state: {
    accounts: {},
    activeAccount: '',
    ads: [],
    adsPixels: 0,
    ownedAds: {},
    numOwned: 0,
    numNSFW: 0,
    pixelsOwned: 0,
    grid: null, // lazy load
    previewAd: null,
  },
  mutations: {
    setAccount(state, account) {
      state.activeAccount = account
    },
    addAccount(state, account) {
      if (state.activeAccount === '') state.activeAccount = account
      if (state.accounts[account]) return;
      state.accounts[account] = true

      for (let ad of state.ads) {
        if (ad.owner === account) addAdOwned(state, ad);
      }
    },
    updatePreview(state, ad) {
      state.previewAd = Object.assign(state.previewAd || {}, ad);
    },
    clearPreview(state) {
      state.previewAd = null;
    },
    clearAds(state) {
      state.ads = [];
      state.adsPixels = 0;
      state.numNSFW = 0;
      state.ownedAds = {};
      state.numOwned = 0;
      state.pixelsOwned = 0;
    },
    setAdsLength(state, len) {
      state.ads.length = len;
    },
    addAd(state, ad) {
      if (ad.idx > state.ads.length) {
        state.ads.length = ad.idx;
      }
      const existingAd = state.ads[ad.idx];
      if (existingAd !== undefined && existingAd.width !== undefined) {
        // Already counted, update values
        if (existingAd.NSFW && !ad.NSFW) {
          // Toggled from nsfw to not-nsfw
          state.numNSFW -= 1;
        }
        state.ads[ad.idx] = Object.assign(existingAd, ad);
        return;
      }

      // Is it a buy-only ad? Prefill default values
      if (ad.link === undefined) {
        ad = Object.assign({
          link: "",
          image: "",
          title: "",
          NSFW: false,
          forcedNSFW: false
        }, ad);
      }

      // Not counted yet
      if (ad.NSFW) {
        state.numNSFW += 1;
      }

      // Need to use splice rather than this.ads[i] to make it reactive
      state.ads.splice(ad.idx, 1, ad)
      if (state.accounts[ad.owner]) addAdOwned(state, ad);

      if (ad.width === undefined) {
        // This is just a publish event, will fill this out when it comes
        // back with the buy event (race condition)
        return;
      }

      state.adsPixels += ad.width * ad.height * 100;
      if (state.grid !== null) {
        // Fill grid cache if it's already loaded

        // Ad properties might be BigNumbers maybe which don't play well with +'s...
        // TODO: Fix this in a more general way?
        const x2 = Number(ad.x)+Number(ad.width)-1;
        const y2 = Number(ad.y)+Number(ad.height)-1;
        state.grid.setBox(ad.x, ad.y, x2, y2);
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
