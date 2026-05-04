import type { RouteLocationNormalized } from 'vue-router'
import { consola } from 'consola'
import { getDefaultLocale, getDocsMode, getFilteredLocaleCodes, resolveDocsRoute } from '../../utils/docs'

const log = consola.withTag('TockDocs')

const localeFiles = import.meta.glob<{ default: Record<string, unknown> }>('../../i18n/locales/*.json')
const localeCache = new Map<string, Record<string, unknown>>()

function resolveLocaleFileKey(locale: string): string | undefined {
  const normalizedLocale = locale.toLowerCase()
  const exactMatch = Object.keys(localeFiles).find(key => key.toLowerCase().endsWith(`/${normalizedLocale}.json`))
  if (exactMatch) {
    return exactMatch
  }

  const baseLocale = normalizedLocale.split('-')[0]
  return Object.keys(localeFiles).find(key => key.toLowerCase().endsWith(`/${baseLocale}.json`))
}

async function loadLocaleMessages(locale: string): Promise<Record<string, unknown>> {
  const localeFileKey = resolveLocaleFileKey(locale) || '../../i18n/locales/en.json'

  if (localeCache.has(localeFileKey)) {
    return localeCache.get(localeFileKey) || {}
  }

  const localeLoader = localeFiles[localeFileKey]
  if (!localeLoader) {
    return {}
  }

  const localeModule = await localeLoader()
  localeCache.set(localeFileKey, localeModule.default)
  return localeModule.default
}

export default defineNuxtPlugin(async () => {
  const nuxtApp = useNuxtApp()
  const publicConfig = nuxtApp.$config.public as Parameters<typeof getDocsMode>[0]
  const i18nConfig = publicConfig.i18n

  if (!i18nConfig) {
    const appConfig = useAppConfig()
    const configuredLocale = appConfig.tockdocs.locale || 'en'
    const locale = resolveLocaleFileKey(configuredLocale) ? configuredLocale : 'en'

    if (locale !== configuredLocale) {
      log.warn(`Missing locale file for "${configuredLocale}". Falling back to "en".`)
    }

    const resolvedMessages = await loadLocaleMessages(locale)

    nuxtApp.provide('locale', locale)
    nuxtApp.provide('localeMessages', resolvedMessages)

    return
  }

  const docsMode = getDocsMode(publicConfig)
  const defaultLocale = getDefaultLocale(publicConfig)
  const filteredLocales = getFilteredLocaleCodes(publicConfig)
  const tockdocsLocaleMessages = ref<Record<string, unknown>>({})
  const tockdocsFallbackLocaleMessages = ref<Record<string, unknown>>({})

  nuxtApp.provide('tockdocsLocaleMessages', tockdocsLocaleMessages)
  nuxtApp.provide('tockdocsFallbackLocaleMessages', tockdocsFallbackLocaleMessages)

  async function syncLocale(path: string) {
    const resolved = resolveDocsRoute(path, publicConfig)
    const nextLocale = resolved.locale || defaultLocale

    if (nuxtApp.$i18n?.locale.value !== nextLocale) {
      nuxtApp.$i18n.locale.value = nextLocale
    }

    tockdocsLocaleMessages.value = await loadLocaleMessages(nextLocale)
  }

  tockdocsFallbackLocaleMessages.value = await loadLocaleMessages(defaultLocale)
  await syncLocale(useRoute().path)

  addRouteMiddleware(async (to: RouteLocationNormalized) => {
    if (docsMode === 'legacy' && to.path === '/') {
      const cookieLocale = useCookie('i18n_redirected').value || i18nConfig.defaultLocale || defaultLocale
      return navigateTo(`/${cookieLocale}`)
    }

    if (docsMode === 'legacy' && filteredLocales.length > 0 && to.path !== '/') {
      const firstSegment = to.path.split('/').filter(Boolean)[0]
      if (firstSegment && !filteredLocales.includes(firstSegment)) {
        return navigateTo(`/${i18nConfig.defaultLocale || defaultLocale}${to.path}`)
      }
    }

    await syncLocale(to.path)
  })
})
