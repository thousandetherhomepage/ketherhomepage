export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

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
     //XXX { 'http-equiv': "Content-Security-Policy", content: "default-src 'self'; script-src 'self' www.google-analytics.com *.infura.io 'sha256-+sCl9Qql+R8YqZtXTlyGMX9tUQ4mv7hOO5/UAaZ5g9Y='; connect-src *.infura.io storage.thousandetherhomepage.com http://127.0.0.1:8545/rpc/; style-src 'self' 'unsafe-inline'; img-src * data:;"},
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

  ssr: true
}
