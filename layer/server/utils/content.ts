import type { H3Event } from 'h3'
import {
  getAllDocsCollectionNames,
  getCollectionFromPath as getResolvedCollectionFromPath,
  getDocsCollectionName,
  getDocsMode,
  getFilteredLocaleCodes,
  getKnowledgeBase,
  getKnowledgeBases,
  resolveDocsRoute,
  resolveKnowledgeBaseLocale,
} from '../../utils/docs'

type ConfigWithLocales = Parameters<typeof getDocsMode>[0]

export function isNavigationPath(path: string): boolean {
  return path.endsWith('.navigation') || path.includes('/.navigation')
}

export function isSearchableContentPath(path: string): boolean {
  return Boolean(path) && !isNavigationPath(path)
}

export function getAvailableLocales(config: ConfigWithLocales): string[] {
  return getFilteredLocaleCodes(config)
}

export function getKnowledgeBaseScope(config: ConfigWithLocales) {
  return getKnowledgeBases(config)
}

export function getCollectionsToQuery({
  kb,
  locale,
}: {
  kb?: string
  locale?: string
}, config: ConfigWithLocales): string[] {
  const mode = getDocsMode(config)

  if (mode === 'kb') {
    if (kb) {
      const knowledgeBase = getKnowledgeBase(config, kb)
      if (!knowledgeBase) {
        return []
      }

      if (locale) {
        const resolvedLocale = resolveKnowledgeBaseLocale(config, knowledgeBase.id, locale)
        return [getDocsCollectionName({ mode, kb: knowledgeBase.id, locale: resolvedLocale })]
      }

      return knowledgeBase.locales.map(locale => getDocsCollectionName({ mode, kb: knowledgeBase.id, locale }))
    }

    return getAllDocsCollectionNames(config)
  }

  if (locale) {
    return [getDocsCollectionName({ mode, locale })]
  }

  const availableLocales = getAvailableLocales(config)
  return availableLocales.length > 0
    ? availableLocales.map(locale => getDocsCollectionName({ mode, locale }))
    : ['docs']
}

export function getCollectionFromPath(path: string, config: ConfigWithLocales): string {
  return getResolvedCollectionFromPath(path, config)
}

export function getDocsContextFromPath(path: string, config: ConfigWithLocales) {
  return resolveDocsRoute(path, config)
}

function normalizeKnowledgeBaseAndLocale(
  config: ConfigWithLocales,
  input: { kb?: string, locale?: string },
) {
  let kb = input.kb?.trim() || undefined
  let locale = input.locale?.trim() || undefined

  if (kb) {
    const segments = kb.split('/').filter(Boolean)

    if (segments[0] === 'docs') {
      segments.shift()
    }

    if (segments.length >= 2) {
      const kbCandidate = segments[0]
      const localeCandidate = segments[1]
      const knowledgeBase = getKnowledgeBase(config, kbCandidate)

      if (knowledgeBase && localeCandidate && knowledgeBase.locales.includes(localeCandidate)) {
        kb = knowledgeBase.id
        locale ||= localeCandidate
      }
    }
  }

  return {
    kb,
    locale,
  }
}

export function getScopedKnowledgeBaseAndLocale(event: H3Event, explicit: { kb?: string, locale?: string } = {}) {
  const query = getQuery(event)
  const config = useRuntimeConfig(event).public as ConfigWithLocales

  const kb = explicit.kb
    || (typeof query.kb === 'string' ? query.kb : undefined)
  const locale = explicit.locale
    || (typeof query.locale === 'string' ? query.locale : undefined)

  const normalized = normalizeKnowledgeBaseAndLocale(config, {
    kb,
    locale,
  })

  console.info(`[tockdocs-mcp-scope] ${JSON.stringify({
    requestPath: getRequestURL(event).pathname,
    explicitKb: explicit.kb,
    explicitLocale: explicit.locale,
    queryKb: typeof query.kb === 'string' ? query.kb : undefined,
    queryLocale: typeof query.locale === 'string' ? query.locale : undefined,
    kb: normalized.kb,
    locale: normalized.locale,
  })}`)

  return normalized
}
