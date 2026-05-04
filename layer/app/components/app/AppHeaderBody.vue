<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { useHeaderLayout } from '../../composables/useHeaderLayout'

const route = useRoute()
const navigation = inject<Ref<ContentNavigationItem[]>>('navigation', ref([]))
const navigationKey = computed(() => `${route.path}:${navigation.value?.map(item => item.path).join('|') || 'navigation-empty'}`)

const contentNavVariants = useUIConfig('contentNavigation')
const { isEnabled, locales } = useTockDocsI18n()
const docs = useTockDocs()
const { classes: headerLayout } = useHeaderLayout()
const showKnowledgeBaseSelect = computed(() => docs.isKnowledgeBaseMode.value && docs.knowledgeBases.value.length > 1 && docs.isDocsRoute.value)
const showLanguageSelect = computed(() => isEnabled.value && locales.value.length > 1 && (!docs.isKnowledgeBaseMode.value || docs.isDocsRoute.value))
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="showKnowledgeBaseSelect || showLanguageSelect"
      :class="['flex flex-wrap items-center gap-2 px-2 pt-2', headerLayout.drawerOnly]"
    >
      <KnowledgeBaseSelect
        v-if="showKnowledgeBaseSelect"
        compact
        class="min-w-0 max-w-full"
      />
      <LanguageSelect
        v-if="showLanguageSelect"
        compact
        class="shrink-0"
      />
    </div>

    <UContentNavigation
      :key="navigationKey"
      :highlight="contentNavVariants.highlight ?? true"
      :highlight-color="contentNavVariants.highlightColor"
      :variant="contentNavVariants.variant ?? 'link'"
      :color="contentNavVariants.color"
      :navigation="navigation"
    />
  </div>
</template>
