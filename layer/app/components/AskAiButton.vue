<script setup lang="ts">
const props = defineProps<{
  mobile?: boolean
}>()

const { isOpen, toggle } = useAssistant()
const { t } = useDocusI18n()

const label = computed(() => t('assistant.title'))
const testId = computed(() => props.mobile ? 'ask-ai-btn-mobile' : 'ask-ai-btn')
const buttonClass = computed(() => {
  if (props.mobile) {
    return 'size-9 justify-center rounded-lg text-sm font-semibold shadow-xs'
  }

  return isOpen.value
    ? 'rounded-lg px-3.5 py-2 text-sm font-semibold text-highlighted shadow-xs'
    : 'rounded-lg px-3.5 py-2 text-sm font-semibold shadow-xs'
})
</script>

<template>
  <UButton
    :data-testid="testId"
    color="neutral"
    variant="outline"
    icon="i-lucide-sparkles"
    :label="props.mobile ? undefined : label"
    :aria-label="props.mobile ? label : undefined"
    :aria-pressed="isOpen"
    :class="buttonClass"
    :ui="{ leadingIcon: 'size-4 text-primary' }"
    @click="toggle"
  />
</template>
