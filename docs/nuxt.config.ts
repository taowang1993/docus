import { trimTrailingSlash } from '../layer/utils/meta'

const siteUrl = trimTrailingSlash(process.env.NUXT_SITE_URL || 'https://tockdocs.dev')

export default defineNuxtConfig({
  extends: ['tockdocs'],
  modules: ['@nuxtjs/i18n', 'nuxt-skill-hub', 'nuxt-studio'],
  site: {
    name: 'TockDocs',
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
      chunkSizeWarningLimit: 1200,
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
    title: 'TockDocs',
    description: 'Write beautiful docs with Markdown.',
    full: {
      title: 'TockDocs',
      description: 'Write beautiful docs with Markdown.',
    },
  },
  mcp: {
    name: 'TockDocs documentation',
    browserRedirect: '/docs/platform/en/ai/mcp',
  },
  skillHub: {
    skillName: 'nuxt',
    generationMode: 'prepare',
    targets: ['codex'],
  },
  studio: {
    route: '/admin',
    repository: {
      provider: 'github',
      owner: 'taowang1993',
      repo: 'tockdocs',
      rootDir: 'docs',
    },
  },
})
