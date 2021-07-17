import fs from 'fs';

export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  render: {
    // These csp values are only set in headers when served by nuxt
    csp: {
      addMeta: false, // This does not do what you'd think 🙃
      reportOnly: false,
      policies: {
        'default-src': ["'self'"],
        'script-src': ["'self'", '*.infura.io'],
        'connect-src': ["'self'", '*.infura.io'],
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
      // FIXME: is copypasta from the network tab -- the csp is generated as a header when you have mode: server, but it's not put in the HTML by nuxt correctly ¯\_(🤷)_/¯ 😥😥😥😥
      // script-src hash represents the window.__NUXT__ <script> element. It should not change thanks to vue-renderer:ssr:context hook below.
      { 'http-equiv': "Content-Security-Policy", content: "default-src 'self'; script-src 'sha256-UZWx7PcANLfxqg+tuiEQiu6bijg7tUWbRmoVtInX1K4=' 'self' 'self' *.infura.io; connect-src 'self' *.infura.io; style-src 'self' 'unsafe-inline'; img-src * data:"},
      { name: "twitter:card", content: "summary"},
      { property: "og:url", content: "https://thousandetherhomepage.com"},
      { property: "og:title", content: "The Thousand Ether Homepage" },
      { property: "og:description", content: "The Million Dollar Homepage as an Ethereum Smart Contract and DApp: A glimpse into what the future of web integrated with modern blockchain technology could be like." },
      { property: "og:image", content: "https://storage.thousandetherhomepage.com/mainnet.png" }

    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/icon-32px.png' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
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
  },

  hooks: {
    // TODO: Switch this to 'vue-renderer:ssr:context' when it's actually called during generate
    'render:routeContext'(context) {
      // Serialize state after rendering index (only during generate)
      if (!context.serverRendered) return;
      if (context.routePath !== '/') return;
      fs.writeFileSync('static/initState.json', JSON.stringify(context.state));
      console.info("Saved initial state: static/initState.json");
    }
  },

  ssr: true
}
