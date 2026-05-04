<script setup lang="ts">
import { useHeaderLayout } from '../../composables/useHeaderLayout'
import { useShortcutDisplayKeys } from '../../composables/useShortcutDisplayKeys'

const { showAskAiButton = false } = defineProps<{
  showAskAiButton?: boolean
}>()

const { isAssistantDocked, classes: headerLayout } = useHeaderLayout()
const { displayKeys } = useShortcutDisplayKeys()
const searchKbds = computed(() => isAssistantDocked.value ? [] : displayKeys('meta_k'))
</script>

<template>
  <div class="flex w-full min-w-0 items-center gap-2">
    <UContentSearchButton
      v-if="!isAssistantDocked"
      :collapsed="false"
      :kbds="searchKbds"
      size="lg"
      class="min-w-0 flex-1"
    />

    <AskAiButton
      v-if="showAskAiButton"
      :class="headerLayout.desktopAskAiButton"
    />
  </div>
</template>
