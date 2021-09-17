import { ethers } from "ethers";

import { deployConfig, defaultNetwork, loadContracts } from "~/networkConfig";

export const state = () => {
  return {
    accounts: {},
    activeAccount: '',
    ads: [],
    adsPixels: 0,
    ownedAds: {},
    halfWrapped: {},
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

function normalizeAd(rawAd) {
  let normalized = {idx: undefined, owner: undefined, x: undefined, y: undefined, width: undefined, height: undefined, link: "", image: "", title: "", NSFW: false, forceNSFW: false, wrapped: false};
  for (const key in normalized) {
    const value = rawAd[key];
    if (value !== undefined) {
      if (value._isBigNumber) {
        normalized[key] = value.toNumber();
      } else {
        normalized[key] = value;
      }
   }
  }
  normalized.owner = normalizeAddr(normalized.owner);

  return normalized;
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
    for (const ad of state.ads) {
      // TODO get our ads from NFT here as well
      if (normalizeAddr(ad.owner) === account) {
        addAdOwned.call(this, state, ad);
      }
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
    for (const ad of ads) {
      appendAd.call(this, state, ad);
    }
    if (isSoldOut(state)) state.grid = null;
  },
  addAd(state, ad) {
    appendAd.call(this, state, ad);
  },

  updateAds(state, updates) {
    for (const {idx, update} of updates) {
      const ad = state.ads[idx];
      if (ad !== undefined) {
        let updatedAd = normalizeAd({...ad, ...update});
        this._vm.$set(state.ads, idx, updatedAd);
        if (state.accounts[updatedAd.owner]) {
          addAdOwned.call(this, state, updatedAd);
        } else if (state.accounts[ad.owner]) {
          removeAdOwned.call(this, state, ad.idx);
        }
      }
    }
  },

  setLoadedNetwork(state, {network, blockNumber, timestamp}) {
    state.offlineMode = blockNumber === 0;
    state.loadedNetwork = network;
    if (blockNumber !== 0) {
      state.loadedBlockNumber = blockNumber;
      state.loadedBlockTimestamp = timestamp;
    }
    console.info("Contract loaded", state.ads.length, "ads until block number", blockNumber, "from", network);
  },

  addHalfWrapped(state, {idx, account}) {
    this._vm.$set(state.halfWrapped, idx, account);
    this._vm.$delete(state.ownedAds, idx);
  },

  removeHalfWrapped(state, idx) {
    this._vm.$delete(state.halfWrapped, idx);
  },
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
  numWrapped: state => {
    return state.ads.filter(ad => ad.wrapped).length;;
  },
  numOwned: state => {
    return Object.keys({...state.ownedAds, ...state.halfWrapped}).length;
  },
  numOwnedWrapped: state => {
    return Object.values(state.ownedAds).filter(ad => ad.wrapped).length;
  },
  numHalfWrapped: state => {
    return Object.keys(state.halfWrapped).length;
  },
  numNSFW: state => {
    return state.ads.filter(ad => ad.NSFW).length;
  },
  isSoldOut: state => {
    return isSoldOut(state);
  },
  precomputeEscrow: state => ({ idx, KH, KNFT }) => {
    // This should only be used for client-side confirmation or recovery. For actual
    // predictedAddress derivation, use the on-chain contract function.
    const address = state.activeAccount; // Normalize to be consistant
    const salt = ethers.utils.soliditySha256(["address"], [address]);

    const wrappedPayload = KH.interface.encodeFunctionData("setAdOwner", [idx, KNFT.address]);
    const bytecodeHash = ethers.utils.solidityKeccak256(["bytes", "bytes"],
      [
        state.networkConfig.flashEscrowInitCode,
        ethers.utils.defaultAbiCoder.encode(["address", "bytes"], [KH.address, wrappedPayload])
      ]);
    return ethers.utils.getCreate2Address(KNFT.address, salt, bytecodeHash);
  }
}

export const actions = {
  async nuxtServerInit({ dispatch }, { route }) {
    // TODO this can be replaced with initState basically
    // TODO: make this preload both?
    // TODO: refactor this since it shares code with App.vue
    if (process.dev) return; // Don't preload ads in dev mode so we don't spam Infura 😥
    if (route.name !== 'index') return; // We only want to preload ads for the index route

    const web3Fallback = deployConfig[defaultNetwork].web3Fallback || "http://localhost:8545/";
    const provider = new ethers.providers.StaticJsonRpcProvider(web3Fallback);
    const activeNetwork = (await provider.getNetwork()).name;
    const networkConfig = deployConfig[activeNetwork];
    const contracts = loadContracts(networkConfig, provider)

    //await dispatch('loadState');
    await dispatch('loadAds', contracts);
  },

  async initState({ commit, state }, activeNetwork) {
    if (process.server) {
      // TODO: Server-side version of fetch
      return;
    }
    // Only load state on network change and on mainnet
    if (activeNetwork != "homestead" || activeNetwork == state.loadedNetwork) return;
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

  async loadAds({ commit, state, dispatch }, {contract, ketherNFT, ketherView}) {
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

    const loadFromKetherView = !!state.networkConfig.ketherViewAddr && state.loadedNetwork != activeNetwork; // Only use View contract if deployed & we haven't loaded already
    const loadFromEvents = true; // Okay to do it always? or should we do: state.loadedBlockNumber > 0
    if (loadFromKetherView) {
      console.log("Loading from KetherView");
      const loadKetherView = async (offset, limit, retries = 0) => {
        try {
          const ads = await ketherView.allAds(contract.address, ketherNFT.address, offset, limit);
          commit('importAds', ads);
        } catch (err) { // TODO: catch specific errors here
          if (retries < 1) {
            console.log("retrying loading of ", offset);
            await loadKetherView(offset, limit, retries + 1);
          }
          else {
            console.error("Exhausted retries for ", offset, err);
          }
        }
      }
      const limit = 165; // 10 queries to load 1621 ads on mainnet. 4 queries works too, but maybe flakey?
      const len = await contract.getAdsLength();
      commit('setAdsLength', len);
      let promises = [];
      for (let offset = 0; offset < len; offset+=limit) {
        promises.push(loadKetherView(offset, limit));
      }
      await Promise.all(promises);

    } else if (loadFromEvents) {
      // Skip loading and use event filter instead (does 4 query to eth_logs)
      const [buyEvents, publishEvents, setAdOwnerEvents, transferEvents] = await Promise.all([
        contract.queryFilter(contract.filters.Buy(), state.loadedBlockNumber),
        contract.queryFilter(contract.filters.Publish(), state.loadedBlockNumber),
        contract.queryFilter(contract.filters.SetAdOwner(), state.loadedBlockNumber),
        ketherNFT.queryFilter(ketherNFT.filters.Transfer(), state.loadedBlockNumber)
      ]);
      // load the Buy events first as they set the grid
      await dispatch('processBuyEvents', buyEvents);

      await Promise.all([
        dispatch('processPublishEvents', publishEvents),
        dispatch('processSetAdOwnerEvents', setAdOwnerEvents),
        dispatch('processTransferEvents', transferEvents)
      ]);

      console.info("Loaded additional", buyEvents.length + publishEvents.length + setAdOwnerEvents.length + transferEvents.length, "events since cached state from block number:", state.loadedBlockNumber);

    }
    commit('setLoadedNetwork', {network: activeNetwork, blockNumber: blockNumber, timestamp: blockTimestamp});

  },

  async addAccount({ commit, state }, account) {
    account = normalizeAddr(account);
    if (!state.activeAccount) commit('setAccount', account);
    if (state.accounts[account] === true) return; // Already added
    this._vm.$set(state.accounts, account, true);
    commit('addAccount', account);
  },

  async detectHalfWrapped({ state, commit }, { ketherContract, nftContract, numBlocks }) {
    // FIXME: Probably should move this into Wrap or a ResumeWrap component, no need to pollute global state
    const account = state.activeAccount;
    if (!account) {
      return;
    }
    if (numBlocks === undefined) {
      numBlocks = 10 * 60 * 24 * 7; // Look 7 days back
    }
    let ids = {};
    const eventFilter = [ ketherContract.filters.SetAdOwner() ];
    const events = await ketherContract.queryFilter(eventFilter, -numBlocks);
    for (const evt of events.reverse()) {
      // Only look at events from your account (alas not indexed so we can't filter above)
      if (normalizeAddr(evt.args.from) !== normalizeAddr(account)) continue;

      const idx = evt.args.idx.toNumber();
      if (ids[idx] !== undefined) continue;
      ids[idx] = true;
    }

    for (const idx in ids) {
      // Skip ads already wrapped successfully
      if (state.ads[idx].wrapped) continue;
      if (state.ownedAds[idx]) continue;

      try {
        // Confirm it's not minted on-chain (local state is stale)
        // Is there a better way to do this without throwing an exception?
        await nftContract.ownerOf(idx);
      } catch(err) {
        commit('addHalfWrapped', {idx: idx, account: account});
      }
    }
  },

  async processBuyEvents({ state, commit }, events) {
    const ads = events.map((e) => {
      const [idx, owner, x, y, width, height] = e.args;
      if (state.previewAd && Number(x*10) == state.previewAd.x && Number(y*10) == state.previewAd.y) {
        // Colliding ad purchased
        commit('clearPreview');
      }
      return {idx: idx.toNumber(), owner, x: x.toNumber(), y: y.toNumber(), width: width.toNumber(), height: height.toNumber()};
    });
    commit('importAds', ads)

    console.log(`[KetherHomepage] ${events.length} Buy event processed.`);
  },

  async processPublishEvents({ commit }, events) {
    const updates = events.map((e) => {
      const [idx, link, image, title, NSFW] = e.args;
      return {idx: idx.toNumber(), update: {link, image, title, NSFW}}
    });

    commit('updateAds', updates);
    console.log(`[KetherHomepage] ${events.length} Publish event processed.`);
  },

  async processSetAdOwnerEvents({ state, commit }, events) {
    const updates = events.map((e) => {
      const [idx, from, to] = e.args;
      if (normalizeAddr(to) === normalizeAddr(state.networkConfig.ketherNFTAddr)) {
        // Only record updated owner if it's not the NFT, otherwise we will get it from the transfer event.
        return {idx: idx.toNumber(), update: {wrapped: true}};
      } else if (normalizeAddr(from) === normalizeAddr(state.networkConfig.ketherNFTAddr)) {
        // Only record updated owner if it's not the NFT, otherwise we will get it from the transfer event.
        return {idx: idx.toNumber(), update: {wrapped: false}};
      } else {
        return {idx: idx.toNumber(), update: {owner: to, wrapped: false}};
      }
    });

    commit('updateAds', updates);
    console.log(`[KetherHomepage] ${events.length} SetAdOwner event processed.`);
  },

  async processTransferEvents({ commit }, events) {
    const updates = events.flatMap((e) => {
      const [_from, to, idx] = e.args;

      if (to !== '0x0000000000000000000000000000000000000000') {
        // Only record updated owner if it's not being burned, otherwise we will get it from the setAdOwner event.
        return {idx: idx.toNumber(), update: {owner: to, wrapped: true}};
      } else {
        // Skip event
        return [];
      }
    });

    commit('updateAds', updates);
    console.log(`[KetherNFT] ${events.length} Transfer event processed.`);
  },
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
  this._vm.$set(state.ownedAds, ad.idx, ad);
}

function removeAdOwned(state, idx) {
  this._vm.$delete(state.ownedAds, idx);
}

// TODO: this is only used when loading with N calls to the contract
// delete it now that we have loading via events and the view
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

function appendAd(state, rawAd) {
  let ad = normalizeAd(rawAd);

  if (state.accounts[ad.owner]) {
    addAdOwned.call(this, state, ad);
  }
  // If we haven't added this ad before and it's not a Publish event, count the pixels
  if (ad.width === undefined || state.ads[ad.idx] === undefined) {
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
  }

  // Force reactivity
  this._vm.$set(state.ads, ad.idx, ad);

  return state;
}

function isSoldOut(state) {
    return state.adsPixels === 1000000;
}
