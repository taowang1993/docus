const siteUrl = process.env.NUXT_SITE_URL || 'https://docus.dev'

export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['@nuxtjs/i18n', 'nuxt-studio'],
  site: {
    name: 'Docus',
    url: siteUrl,
  },
  mdc: {
    highlight: {
      shikiEngine: 'javascript',
    },
  },
  compatibilityDate: '2025-07-18',
  vite: {
    build: {
      sourcemap: false,
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: [{
      code: 'en',
      name: 'English',
    }, {
      code: 'fr',
      name: 'Français',
    }],
  },
  llms: {
    domain: siteUrl,
    title: 'Docus',
    description: 'Write beautiful docs with Markdown.',
    full: {
      title: 'Docus',
      description: 'Write beautiful docs with Markdown.',
    },
  },
  mcp: {
    name: 'Docus documentation',
    browserRedirect: '/en/ai/mcp',
  },
  studio: {
    route: '/admin',
    repository: {
      provider: 'github',
      owner: 'nuxt-content',
      repo: 'docus',
      rootDir: 'docs',
    },
  },
})
