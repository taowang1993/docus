import { useNuxtApp, useRuntimeConfig } from '#imports'
import type { LocaleObject } from '@nuxtjs/i18n'
import type { ComputedRef, Ref } from 'vue'
import { computed, ref } from 'vue'

function getMessageValue(messages: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!messages) {
    return undefined
  }

  const value = key.split('.').reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== 'object') {
      return undefined
    }

    return (acc as Record<string, unknown>)[segment]
  }, messages)

  return typeof value === 'string' ? value : undefined
}

type TockDocsNuxtApp = ReturnType<typeof useNuxtApp> & {
  $i18n?: {
    locale: Ref<string>
    t: (key: string) => string
    te?: (key: string, locale?: string) => boolean
  }
  $locale?: string
  $localeMessages?: Record<string, unknown>
  $localePath?: (path: string) => string
  $switchLocalePath?: (locale?: string) => string
  $tockdocsLocaleMessages?: Ref<Record<string, unknown>>
  $tockdocsFallbackLocaleMessages?: Ref<Record<string, unknown>>
}

export const useTockDocsI18n = () => {
  const config = useRuntimeConfig().public
  const nuxtApp = useNuxtApp() as TockDocsNuxtApp
  const docs = useTockDocs()
  const isEnabled = ref(!!config.i18n)

  if (!isEnabled.value) {
    const locale = nuxtApp.$locale || 'en'
    const localeMessages = nuxtApp.$localeMessages || {}

    return {
      isEnabled,
      locale: ref(locale),
      locales: computed(() => []) as ComputedRef<LocaleObject<string>[]>,
      localePath: (path: string) => path,
      switchLocalePath: () => {},
      t: (key: string): string => {
        const path = key.split('.')
        return path.reduce((acc: unknown, curr) => (acc as Record<string, unknown>)?.[curr], localeMessages) as string
      },
    }
  }

  const filteredLocales = ((config.tockdocs as { filteredLocales?: LocaleObject<string>[] } | undefined)?.filteredLocales) || []
  const locale = computed(() => docs.activeLocale.value || nuxtApp.$i18n?.locale.value || config.i18n?.defaultLocale || 'en')
  const locales = computed(() => {
    if (docs.mode.value !== 'kb' || !docs.isDocsRoute.value || !docs.activeKnowledgeBase.value) {
      return filteredLocales
    }

    const availableLocales = new Set(docs.activeKnowledgeBase.value.locales)
    return filteredLocales.filter(localeItem => availableLocales.has(localeItem.code))
  })
  const t = (key: string): string => {
    if (nuxtApp.$i18n?.te?.(key, locale.value)) {
      return nuxtApp.$i18n.t(key)
    }

    return getMessageValue(nuxtApp.$tockdocsLocaleMessages?.value, key)
      || getMessageValue(nuxtApp.$tockdocsFallbackLocaleMessages?.value, key)
      || (typeof nuxtApp.$i18n?.te === 'function' ? key : nuxtApp.$i18n?.t?.(key))
      || key
  }
  const localePath = (path: string) => docs.mode.value === 'kb'
    ? path
    : nuxtApp.$localePath?.(path) || path
  const switchLocalePath = (targetLocale?: string) => {
    if (!targetLocale) {
      return docs.isDocsRoute.value ? docs.switchLocalePath(locale.value) : ''
    }

    if (docs.mode.value === 'kb') {
      return docs.isDocsRoute.value ? docs.switchLocalePath(targetLocale) : ''
    }

    return nuxtApp.$switchLocalePath?.(targetLocale) || ''
  }

  return {
    isEnabled,
    locale,
    locales,
    t,
    localePath,
    switchLocalePath,
  }
}
