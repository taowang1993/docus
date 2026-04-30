import type { RouteLocationNormalized } from 'vue-router'
import { consola } from 'consola'
import { getDefaultLocale, getDocsMode, getFilteredLocaleCodes, getLegacyDocsRedirectPath, resolveDocsRoute } from '../../utils/docs'

const log = consola.withTag('Docus')

const localeFiles = import.meta.glob<{ default: Record<string, unknown> }>('../../i18n/locales/*.json')

export default defineNuxtPlugin(async () => {
  const nuxtApp = useNuxtApp()
  const publicConfig = nuxtApp.$config.public as Parameters<typeof getDocsMode>[0]
  const i18nConfig = publicConfig.i18n

  if (!i18nConfig) {
    const appConfig = useAppConfig()
    const configuredLocale = appConfig.docus.locale || 'en'

    let locale = configuredLocale
    let resolvedMessages: Record<string, unknown>

    const localeKey = `../../i18n/locales/${configuredLocale}.json`
    const localeLoader = localeFiles[localeKey]

    if (localeLoader) {
      const localeModule = await localeLoader()
      resolvedMessages = localeModule.default
    }
    else {
      log.warn(`Missing locale file for "${configuredLocale}". Falling back to "en".`)
      locale = 'en'
      const fallbackKey = '../../i18n/locales/en.json'
      const fallbackLoader = localeFiles[fallbackKey]
      if (fallbackLoader) {
        const fallbackModule = await fallbackLoader()
        resolvedMessages = fallbackModule.default
      }
      else {
        resolvedMessages = {} as Record<string, unknown>
      }
    }

    nuxtApp.provide('locale', locale)
    nuxtApp.provide('localeMessages', resolvedMessages)

    return
  }

  const docsMode = getDocsMode(publicConfig)
  const defaultLocale = getDefaultLocale(publicConfig)
  const filteredLocales = getFilteredLocaleCodes(publicConfig)

  function syncLocale(path: string) {
    const resolved = resolveDocsRoute(path, publicConfig)
    const nextLocale = resolved.locale || defaultLocale

    if (nuxtApp.$i18n?.locale.value !== nextLocale) {
      nuxtApp.$i18n.locale.value = nextLocale
    }
  }

  syncLocale(useRoute().path)

  addRouteMiddleware((to: RouteLocationNormalized) => {
    const legacyRedirectPath = getLegacyDocsRedirectPath(to.path, publicConfig)
    if (legacyRedirectPath) {
      return navigateTo(legacyRedirectPath, { redirectCode: 301 })
    }

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

    syncLocale(to.path)
  })
})
