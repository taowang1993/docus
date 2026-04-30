import { join } from 'node:path'
import { extendViteConfig, createResolver, useNuxt } from '@nuxt/kit'
import { getKnowledgeBaseEntrySlug } from './utils/docs'
import { getDocusContentConfiguration } from './utils/knowledge-bases'

const { resolve } = createResolver(import.meta.url)
const DevPort = 4987
const DevSiteUrl = process.env.NUXT_SITE_URL || `http://127.0.0.1:${DevPort}`

type DocusI18nOptions = { locales?: Array<string | { code: string }> }

export default defineNuxtConfig({
  modules: [
    resolve('./modules/config'),
    resolve('./modules/routing'),
    resolve('./modules/markdown-rewrite'),
    resolve('./modules/skills'),
    resolve('./modules/css'),
    () => {
      const nuxt = useNuxt()
      nuxt.options.icon ||= {}
      nuxt.options.icon.customCollections ||= []
      nuxt.options.icon.customCollections.push({
        prefix: 'custom',
        dir: join(nuxt.options.srcDir, 'assets/icons'),
      })
    },
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/robots',
    '@nuxtjs/mcp-toolkit',
    'nuxt-og-image',
    'nuxt-llms',
    () => {
      // Update @nuxt/content optimizeDeps options
      extendViteConfig((config) => {
        config.optimizeDeps ||= {}
        config.optimizeDeps.include ||= []
        config.optimizeDeps.include.push('@nuxt/content > slugify')
        config.optimizeDeps.include = config.optimizeDeps.include
          .map(id => id.replace(/^@nuxt\/content > /, 'docus > @nuxt/content > '))

        // Fix @vercel/oidc ESM export issue (transitive dep of @ai-sdk/gateway)
        // Only needed when AI assistant is enabled.
        if (process.env.AI_PROVIDER === 'vercel' || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
          config.optimizeDeps.include.push('@vercel/oidc')
          config.optimizeDeps.include = config.optimizeDeps.include.map(id =>
            id.replace(/^@vercel\/oidc$/, 'docus > @vercel/oidc'),
          )
        }
      })
    },
  ],
  devtools: {
    enabled: true,
  },
  css: [resolve('./app/assets/css/main.css')],
  content: {
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          langs: ['bash', 'diff', 'json', 'js', 'ts', 'html', 'css', 'vue', 'shell', 'mdc', 'md', 'yaml'],
        },
        remarkPlugins: {
          'remark-mdc': {
            options: {
              autoUnwrap: true,
            },
          },
        },
      },
    },
  },
  mdc: {
    highlight: {
      shikiEngine: 'javascript',
    },
  },
  runtimeConfig: {
    assistant: {
      provider: process.env.AI_PROVIDER || '',
      model: process.env.AI_MODEL || '',
      apiPath: '',
      mcpServer: '',
      aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY || '',
      openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
      openrouterModel: process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.5:free',
      deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
      deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      nvidiaApiKey: process.env.NVIDIA_API_KEY || '',
      nvidiaModel: process.env.NVIDIA_MODEL || 'minimaxai/minimax-m2.7',
      huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
      huggingfaceModel: process.env.HUGGINGFACE_MODEL || 'deepseek-ai/DeepSeek-V4-Pro:together',
      groqApiKey: process.env.GROQ_API_KEY || '',
      groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      githubToken: process.env.GITHUB_TOKEN || '',
      githubModel: process.env.GITHUB_MODEL || 'openai/gpt-5',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-live-preview',
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      cloudflareModel: process.env.CLOUDFLARE_MODEL || '@cf/google/gemma-4-26b-a4b-it',
    },
  },
  devServer: {
    host: process.env.NUXT_HOST || 'localhost',
    port: DevPort,
  },
  experimental: {
    asyncContext: true,
  },
  compatibilityDate: '2025-07-22',
  nitro: {
    prerender: {
      crawlLinks: true,
      failOnError: false,
      autoSubfolderIndex: false,
    },
    compatibilityDate: {
      // Don't generate observability routes for now
      vercel: '2025-07-14',
    },
  },
  hooks: {
    'nitro:config'(nitroConfig) {
      const nuxt = useNuxt()

      if (nuxt.options.dev) {
        return
      }

      const contentConfiguration = getDocusContentConfiguration(nuxt.options.rootDir)
      const i18nOptions = (nuxt.options as typeof nuxt.options & { i18n?: DocusI18nOptions }).i18n

      const routes: string[] = []

      if (contentConfiguration.mode === 'kb') {
        routes.push('/')
        routes.push(...contentConfiguration.knowledgeBases.map((knowledgeBase) => {
          const slug = getKnowledgeBaseEntrySlug(knowledgeBase)
          return slug.length > 0
            ? `/docs/${knowledgeBase.id}/${knowledgeBase.defaultLocale}/${slug.join('/')}`
            : `/docs/${knowledgeBase.id}/${knowledgeBase.defaultLocale}`
        }))
      }
      else if (!i18nOptions) {
        routes.push('/')
      }
      else {
        routes.push(...(i18nOptions.locales?.map((locale: string | { code: string }) => typeof locale === 'string' ? `/${locale}` : `/${locale.code}`) || []))
      }

      nitroConfig.prerender = nitroConfig.prerender || {}
      nitroConfig.prerender.routes = nitroConfig.prerender.routes || []
      nitroConfig.prerender.routes.push(...routes)
      nitroConfig.prerender.routes.push('/sitemap.xml')
    },
  },
  i18n: {
    defaultLocale: 'en',
  },
  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: resolve('./app/assets/icons'),
      },
    ],
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },
  llms: {
    domain: DevSiteUrl,
  },
  ogImage: {
    zeroRuntime: true,
  },
  robots: {
    groups: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: '/sitemap.xml',
  },
})
