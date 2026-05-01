import { createResolver, defineNuxtModule, logger } from '@nuxt/kit'
import { defu } from 'defu'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { inferSiteURL, getPackageJsonMetadata } from '../utils/meta'
import { getGitBranch, getGitEnv, getLocalGitInfo } from '../utils/git'
import { getTockDocsContentConfiguration } from '../utils/knowledge-bases'

const log = logger.withTag('TockDocs')

type I18nLocale = string | { code: string, name?: string }
type TockDocsI18nOptions = { locales?: I18nLocale[], strategy?: string }
type RegisterModuleOptions = {
  langDir: string
  locales: Array<{ code: string, name: string, file: string }>
}

export default defineNuxtModule({
  meta: {
    name: 'config',
  },
  async setup(_options, nuxt) {
    const dir = nuxt.options.rootDir
    const url = inferSiteURL()
    const meta = await getPackageJsonMetadata(dir)
    const gitInfo = await getLocalGitInfo(dir) || getGitEnv()
    const siteName = (typeof nuxt.options.site === 'object' && nuxt.options.site?.name) || meta.name || gitInfo?.name || ''
    const contentConfiguration = getTockDocsContentConfiguration(dir)
    const availableKnowledgeBaseLocales = new Set(contentConfiguration.knowledgeBases.flatMap(kb => kb.locales))

    nuxt.options.llms = defu(nuxt.options.llms, {
      domain: url,
      title: siteName,
      description: meta.description || '',
      full: {
        title: siteName,
        description: meta.description || '',
      },
    })

    nuxt.options.site = defu(nuxt.options.site, {
      url,
      name: siteName,
      debug: false,
    }) as typeof nuxt.options.site

    nuxt.options.appConfig.header = defu(nuxt.options.appConfig.header, {
      title: siteName,
    })

    nuxt.options.appConfig.seo = defu(nuxt.options.appConfig.seo, {
      titleTemplate: `%s - ${siteName}`,
      title: siteName,
      description: meta.description || '',
    })

    nuxt.options.appConfig.github = defu(nuxt.options.appConfig.github, {
      owner: gitInfo?.owner,
      name: gitInfo?.name,
      url: gitInfo?.url,
      branch: getGitBranch(),
    })

    const forcedColorMode = (nuxt.options.appConfig.tockdocs as Record<string, unknown>)?.colorMode as string | undefined
    if (forcedColorMode === 'light' || forcedColorMode === 'dark') {
      nuxt.options.colorMode = defu({ preference: forcedColorMode, fallback: forcedColorMode }, nuxt.options.colorMode || {}) as typeof nuxt.options.colorMode
    }

    const typedNuxtOptions = nuxt.options as typeof nuxt.options & { i18n?: false | TockDocsI18nOptions }
    const i18nOptions = typedNuxtOptions.i18n

    const baseRuntimeTockDocsConfig = {
      docsMode: contentConfiguration.mode,
      knowledgeBases: contentConfiguration.knowledgeBases.map(({ sourceDir: _sourceDir, ...knowledgeBase }) => knowledgeBase),
      defaultKnowledgeBase: contentConfiguration.knowledgeBases[0]?.id,
      hasSiteContent: contentConfiguration.hasSiteContent,
    }

    if (i18nOptions && typeof i18nOptions === 'object' && i18nOptions.locales) {
      const { resolve } = createResolver(import.meta.url)

      const filteredLocales = i18nOptions.locales.filter((locale: I18nLocale) => {
        const localeCode = typeof locale === 'string' ? locale : locale.code
        const localeFilePath = resolve('../i18n/locales', `${localeCode}.json`)
        const hasLocaleFile = existsSync(localeFilePath)
        const hasContentForLocale = contentConfiguration.mode === 'kb'
          ? availableKnowledgeBaseLocales.has(localeCode)
          : existsSync(join(nuxt.options.rootDir, 'content', localeCode))

        if (!hasLocaleFile) {
          log.warn(`Locale file not found: ${localeCode}.json - skipping locale "${localeCode}"`)
        }

        if (!hasContentForLocale) {
          log.warn(contentConfiguration.mode === 'kb'
            ? `No knowledge base content found for locale "${localeCode}" - skipping locale "${localeCode}"`
            : `Content folder not found: content/${localeCode}/ - skipping locale "${localeCode}"`)
        }

        return hasLocaleFile && hasContentForLocale
      })

      typedNuxtOptions.i18n = {
        ...i18nOptions,
        strategy: contentConfiguration.mode === 'kb' ? 'no_prefix' : 'prefix',
      }

      nuxt.options.runtimeConfig.public.tockdocs = defu(nuxt.options.runtimeConfig.public.tockdocs, {
        filteredLocales,
        ...baseRuntimeTockDocsConfig,
      })

      const registerI18nModule = nuxt.hook as unknown as (name: string, callback: (register: (options: RegisterModuleOptions) => void) => void) => void

      registerI18nModule('i18n:registerModule', (register) => {
        const langDir = resolve('../i18n/locales')

        const locales = filteredLocales.map((locale: I18nLocale) => {
          return typeof locale === 'string'
            ? {
                code: locale,
                name: locale,
                file: `${locale}.json`,
              }
            : {
                code: locale.code,
                name: locale.name || locale.code,
                file: `${locale.code}.json`,
              }
        })

        register({
          langDir,
          locales,
        })
      })
    }
    else {
      nuxt.options.runtimeConfig.public.tockdocs = defu(nuxt.options.runtimeConfig.public.tockdocs, baseRuntimeTockDocsConfig)
    }
  },
})
