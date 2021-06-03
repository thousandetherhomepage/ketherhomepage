import { ethers } from "ethers";

import { deployConfig, defaultNetwork } from "~/networkConfig";
import contractJSON from "~/build/contracts/KetherHomepage.json";

export const state = () => ({
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
  gridVis: true,
  loadedNetwork: null,
})

export const strict = false; // 😭 Publish preview mutates ads, and it's too annoying to fix rn.

function normalizeAddr(addr) {
  if (!addr) return addr;
  return addr.toLowerCase();
}

export const mutations = {
  initGrid(state) {
    if (state.grid === null) {
      // Compute grid and cache it
      state.grid = filledGrid(grid_array2d(100, 100), state.ads);
    }
  },
  setAccount(state, account) {
    account = normalizeAddr(account);

    state.activeAccount = account;
  },
  addAccount(state, account) {
    account = normalizeAddr(account);

    if (state.activeAccount === '') state.activeAccount = account;
    if (state.accounts[account]) return;
    state.accounts[account] = true;

    for (let ad of state.ads) {
      if (normalizeAddr(ad.owner) === normalizeAddr(account)) addAdOwned(state, ad);
    }
  },
  updatePreview(state, ad) {
    state.gridVis = true; // Buy button forces grid view
    state.previewAd = Object.assign(state.previewAd || {}, ad);
  },
  clearPreview(state) {
    state.previewAd = null;
  },
  clearAds(state) {
    state.grid = null;
    state.ads = [];
    state.adsPixels = 0;
    state.numNSFW = 0;
    state.ownedAds = {};
    state.numOwned = 0;
    state.pixelsOwned = 0;
  },
  setVis(state, vis) {
    // Valid values: 'grid' and 'list', default to 'grid'
    state.gridVis = vis !== 'list';
  },
  setAdsLength(state, len) {
    state.ads.length = len;
  },
  addAd(state, ad) {
    if (ad.owner !== undefined) {
      ad.owner = normalizeAddr(ad.owner);
    }

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
      // If the grid is already cached, update to include new ad.

      // Ad properties might be BigNumbers maybe which don't play well with +'s...
      // TODO: Fix this in a more general way?
      const x2 = Number(ad.x) + Number(ad.width) - 1;
      const y2 = Number(ad.y) + Number(ad.height) - 1;
      state.grid.setBox(ad.x, ad.y, x2, y2);
    }
  },

  setLoadedNetwork(state, network) {
    state.loadedNetwork = network;
  }
}

export const getters = {
  isColliding: (state, getters) => (x1, y1, x2, y2) => {
    if (state.grid === null) {
      throw "state.grid not initialized"
    }
    return state.grid.checkBox(x1, y1, x2, y2);
  }

}

export const actions = {
  async nuxtServerInit({ state, dispatch }) {
    // TODO: make this preload both?
    // TODO: refactor this since it shares code with App.vue
    const web3Fallback = deployConfig[defaultNetwork].web3Fallback || "http://localhost:8545/";
    const provider = new ethers.providers.JsonRpcProvider(web3Fallback);
    const activeNetwork = (await provider.getNetwork()).name;
    const networkConfig = deployConfig[activeNetwork];
    const contract = new ethers.Contract(networkConfig.contractAddr, contractJSON.abi, provider);
    await dispatch('loadAds', contract);
  },

  async loadAds({ commit, state }, contract) {
    // TODO: we can optimize this by only loading from a blockNumber
    const activeNetwork = (await contract.provider.getNetwork()).name;
    if (state.loadedNetwork != activeNetwork) {
      commit('clearAds', contract);
      commit('initGrid', contract);
    }

    // TODO: error handling?
    const numAds = await contract.getAdsLength();
    commit('setAdsLength', numAds);
    const ads = [...Array(numAds.toNumber()).keys()].map(i => contract.ads(i));
    for await (const [i, ad] of ads.entries()) {
      commit('addAd', toAd(i, await ad));
    }
    commit('setLoadedNetwork', activeNetwork);
  }
}

// TODO: Rewrite this into a proper class thing or something, so that there's fewer warnings
function grid_array2d(w, h) {
  const grid = [];
  grid.length = h;

  for (let x = 0; x < w; x++) {
    const row = [];
    row.length = w;
    for (let y = 0; y < h; y++) row[y] = 0;
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

      for (let x = Number(x1); x <= x2; x++) {
        for (let y = Number(y1); y <= y2; y++) {
          if (grid[x][y]) return true;
        }
      }
      return false;
    },
    setBox: function(x1, y1, x2, y2) {
      for (let x = Number(x1); x <= x2; x++) {
        for (let y = Number(y1); y <= y2; y++) {
          grid[x][y] = true;
        }
      }
    },
  }
}

function filledGrid(grid, ads) {
  for (let ad of ads) {
    // Ad properties might be BigNumbers maybe which don't play well with +'s...
    // TODO: Fix this in a more general way?
    const x2 = Number(ad.x) + Number(ad.width) - 1;
    const y2 = Number(ad.y) + Number(ad.height) - 1;
    grid.setBox(ad.x, ad.y, x2, y2);
  }
  return grid;
}

function addAdOwned(state, ad) {
  if (state.ownedAds[ad.idx] === undefined) {
    state.numOwned += 1
    state.pixelsOwned += ad.width * ad.height * 100;
  }
  state.ownedAds[ad.idx] = ad;
}

function toAd(i, r) {
  return {
    idx: i,
    owner: r[0].toLowerCase(),
    x: r[1],
    y: r[2],
    width: r[3],
    height: r[4],
    link: r[5] || "",
    image: r[6] || "",
    title: r[7],
    NSFW: r[8] || r[9],
    forcedNSFW: r[9],
  }
}
