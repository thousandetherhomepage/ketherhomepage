import { ethers } from "ethers";

import { deployConfig, defaultNetwork } from "~/networkConfig";
import contractJSON from "~/artifacts/contracts/KetherHomepage.sol/KetherHomepage.json";

export const state = () => {
  return {
    accounts: {},
    activeAccount: '',
    ads: [],
    adsPixels: 0,
    ownedAds: {},
    nftAds: {},
    pixelsOwned: 0,
    grid: null, // lazy load
    previewAd: null,
    gridVis: true,
    loadedNetwork: null,
    loadedBlockNumber: 0,
    loadedBlockTimestamp: 0,
    networkConfig: {}, // deployConfig of active network, set during clearAds
    offlineMode: false,
  }
};


export const strict = false; // 😭 Publish preview mutates ads, and it's too annoying to fix rn.

function normalizeAddr(addr) {
  if (!addr) return addr;
  return addr.toLowerCase();
}

export const mutations = {
  loadState(state, loadState) {
    for (const [k, v] of Object.entries(loadState)) {
      state[k] = v;
    }
  },
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
    for (let ad of state.ads) {
      if (normalizeAddr(ad.owner) === normalizeAddr(account)) addAdOwned(state, ad);
    }
    state.ownedAds = Object.assign({}, state.ownedAds);
  },
  updatePreview(state, ad) {
    state.gridVis = true; // Buy button forces grid view
    state.previewAd = Object.assign(state.previewAd || {}, ad);
  },
  clearPreview(state) {
    state.previewAd = null;
  },
  clearAds(state, networkConfig) {
    state.grid = null;
    state.ads = [];
    state.adsPixels = 0;
    state.ownedAds = {};
    state.nftAds = {};
    state.numOwned = 0;
    state.pixelsOwned = 0;
    state.loadedBlockNumber = 0;
    state.networkConfig = networkConfig;
  },
  setVis(state, vis) {
    // Valid values: 'grid' and 'list', default to 'grid'
    state.gridVis = vis !== 'list';
  },
  setAdsLength(state, len) {
    state.ads.length = len;
  },
  importAds(state, ads) {
    // Bulk version of addAd
    for (const adOrEvent of ads) {
      const ad = eventToAd(state, adOrEvent)
      appendAd.call(this, state, ad);
    }
  },
  addAd(state, {idx, owner, x, y, width, height, link="", image="", title="", NSFW=false, forceNSFW=false}) {
    const ad = eventToAd(state, {idx, owner, x, y, width, height, link, image, title, NSFW, forceNSFW})
    appendAd.call(this, state, ad);
  },

  setLoadedNetwork(state, {network, blockNumber, timestamp}) {
    state.offlineMode = blockNumber === 0;
    state.loadedNetwork = network;
    if (blockNumber !== 0) {
      state.loadedBlockNumber = blockNumber;
      state.loadedBlockTimestamp = timestamp;
    }
    console.info("Contract loaded", state.ads.length, "ads until block number", blockNumber, "from", network);
  }
}

export const getters = {
  isColliding: (state) => (x1, y1, x2, y2) => {
    if (isSoldOut(state)) return true; // Sold out, always colliding
    if (state.grid === null) {
      throw "state.grid not initialized"
    }
    // Returns true if has collision, inclusive.
    if (x1 < 0 || y1 < 0 || x2 >= 100 || y2 >= 100) return true;

    for (let x = Number(x1); x <= x2; x++) {
      for (let y = Number(y1); y <= y2; y++) {
        if (state.grid[x][y]) return true;
      }
    }
    return false;
  },
  numAds: state => {
    return state.ads.length;
  },
  numOwned: state => {
    return Object.keys(state.ownedAds).length;
  },
  numNSFW: state => {
    return state.ads.filter(ad => ad.NSFW).length;
  },
  isSoldOut: state => {
    return isSoldOut(state);
  }
}

export const actions = {
  async nuxtServerInit({ dispatch }, { route }) {
    // TODO: make this preload both?
    // TODO: refactor this since it shares code with App.vue
    if (process.dev) return; // Don't preload ads in dev mode so we don't spam Infura 😥
    if (route.name !== 'index') return; // We only want to preload ads for the index route

    const web3Fallback = deployConfig[defaultNetwork].web3Fallback || "http://localhost:8545/";
    const provider = new ethers.providers.JsonRpcProvider(web3Fallback);
    const activeNetwork = (await provider.getNetwork()).name;
    const networkConfig = deployConfig[activeNetwork];
    const contract = new ethers.Contract(networkConfig.contractAddr, contractJSON.abi, provider);

    //await dispatch('loadState');
    await dispatch('loadAds', contract);
  },

  async initState({ commit }) {
    if (process.server) {
      // TODO: Server-side version of fetch
      return;
    }

    let s = await window.fetch('/initState.json').then(res => res.json())
    s.offlineMode = true;
    if (isSoldOut(s)) s.grid = null; // Skip grid
    commit('loadState', s);
    console.log('Loaded cached initial state');
  },

  async reset({ commit, state }, activeNetwork) {
    console.info("Active network mismatch, resetting:", state.loadedNetwork, "!=", activeNetwork);
    commit('clearAds', deployConfig[activeNetwork]);
    commit('initGrid');
  },

  async loadAds({ commit, state, dispatch }, contract) {
    // TODO: we can optimize this by only loading from a blockNumber
    let activeNetwork;
    let latestBlock = {number: 0, timestamp: 0};
    try {
      activeNetwork = (await contract.provider.getNetwork()).name;
      latestBlock = await contract.provider.getBlock('latest');
    } catch (e) { // TODO: More specific exception
      console.error("Failed to get provider network, switching to offline mode:", e);
      activeNetwork = state.loadedNetwork;
    }
    const blockNumber = latestBlock.number;
    const blockTimestamp = latestBlock.timestamp;

    if (state.loadedNetwork !== activeNetwork) {
      await dispatch('reset', activeNetwork);
    }

    const loadFromEvents = true; // Okay to do it always? or should we do: state.loadedBlockNumber > 0

    if (loadFromEvents) {
      // Skip loading and use event filter instead (does 1 query to eth_logs)
      const eventFilter= [ contract.filters.Buy(), contract.filters.Publish(), contract.filters.SetAdOwner() ];
      const events = await contract.queryFilter(eventFilter, state.loadedBlockNumber);
      commit('importAds', events.map(evt => Object.assign({}, evt.args))); // Clone args and import them

      console.info("Loaded additional", events.length, "events since cached state from block number:", state.loadedBlockNumber);
    } else {
      // Load fresh from the contract (does N queries to eth_call)
      const numAds = await contract.getAdsLength();
      commit('setAdsLength', numAds);
      const ads = [...Array(numAds.toNumber()).keys()].map(i => contract.ads(i));
      for await (const [i, ad] of ads.entries()) {
        commit('addAd', toAd(i, await ad));
      }
    }

    commit('setLoadedNetwork', {network: activeNetwork, blockNumber: blockNumber, timestamp: blockTimestamp});
  },

  async addAccount({ commit, state }, account) {
    account = normalizeAddr(account);
    if (state.activeAccount === '') commit('setAccount', account);
    if (state.accounts[account] === true) return; // Already added
    state.accounts[account] = true;
    commit('addAccount', account);
  }
}

