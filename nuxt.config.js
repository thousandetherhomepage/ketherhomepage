import fs from 'fs';

export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  // NOTE this doesn't work in Firefox:
  // Metamask + Firefox is broken with CSP when served via header: https://github.com/MetaMask/metamask-extension/issues/3133#issuecomment-759116472
  // We only serve via header under local development, when we serve production the CSP header is set by the

  render: {
    // These csp values are only set in headers when served by nuxt. We need
    // these because nuxt serves an extra <script>window.__NUXT__... element
    // which is non-deterministic.
    csp: {
      addMeta: false, // This does not do what you'd think 🙃
      reportOnly: false,
      policies: {
        'upgrade-insecure-requests': '',
        'default-src': ["'self'"],
        'script-src': ["'self'", '*.infura.io'],
        'connect-src': ["'self'", '*.infura.io', '*.walletconnect.com', 'wss://*.walletconnect.com'],
        'frame-src': ["'self'", '*.walletconnect.com'],
        'style-src': ["'self'", "'unsafe-inline'"], // Would be nice to have the hashes built here - see https://github.com/nuxt/nuxt.js/pull/8022/files
        'img-src': ['*', 'data:']
      }
    }
  },

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'The Thousand Ether Homepage',
    htmlAttrs: {
      lang: 'en',
      prefix: 'og: http://ogp.me/ns#'
    },
    meta: [
      { charset: 'utf-8' },
      //{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: "The Million Dollar Homepage as an Ethereum Smart Contract and DApp: A glimpse into what the future of web integrated with modern blockchain technology could be like." },
      process.env.NODE_ENV === 'production' ? { 'http-equiv': "Content-Security-Policy", content: "upgrade-insecure-requests; default-src 'self'; script-src 'self' 'self' *.infura.io; connect-src 'self' *.infura.io *.walletconnect.com wss://*.walletconnect.com; style-src 'self' 'unsafe-inline'; img-src * data:; frame-src 'self' '*.walletconnect.com'"} : {},
      { name: "twitter:card", content: "summary"},
      { property: "og:url", content: "https://thousandetherhomepage.com"},
      { property: "og:title", content: "The Thousand Ether Homepage" },
      { property: "og:description", content: "The Million Dollar Homepage as an Ethereum Smart Contract and DApp: A glimpse into what the future of web integrated with modern blockchain technology could be like." },
      { property: "og:image", content: "https://storage.thousandetherhomepage.com/mainnet.png" }

    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/teh-64px.png' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    {src: '~/plugins/address.js'}
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    //babel: {
    //  plugins: [
    //   '@babel/plugin-proposal-nullish-coalescing-operator',
    //   '@babel/plugin-proposal-optional-chaining',
    //  ],
    //},
    
    //transpile: [
    //  '@walletconnect/ethereum-provider',
    //  '@walletconnect/modal',
    //  'valtio',
    //],

    // https://github.com/WalletConnect/walletconnect-monorepo/issues/1349 ??
    extend(config, ctx) {
      config.module.rules.push({
        test: /node_modules\/@walletconnect/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      });
      config.module.rules.push({
        test: /node_modules\/unstorage/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      });
      config.module.rules.push({
        test: /node_modules\/valtio/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['babel-plugin-transform-vite-meta-env'],
          },
        },
      });
    }
  },

  hooks: {
    'vue-renderer:ssr:context'({ nuxt }) {
      // Serialize state after rendering index (only during generate)
      if (process.env.NODE_ENV !== 'production') return;
      if (nuxt.routePath !== '/') return;
      fs.writeFileSync('static/initState.json', JSON.stringify(nuxt.state));
      console.info("Saved initial state: static/initState.json");
    }
  },

  ssr: true
};
