<script setup lang="ts">
const site = useSiteConfig()
const appConfig = useAppConfig()
const docs = useTockDocs()

const entries = computed(() => docs.knowledgeBases.value.map(knowledgeBase => ({
  ...knowledgeBase,
  to: docs.getKnowledgeBaseHomePath(knowledgeBase.id),
})))

const title = computed(() => appConfig.seo?.title || site.name || 'Knowledge base directory')
const description = computed(() => appConfig.seo?.description || 'Browse the available knowledge bases.')
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    <UPageHero
      :title="title"
      :description="description"
      class="border-b border-default pb-8"
    />

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UPageCard
        v-for="entry in entries"
        :key="entry.id"
        :to="entry.to"
        :icon="entry.icon"
        :title="entry.title"
        :description="entry.description || 'Open this knowledge base.'"
        spotlight
        class="h-full"
      >
        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge
            color="neutral"
            variant="soft"
            size="sm"
          >
            {{ entry.id }}
          </UBadge>
          <UBadge
            v-for="locale in entry.locales"
            :key="`${entry.id}-${locale}`"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            {{ locale.toUpperCase() }}
          </UBadge>
        </div>
      </UPageCard>
    </div>
  </div>
</template>