//// Helpers

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
  return grid;
}

function filledGrid(grid, ads) {
  for (let ad of ads) {
    // Ad properties might be BigNumbers maybe which don't play well with +'s...
    // TODO: Fix this in a more general way?
    const x2 = Number(ad.x) + Number(ad.width) - 1;
    const y2 = Number(ad.y) + Number(ad.height) - 1;
    setBox(grid, ad.x, ad.y, x2, y2);
  }
  return grid;
}

function setBox(grid, x1, y1, x2, y2) {
  for (let x = Number(x1); x <= x2; x++) {
    for (let y = Number(y1); y <= y2; y++) {
      grid[x][y] = 1;
    }
  }
}

function addAdOwned(state, ad) {
  if (state.ownedAds[ad.idx] === undefined) {
    state.pixelsOwned += ad.width * ad.height * 100;
  }
  state.ownedAds[ad.idx] = ad;
}

function addNFTAd(state, ad) {
  ad.isNFT = true;
  state.nftAds[ad.idx] = ad;

  // TODO: Check if NFT is owned, addAdOwned if it is.
}

function toAd(i, r) {
  return {
    idx: i,
    owner: r[0].toLowerCase(),
    x: Number(r[1]),
    y: Number(r[2]),
    width: Number(r[3]),
    height: Number(r[4]),
    link: r[5] || "",
    image: r[6] || "",
    title: r[7],
    NSFW: r[8] || r[9],
    forceNSFW: r[9],
  }
}

function eventToAd(state, adEvent) {
  let ad = {
    idx: adEvent.idx.toNumber !== undefined ? adEvent.idx.toNumber() : adEvent.idx
  }

  if (adEvent.owner !== undefined) {
    ad.owner = normalizeAddr(adEvent.owner);
  }
  if (adEvent.to !== undefined) { // Convert SetAdOwner event
    ad.owner = normalizeAddr(adEvent.to);
  }
  if (adEvent.x !== undefined) { // Normalize ints for Buy event
    ad.x = Number(adEvent.x);
    ad.y = Number(adEvent.y);
    ad.width = Number(adEvent.width);
    ad.height = Number(adEvent.height);
  }
  if (adEvent.link !== undefined) {
    ad.link = adEvent.link;
    ad.image = adEvent.image;
    ad.title = adEvent.title;
  }
  if (adEvent.forceNSFW === true) { // Force NSFW
    ad.NSFW = true;
  } else if (adEvent.NSFW !== undefined) {
    ad.NSFW = adEvent.NSFW;
  }

  let existingAd = state.ads[ad.idx];
  if (existingAd !== undefined && existingAd.width !== undefined) {
    // Already counted, update values
    return Object.assign(existingAd, ad);
  }

  // Add defaults to non-existing ad
  return Object.assign({
    link: "",
    image: "",
    title: "",
    NSFW: false,
    forceNSFW: false,
  }, ad);
}

function appendAd(state, ad) {
  if (state.ads[ad.idx] !== undefined) {
    // Already exists, update
    this._vm.$set(state, ad.idx, ad); // Force reactive
    return;
  }

  // Need to use splice rather than this.ads[i] to make it reactive
  state.ads.splice(ad.idx, 1, ad);
  if (state.accounts[ad.owner]) {
    addAdOwned(state, ad);
  } else if (ad.owner === state.networkConfig.ketherNFTAddr) {
    addNFTAd(state, ad);
  }

  if (ad.width === undefined) {
    // This is just a publish event, will fill this out when it comes
    // back with the buy event (race condition)
    return;
  }

  // Count pixels
  state.adsPixels += ad.width * ad.height * 100;
  if (state.grid !== null) {
    // If the grid is already cached, update to include new ad.

    // Ad properties might be BigNumbers maybe which don't play well with +'s...
    // TODO: Fix this in a more general way?
    const x1 = Number(ad.x);
    const x2 = x1 + Number(ad.width) - 1;
    const y1 = Number(ad.y);
    const y2 = y1 + Number(ad.height) - 1;
    setBox(state.grid, x1, y1, x2, y2);
  }

  return state;
}

function isSoldOut(state) {
    return state.adsPixels === 1000000;
}
