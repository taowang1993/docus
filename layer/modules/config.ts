import { addPrerenderRoutes, createResolver, defineNuxtModule, logger } from '@nuxt/kit'
import { defu } from 'defu'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { formatOgDescription } from '../app/utils/ogImage'
import { inferSiteURL, getPackageJsonMetadata } from '../utils/meta'
import { getGitBranch, getGitEnv, getLocalGitInfo } from '../utils/git'
import { landingPageExists } from '../utils/pages'
import { getTockDocsContentConfiguration, type TockDocsContentConfiguration } from '../utils/knowledge-bases'

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

    const landingOgImageRoute = getLandingOgImagePrerenderRoute({
      rootDir: dir,
      contentConfiguration,
      siteName,
      seo: {
        title: nuxt.options.appConfig.seo?.title,
        description: nuxt.options.appConfig.seo?.description,
      },
    })

    if (landingOgImageRoute) {
      addPrerenderRoutes([landingOgImageRoute])
    }

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

type LandingOgImagePrerenderOptions = {
  rootDir: string
  contentConfiguration: Pick<TockDocsContentConfiguration, 'mode' | 'hasSiteContent'>
  siteName: string
  seo?: { title?: string, description?: string }
}

export function getLandingOgImagePrerenderRoute({
  rootDir,
  contentConfiguration,
  siteName,
  seo,
}: LandingOgImagePrerenderOptions): string | null {
  if (landingPageExists(rootDir) || contentConfiguration.mode !== 'kb' || !contentConfiguration.hasSiteContent) {
    return null
  }

  const landingSeo = readLandingSeo(rootDir)
  const landingTitle = landingSeo?.title || seo?.title || siteName
  const landingDescription = landingSeo?.description || seo?.description || ''

  return buildOgImagePath('Landing', {
    title: landingTitle,
    description: formatOgDescription(landingTitle, landingDescription),
  })
}

function readLandingSeo(rootDir: string): { title?: string, description?: string } | null {
  const landingContentPath = join(rootDir, 'content', 'site', 'index.md')

  if (!existsSync(landingContentPath)) {
    return null
  }

  const rawContent = readFileSync(landingContentPath, 'utf8').replace(/\r/g, '')
  const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch?.[1]) {
    return null
  }

  try {
    const frontmatter = parseYaml(frontmatterMatch[1]) as Record<string, unknown> | null
    const seo = frontmatter?.seo as Record<string, unknown> | undefined

    const title = typeof seo?.title === 'string'
      ? seo.title
      : typeof frontmatter?.title === 'string'
        ? frontmatter.title
        : undefined

    const description = typeof seo?.description === 'string'
      ? seo.description
      : typeof frontmatter?.description === 'string'
        ? frontmatter.description
        : undefined

    if (!title && !description) {
      return null
    }

    return { title, description }
  }
  catch {
    return null
  }
}

function buildOgImagePath(component: string, options: { title?: string, description?: string, headline?: string }): string {
  const params = [`c_${encodeOgImageValue(component)}`]

  if (options.title) {
    params.push(`title_${encodeOgImageValue(options.title)}`)
  }

  if (options.description) {
    params.push(`description_${encodeOgImageValue(options.description)}`)
  }

  if (options.headline) {
    params.push(`headline_${encodeOgImageValue(options.headline)}`)
  }

  return `/_og/s/${params.join(',')}.png`
}

function hasNonAscii(value: string): boolean {
  for (const char of value) {
    if ((char.codePointAt(0) || 0) > 0x7F) {
      return true
    }
  }

  return false
}

function encodeOgImageValue(value: string): string {
  if (hasNonAscii(value)) {
    return `~${Buffer.from(value, 'utf8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '~')}`
  }

  const escaped = value.startsWith('~') ? `~${value}` : value
  const encoded = encodeURIComponent(escaped.replace(/_/g, '__')).replace(/%20/g, '+')

  if (encoded.includes('%')) {
    return `~${Buffer.from(value, 'utf8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '~')}`
  }

  return encoded
}
