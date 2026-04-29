<script setup lang="ts">
const { showAskAiButton = false } = defineProps<{
  showAskAiButton?: boolean
}>()
</script>

<template>
  <div class="flex w-full min-w-0 items-center gap-2">
    <UContentSearchButton
      :collapsed="false"
      size="lg"
      class="min-w-0 flex-1"
    />

    <AskAiButton
      v-if="showAskAiButton"
      class="hidden shrink-0 sm:inline-flex"
    />
  </div>
</template>
