import { joinURL } from 'ufo'

export interface DocusKnowledgeBase {
  id: string
  title: string
  description: string
  icon: string
  defaultLocale: string
  locales: string[]
  entry?: string
  theme?: string
  searchPlaceholder?: string
  assistantName?: string
}

type LocaleEntry = string | { code: string }

type DocusPublicRuntimeConfig = {
  i18n?: {
    defaultLocale?: string
    locales?: LocaleEntry[]
  }
  docus?: {
    docsMode?: 'legacy' | 'kb'
    filteredLocales?: Array<{ code: string, name?: string }>
    knowledgeBases?: DocusKnowledgeBase[]
    defaultKnowledgeBase?: string
    hasSiteContent?: boolean
  }
}

export interface ResolvedDocsRoute {
  mode: 'legacy' | 'kb'
  isDocsRoute: boolean
  kb?: string
  locale?: string
  slug: string[]
  path: string
  collectionName?: string
}

function normalizeLocaleEntry(locale: LocaleEntry) {
  return typeof locale === 'string' ? locale : locale.code
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

export function normalizeCollectionSegment(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')
}

export function getKnowledgeBases(config: DocusPublicRuntimeConfig): DocusKnowledgeBase[] {
  return Array.isArray(config.docus?.knowledgeBases)
    ? config.docus.knowledgeBases
    : []
}

export function getDocsMode(config: DocusPublicRuntimeConfig): 'legacy' | 'kb' {
  if (config.docus?.docsMode === 'kb') {
    return 'kb'
  }

  return getKnowledgeBases(config).length > 0 ? 'kb' : 'legacy'
}

export function hasSiteContent(config: DocusPublicRuntimeConfig): boolean {
  return Boolean(config.docus?.hasSiteContent)
}

export function getFilteredLocaleCodes(config: DocusPublicRuntimeConfig): string[] {
  if (Array.isArray(config.docus?.filteredLocales) && config.docus.filteredLocales.length > 0) {
    return unique(config.docus.filteredLocales.map(locale => locale.code))
  }

  if (Array.isArray(config.i18n?.locales) && config.i18n.locales.length > 0) {
    return unique(config.i18n.locales.map(normalizeLocaleEntry))
  }

  return unique(getKnowledgeBases(config).flatMap(kb => kb.locales))
}

export function getDefaultLocale(config: DocusPublicRuntimeConfig): string {
  return config.i18n?.defaultLocale || getFilteredLocaleCodes(config)[0] || 'en'
}

export function getDefaultKnowledgeBase(config: DocusPublicRuntimeConfig): string | undefined {
  const configuredDefault = config.docus?.defaultKnowledgeBase
  if (configuredDefault && getKnowledgeBases(config).some(kb => kb.id === configuredDefault)) {
    return configuredDefault
  }

  return getKnowledgeBases(config)[0]?.id
}

export function getKnowledgeBase(config: DocusPublicRuntimeConfig, kbId?: string): DocusKnowledgeBase | undefined {
  const knowledgeBases = getKnowledgeBases(config)
  if (knowledgeBases.length === 0) {
    return undefined
  }

  if (kbId) {
    const match = knowledgeBases.find(kb => kb.id === kbId)
    if (match) {
      return match
    }
  }

  const defaultKb = getDefaultKnowledgeBase(config)
  return knowledgeBases.find(kb => kb.id === defaultKb) || knowledgeBases[0]
}

export function resolveKnowledgeBaseLocale(
  config: DocusPublicRuntimeConfig,
  kbId?: string,
  locale?: string,
): string {
  const kb = getKnowledgeBase(config, kbId)

  if (kb) {
    if (locale && kb.locales.includes(locale)) {
      return locale
    }

    if (kb.locales.includes(kb.defaultLocale)) {
      return kb.defaultLocale
    }

    return kb.locales[0] || getDefaultLocale(config)
  }

  return locale || getDefaultLocale(config)
}

export function getKnowledgeBaseEntrySlug(knowledgeBase?: Pick<DocusKnowledgeBase, 'entry'>) {
  return knowledgeBase?.entry?.split('/').filter(Boolean) || []
}

export function getDocsCollectionName({
  mode,
  kb,
  locale,
}: {
  mode: 'legacy' | 'kb'
  kb?: string
  locale?: string
}) {
  if (mode === 'kb' && kb && locale) {
    return `docs_${normalizeCollectionSegment(kb)}_${normalizeCollectionSegment(locale)}`
  }

  if (locale) {
    return `docs_${normalizeCollectionSegment(locale)}`
  }

  return 'docs'
}

export function getAllDocsCollectionNames(config: DocusPublicRuntimeConfig): string[] {
  const mode = getDocsMode(config)

  if (mode === 'kb') {
    return unique(
      getKnowledgeBases(config).flatMap(kb =>
        kb.locales.map(locale => getDocsCollectionName({ mode, kb: kb.id, locale })),
      ),
    )
  }

  const locales = getFilteredLocaleCodes(config)
  return locales.length > 0
    ? locales.map(locale => getDocsCollectionName({ mode, locale }))
    : ['docs']
}

export function getDefaultDocsCollectionName(config: DocusPublicRuntimeConfig): string {
  const mode = getDocsMode(config)

  if (mode === 'kb') {
    const kb = getKnowledgeBase(config)
    if (kb) {
      return getDocsCollectionName({ mode, kb: kb.id, locale: resolveKnowledgeBaseLocale(config, kb.id) })
    }
  }

  const locales = getFilteredLocaleCodes(config)
  return getDocsCollectionName({ mode, locale: locales[0] })
}

export function buildDocsPath({
  mode,
  kb,
  locale,
  slug = [],
}: {
  mode: 'legacy' | 'kb'
  kb?: string
  locale?: string
  slug?: string[]
}) {
  const cleanSlug = slug.filter(Boolean)

  if (mode === 'kb') {
    if (!kb) {
      return '/docs'
    }

    if (!locale) {
      return joinURL('/docs', kb)
    }

    return joinURL('/docs', kb, locale, ...cleanSlug)
  }

  if (locale) {
    return joinURL('/', locale, ...cleanSlug)
  }

  return cleanSlug.length > 0 ? joinURL('/', ...cleanSlug) : '/'
}

export function resolveDocsRoute(path: string, config: DocusPublicRuntimeConfig): ResolvedDocsRoute {
  const cleanPath = path.split('?')[0] || '/'
  const segments = cleanPath.split('/').filter(Boolean)
  const mode = getDocsMode(config)

  if (mode === 'kb') {
    if (segments[0] !== 'docs') {
      return {
        mode,
        isDocsRoute: false,
        slug: [],
        path: cleanPath,
      }
    }

    const kb = segments[1]
    const knowledgeBase = getKnowledgeBase(config, kb)

    if (!knowledgeBase) {
      return {
        mode,
        isDocsRoute: true,
        slug: segments.slice(2),
        path: cleanPath,
      }
    }

    const locale = segments[2]

    if (!locale || !knowledgeBase.locales.includes(locale)) {
      return {
        mode,
        isDocsRoute: true,
        kb: knowledgeBase.id,
        slug: segments.slice(2),
        path: cleanPath,
      }
    }

    return {
      mode,
      isDocsRoute: true,
      kb: knowledgeBase.id,
      locale,
      slug: segments.slice(3),
      path: cleanPath,
      collectionName: getDocsCollectionName({ mode, kb: knowledgeBase.id, locale }),
    }
  }

  const locales = getFilteredLocaleCodes(config)

  if (locales.length > 0) {
    const locale = segments[0]

    if (!locale || !locales.includes(locale)) {
      return {
        mode,
        isDocsRoute: false,
        slug: segments,
        path: cleanPath,
      }
    }

    return {
      mode,
      isDocsRoute: true,
      locale,
      slug: segments.slice(1),
      path: cleanPath,
      collectionName: getDocsCollectionName({ mode, locale }),
    }
  }

  return {
    mode,
    isDocsRoute: cleanPath !== '/',
    slug: segments,
    path: cleanPath,
    collectionName: cleanPath !== '/' ? 'docs' : undefined,
  }
}

export function getLegacyDocsRedirectPath(path: string, config: DocusPublicRuntimeConfig): string | undefined {
  if (getDocsMode(config) !== 'kb') {
    return undefined
  }

  const cleanPath = path.split('?')[0] || '/'
  const segments = cleanPath.split('/').filter(Boolean)

  if (segments.length === 0 || segments[0] === 'docs') {
    return undefined
  }

  const locale = segments[0]
  const availableLocales = getFilteredLocaleCodes(config)

  if (!locale || !availableLocales.includes(locale)) {
    return undefined
  }

  const knowledgeBase = getKnowledgeBase(config)
  if (!knowledgeBase) {
    return undefined
  }

  return buildDocsPath({
    mode: 'kb',
    kb: knowledgeBase.id,
    locale: resolveKnowledgeBaseLocale(config, knowledgeBase.id, locale),
    slug: segments.slice(1),
  })
}

export function getCollectionFromPath(path: string, config: DocusPublicRuntimeConfig): string {
  const resolved = resolveDocsRoute(path, config)

  if (resolved.collectionName) {
    return resolved.collectionName
  }

  return getDefaultDocsCollectionName(config)
}

export function switchLocaleInPath(path: string, targetLocale: string, config: DocusPublicRuntimeConfig): string {
  const resolved = resolveDocsRoute(path, config)

  if (resolved.mode === 'kb') {
    if (!resolved.isDocsRoute || !resolved.kb) {
      return path
    }

    return buildDocsPath({
      mode: 'kb',
      kb: resolved.kb,
      locale: resolveKnowledgeBaseLocale(config, resolved.kb, targetLocale),
      slug: resolved.slug,
    })
  }

  const locales = getFilteredLocaleCodes(config)

  if (locales.length === 0) {
    return path
  }

  if (!resolved.isDocsRoute) {
    return buildDocsPath({ mode: 'legacy', locale: targetLocale })
  }

  return buildDocsPath({
    mode: 'legacy',
    locale: targetLocale,
    slug: resolved.slug,
  })
}

export function switchKnowledgeBaseInPath(path: string, targetKb: string, config: DocusPublicRuntimeConfig): string {
  if (getDocsMode(config) !== 'kb') {
    return path
  }

  const nextKnowledgeBase = getKnowledgeBase(config, targetKb)
  if (!nextKnowledgeBase) {
    return path
  }

  return buildDocsPath({
    mode: 'kb',
    kb: nextKnowledgeBase.id,
    locale: resolveKnowledgeBaseLocale(config, nextKnowledgeBase.id),
    slug: getKnowledgeBaseEntrySlug(nextKnowledgeBase),
  })
}
