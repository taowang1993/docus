import { useNuxtApp, useRuntimeConfig } from '#imports'
import type { LocaleObject } from '@nuxtjs/i18n'
import type { ComputedRef, Ref } from 'vue'
import { computed, ref } from 'vue'

type DocusNuxtApp = ReturnType<typeof useNuxtApp> & {
  $i18n?: {
    locale: Ref<string>
    t: (key: string) => string
  }
  $locale?: string
  $localeMessages?: Record<string, unknown>
  $localePath?: (path: string) => string
  $switchLocalePath?: (locale?: string) => string
}

export const useDocusI18n = () => {
  const config = useRuntimeConfig().public
  const nuxtApp = useNuxtApp() as DocusNuxtApp
  const docs = useDocusDocs()
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

  const filteredLocales = ((config.docus as { filteredLocales?: LocaleObject<string>[] } | undefined)?.filteredLocales) || []
  const locale = computed(() => docs.activeLocale.value || nuxtApp.$i18n?.locale.value || config.i18n?.defaultLocale || 'en')
  const locales = computed(() => {
    if (docs.mode.value !== 'kb' || !docs.isDocsRoute.value || !docs.activeKnowledgeBase.value) {
      return filteredLocales
    }

    const availableLocales = new Set(docs.activeKnowledgeBase.value.locales)
    return filteredLocales.filter(localeItem => availableLocales.has(localeItem.code))
  })
  const t = nuxtApp.$i18n?.t || ((key: string) => key)
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
