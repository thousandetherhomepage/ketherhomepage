import { ethers } from "ethers";

import { deployConfig, defaultNetwork, loadContracts } from "~/networkConfig";

export const state = () => {
  return {
    accounts: {},
    activeAccount: '',
    ads: [],
    adsPixels: 0,
    ownedAds: {},
    nftAds: {},
    halfWrapped: [],
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
    for (const ad of state.ads) {
      // TODO get our ads from NFT here as well
      if (normalizeAddr(ad.owner) === account) {
        addAdOwned(state, ad);
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
    state.nftAds = {};
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
    if (isSoldOut(state)) state.grid = null;
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
  },

  addHalfWrapped(state, {idx, account}) {
    state.halfWrapped.push({idx, account});
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
    return Object.keys(state.ownedAds).length;
  },
  numOwnedWrapped: state => {
    return Object.values(state.ownedAds).filter(ad => ad.wrapped).length;
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
    throw "XXX: This isn't done yet."; // Outputs don't match up yet
    const address = ethers.utils.getAddress(state.activeAccount); // Normalize to be consistant
    const salt = ethers.utils.sha256(address);

    const KNFT_address = ethers.utils.getAddress(KNFT.address);
    const KH_address = ethers.utils.getAddress(KH.address);

    const wrappedPayload = KH.interface.encodeFunctionData("setAdOwner", [idx, KNFT_address]);
    const bytecode = ethers.utils.hexlify(
      ethers.utils.concat([
        FlashEscrow_bytecode,
        ethers.utils.defaultAbiCoder.encode(['address', 'bytes'], [KH_address, wrappedPayload]),
      ]));
    return ethers.utils.getCreate2Address(KNFT_address, salt, ethers.utils.keccak256(bytecode));
  }
}

export const actions = {
  async nuxtServerInit({ dispatch }, { route }) {
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
    // Disable initState for now
    return;

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
    if (!state.activeAccount) commit('setAccount', account);
    if (state.accounts[account] === true) return; // Already added
    state.accounts[account] = true;
    commit('addAccount', account);
  },

  async detectHalfWrapped({ state, commit }, { ketherContract, nftContract, numBlocks }) {
    // FIXME: Probably should move this into Wrap or a ResumeWrap component, no need to pollute global state
    const account = state.activeAccount;
    if (!account) {
      console.error("Can't detect half-wrapped ads without an active account. Connect a wallet.");
      return;
    }
    if (numBlocks === undefined) {
      numBlocks = 10 * 60 * 24 * 30; // Look 30 days back
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
  // FIXME: This is redundant with wrapped eventToAd, we will need to do stuff
  // here to make it compatible with event-based loading later.
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
  // TODO will this break if we load stuff from events and not KetherView?
  if (adEvent.wrapped !== undefined) {
    ad.wrapped = adEvent.wrapped;
  } else {
    ad.wrapped = adEvent.owner === state.networkConfig.ketherNFTAddr;
  }
  let existingAd = state.ads[ad.idx];
  if (existingAd !== undefined && existingAd.width !== undefined) {
    // Already counted, update values
    return Object.assign({}, existingAd, ad);
  }

  // Add defaults to non-existing ad
  return Object.assign({
    link: "",
    image: "",
    title: "",
    NSFW: false,
    forceNSFW: false,
    wrapped: false,
  }, ad);
}

function appendAd(state, ad) {
  if (state.ads[ad.idx] !== undefined) {
    // Already exists, update
    this._vm.$set(state.ads, ad.idx, ad); // Force reactive
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


const FlashEscrow_bytecode = "0x608060405234801561001057600080fd5b506040516102db3803806102db83398101604081905261002f91610139565b6000826001600160a01b03168260405161004991906101ac565b6000604051808303816000865af19150503d8060008114610086576040519150601f19603f3d011682016040523d82523d6000602084013e61008b565b606091505b50509050806100b55760405162461bcd60e51b81526004016100ac906101bf565b60405180910390fd5b826001600160a01b0316ff5b60006100d46100cf84610216565b6101fa565b9050828152602081018484840111156100ec57600080fd5b6100f7848285610251565b509392505050565b805161010a816102c3565b92915050565b600082601f83011261012157600080fd5b81516101318482602086016100c1565b949350505050565b6000806040838503121561014c57600080fd5b600061015885856100ff565b92505060208301516001600160401b0381111561017457600080fd5b61018085828601610110565b9150509250929050565b6000610194825190565b6101a2818560208601610251565b9290920192915050565b60006101b8828461018a565b9392505050565b6020808252810161010a81601f81527f466c617368457363726f773a207461726765742063616c6c206661696c656400602082015260400190565b600061020560405190565b90506102118282610281565b919050565b60006001600160401b0382111561022f5761022f6102ad565b601f19601f83011660200192915050565b60006001600160a01b03821661010a565b60005b8381101561026c578181015183820152602001610254565b8381111561027b576000848401525b50505050565b601f19601f83011681018181106001600160401b03821117156102a6576102a66102ad565b6040525050565b634e487b7160e01b600052604160045260246000fd5b6102cc81610240565b81146102d757600080fd5b5056fe";
