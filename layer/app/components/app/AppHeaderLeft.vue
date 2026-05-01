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
      class="flex items-center gap-3"
    >
      <AppHeaderLogo />
      <span class="text-xl font-bold">
        {{ brandName }}
      </span>
    </NuxtLink>

    <template v-if="showKnowledgeBaseSelect">
      <ClientOnly>
        <KnowledgeBaseSelect />

        <template #fallback>
          <div class="h-9 w-32 shrink-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </template>
      </ClientOnly>
    </template>

    <template v-if="showLanguageSelect">
      <ClientOnly>
        <LanguageSelect />

        <template #fallback>
          <div class="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </template>
      </ClientOnly>
    </template>
  </div>
</template>
