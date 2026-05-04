<script setup lang="ts">
import { useHeaderLayout } from '../../composables/useHeaderLayout'

const { showAskAiButton = false } = defineProps<{
  showAskAiButton?: boolean
}>()

const { classes: headerLayout } = useHeaderLayout()
</script>

<template>
  <div class="flex w-full min-w-0 items-center gap-2">
    <ClientOnly>
      <UContentSearchButton
        :collapsed="false"
        size="lg"
        class="min-w-0 flex-1"
      />
      <template #fallback>
        <div class="min-w-0 flex-1 h-10 rounded-md border border-default bg-default/50" />
      </template>
    </ClientOnly>

    <AskAiButton
      v-if="showAskAiButton"
      :class="headerLayout.desktopAskAiButton"
    />
  </div>
</template>
