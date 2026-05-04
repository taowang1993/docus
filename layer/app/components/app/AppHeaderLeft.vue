<script setup lang="ts">
const appConfig = useAppConfig()
const site = useSiteConfig()
const { isEnabled, locales, localePath } = useTockDocsI18n()
const docs = useTockDocs()

const brandName = computed(() => appConfig.header?.title || site.name || '')
const homePath = computed(() => docs.isKnowledgeBaseMode.value ? '/' : localePath('/'))
const showKnowledgeBaseSelect = computed(() => docs.isKnowledgeBaseMode.value && docs.knowledgeBases.value.length > 1 && docs.isDocsRoute.value)
const showLanguageSelect = computed(() => isEnabled.value && locales.value.length > 1 && (!docs.isKnowledgeBaseMode.value || docs.isDocsRoute.value))
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
    <NuxtLink
      :to="homePath"
      :aria-label="brandName"
      class="flex shrink-0 items-center gap-3"
    >
      <AppHeaderLogo />
      <span class="shrink-0 whitespace-nowrap text-xl font-bold">
        {{ brandName }}
      </span>
    </NuxtLink>

    <template v-if="showKnowledgeBaseSelect">
      <KnowledgeBaseSelect class="min-w-0 shrink" />
    </template>

    <template v-if="showLanguageSelect">
      <LanguageSelect class="shrink-0" />
    </template>
  </div>
</template>
