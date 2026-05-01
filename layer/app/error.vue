<script setup lang="ts">
import type { NuxtError } from '#app'
import type { ContentNavigationItem, PageCollections } from '@nuxt/content'
import * as nuxtUiLocales from '@nuxt/ui/locale'
import { transformNavigation } from './utils/navigation'
import { useTockDocsColorMode } from './composables/useTockDocsColorMode'

const props = defineProps<{
  error: NuxtError
}>()

const { forced: forcedColorMode } = useTockDocsColorMode()
const { locale, isEnabled, t } = useTockDocsI18n()
const docs = useTockDocs()
const { open: contentSearchOpen } = useContentSearch()

const nuxtUiLocale = computed(() => nuxtUiLocales[locale.value as keyof typeof nuxtUiLocales] || nuxtUiLocales.en)
const lang = computed(() => nuxtUiLocale.value.code)
const dir = computed(() => nuxtUiLocale.value.dir)

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
})

const localizedError = computed(() => {
  return {
    ...props.error,
    statusMessage: t('common.error.title'),
    message: t('common.error.description'),
  }
})

useSeoMeta({
  title: () => t('common.error.title'),
  description: () => t('common.error.description'),
})

const collectionName = computed(() => docs.collectionName.value)

const navigationAsyncData = useAsyncData(`navigation_${collectionName.value}`, () => queryCollectionNavigation(collectionName.value as keyof PageCollections), {
  transform: (data: ContentNavigationItem[]) => transformNavigation(data, isEnabled.value, locale.value, docs.mode.value, docs.activeKnowledgeBase.value?.id),
  watch: [collectionName],
})
const { data: navigation } = navigationAsyncData

provide('navigation', navigation)

const { data: files } = useLazyAsyncData(`search_${collectionName.value}`, () => queryCollectionSearchSections(collectionName.value as keyof PageCollections), {
  server: false,
  watch: [collectionName],
})

await navigationAsyncData

function closeContentSearch() {
  contentSearchOpen.value = false
}
</script>

<template>
  <UApp :locale="nuxtUiLocale">
    <AppHeader />

    <UError :error="localizedError" />

    <AppFooter />

    <ClientOnly>
      <div
        v-if="contentSearchOpen"
        data-testid="content-search-overlay"
        class="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px]"
        @click="closeContentSearch"
      />

      <LazyUContentSearch
        :files="files"
        :navigation="navigation"
        :color-mode="!forcedColorMode"
        :modal="false"
        :overlay="false"
        :ui="{ modal: 'z-[61]' }"
      />
    </ClientOnly>
  </UApp>
</template>
