<script setup lang="ts">
import { useHeaderLayout } from '../../composables/useHeaderLayout'

const { showAskAiButton = false } = defineProps<{
  showAskAiButton?: boolean
}>()

const { classes: headerLayout } = useHeaderLayout()

// Detect the platform and set the correct keyboard shortcut label.
// Default to Mac (⌘) since most developer doc users are on macOS;
// correct on the client after mount for Windows/Linux users.
const kbds = ref(['⌘', 'K'])

onMounted(() => {
  if (import.meta.client) {
    const ua = navigator.userAgent || ''
    const platform = navigator.platform || ''
    const isMac = /Mac|iPhone|iPad|iPod/.test(ua) || /Mac/.test(platform)
    if (!isMac) {
      kbds.value = ['Ctrl', 'K']
    }
  }
})
</script>

<template>
  <div class="flex w-full min-w-0 items-center gap-2">
    <UContentSearchButton
      :collapsed="false"
      :kbds="kbds"
      size="lg"
      class="min-w-0 flex-1"
    />

    <AskAiButton
      v-if="showAskAiButton"
      :class="headerLayout.desktopAskAiButton"
    />
  </div>
</template>
