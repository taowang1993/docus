<script setup lang="ts">
const props = defineProps<{
  value: string
  class?: string | string[] | Record<string, boolean>
  ui?: object
}>()

defineSlots()

const { displayKey } = useShortcutDisplayKeys()
const resolvedValue = computed(() => displayKey(props.value))
</script>

<template>
  <UKbd
    :value="resolvedValue"
    class="align-text-top"
    :class="props.class"
    :ui="props.ui"
  />
</template>
