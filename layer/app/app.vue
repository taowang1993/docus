<script setup lang="ts">
import type { ContentNavigationItem, PageCollections } from '@nuxt/content'
import * as nuxtUiLocales from '@nuxt/ui/locale'
import { transformNavigation } from './utils/navigation'
import { useTockDocsColorMode } from './composables/useTockDocsColorMode'
import { useSubNavigation } from './composables/useSubNavigation'

const appConfig = useAppConfig()
const { seo } = appConfig
const { forced: forcedColorMode } = useTockDocsColorMode()
const site = useSiteConfig()
const { locale, isEnabled } = useTockDocsI18n()
const docs = useTockDocs()
const { isEnabled: isAssistantEnabled, isResizing: isAssistantResizing, panelWidth: assistantPanelWidth, shouldPushContent } = useAssistant()
const { open: contentSearchOpen } = useContentSearch()

const nuxtUiLocale = computed(() => nuxtUiLocales[locale.value as keyof typeof nuxtUiLocales] || nuxtUiLocales.en)
const lang = computed(() => nuxtUiLocale.value.code)
const dir = computed(() => nuxtUiLocale.value.dir)
const collectionName = computed(() => docs.collectionName.value)
const faviconUrl = computed(() => appConfig.header?.logo?.favicon || '/favicon.svg')
const faviconType = computed(() => /\.svg(?:[?#]|$)/i.test(faviconUrl.value) ? 'image/svg+xml' : 'image/x-icon')
const themeAwareFavicons = useState('tockdocs-theme-favicons', () => ({
  dark: false,
  light: false,
}))

if (import.meta.server) {
  const [{ existsSync }, { resolve: resolvePath }] = await Promise.all([
    import('node:fs'),
    import('node:path'),
  ])

  const publicDir = resolvePath(process.cwd(), 'public')

  themeAwareFavicons.value = {
    dark: existsSync(resolvePath(publicDir, 'favicon-dark.svg')),
    light: existsSync(resolvePath(publicDir, 'favicon-light.svg')),
  }
}

const faviconLinks = computed(() => {
  const links: Array<{ key: string, rel: string, href: string, type: string, media?: string, sizes?: string }> = []

  if (themeAwareFavicons.value.dark) {
    links.push({
      key: 'favicon-dark',
      rel: 'icon',
      href: '/favicon-dark.svg',
      type: 'image/svg+xml',
      media: '(prefers-color-scheme: light)',
      sizes: 'any',
    })
  }

  if (themeAwareFavicons.value.light) {
    links.push({
      key: 'favicon-light',
      rel: 'icon',
      href: '/favicon-light.svg',
      type: 'image/svg+xml',
      media: '(prefers-color-scheme: dark)',
      sizes: 'any',
    })
  }

  links.push({
    key: 'favicon',
    rel: 'icon',
    href: faviconUrl.value,
    type: faviconType.value,
    sizes: faviconType.value === 'image/svg+xml' ? 'any' : undefined,
  })

  return links
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: faviconLinks,
  htmlAttrs: {
    lang,
    dir,
  },
})

useSeoMeta({
  titleTemplate: seo.titleTemplate,
  title: seo.title,
  description: seo.description,
  ogSiteName: site.name,
  twitterCard: 'summary_large_image',
})

const navigationAsyncData = useAsyncData(() => `navigation_${collectionName.value}`, () => queryCollectionNavigation(collectionName.value as keyof PageCollections), {
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

const { subNavigationMode } = useSubNavigation(navigation)

function closeContentSearch() {
  contentSearchOpen.value = false
}
</script>

<template>
  <UApp :locale="nuxtUiLocale">
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <div
      :class="[
        'will-change-[margin-right]',
        isAssistantResizing ? 'transition-none' : 'transition-[margin-right] duration-200 ease-linear',
        { 'tockdocs-sub-header': subNavigationMode === 'header' },
      ]"
      :style="{ marginRight: shouldPushContent ? `${assistantPanelWidth}px` : '0' }"
    >
      <AppHeader v-if="$route.meta.header !== false" />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <AppFooter v-if="$route.meta.footer !== false" />
    </div>

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
      <template v-if="isAssistantEnabled">
        <LazyAssistantPanel />
        <LazyAssistantFloatingInput />
      </template>
    </ClientOnly>
  </UApp>
</template>

<style>
@media (min-width: 1024px) {
  .tockdocs-sub-header {
    --ui-header-height: 112px;
  }
}
</style>
