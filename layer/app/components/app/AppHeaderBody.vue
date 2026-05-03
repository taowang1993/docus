<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const route = useRoute()
const navigation = inject<Ref<ContentNavigationItem[]>>('navigation', ref([]))
const navigationKey = computed(() => `${route.path}:${navigation.value?.map(item => item.path).join('|') || 'navigation-empty'}`)

const contentNavVariants = useUIConfig('contentNavigation')
</script>

<template>
  <UContentNavigation
    :key="navigationKey"
    :highlight="contentNavVariants.highlight ?? true"
    :highlight-color="contentNavVariants.highlightColor"
    :variant="contentNavVariants.variant ?? 'link'"
    :color="contentNavVariants.color"
    :navigation="navigation"
  />
</template>
