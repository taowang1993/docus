<script setup lang="ts">
const { locale, locales, switchLocalePath } = useDocusI18n()

const currentLocaleLabel = computed(() => {
  const currentLocale = locales.find(localeItem => localeItem.code === locale.value)

  return currentLocale?.name || locale.value.toUpperCase()
})
</script>

<template>
  <UPopover :content="{ align: 'start', sideOffset: 8 }">
    <template #default="{ open }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :label="currentLocaleLabel"
        aria-haspopup="menu"
        :aria-expanded="open"
        class="h-9 rounded-lg bg-default px-3 text-sm font-medium shadow-none ring ring-inset ring-transparent transition-colors hover:text-highlighted hover:ring-default focus-visible:ring-default"
        :class="open ? 'text-highlighted ring-default' : 'text-default'"
        :ui="{ label: 'truncate' }"
      >
        <template #trailing>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-3.5 shrink-0 transition-transform duration-200 ease-out"
            :class="open ? 'rotate-180' : 'rotate-0'"
          />
        </template>
      </UButton>
    </template>

    <template #content>
      <div class="w-40 max-w-[calc(100vw-1rem)] px-1">
        <div class="language-select-scrollbar max-h-80 overflow-y-auto py-1">
          <NuxtLink
            v-for="localeItem in locales"
            :key="localeItem.code"
            :to="switchLocalePath(localeItem.code) as string"
            :aria-label="localeItem.name"
            class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-elevated hover:text-highlighted"
            :class="localeItem.code === locale ? 'bg-elevated font-medium text-highlighted' : 'text-muted'"
            :aria-current="localeItem.code === locale ? 'page' : undefined"
          >
            <span class="min-w-0 flex-1 truncate">
              {{ localeItem.name }}
            </span>

            <UIcon
              v-if="localeItem.code === locale"
              name="i-lucide-check"
              class="size-4 shrink-0 text-primary"
            />
          </NuxtLink>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
.language-select-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--ui-bg) 84%, var(--ui-border-muted) 16%) var(--ui-bg);
}

.language-select-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.language-select-scrollbar::-webkit-scrollbar-track {
  background: var(--ui-bg);
}

.language-select-scrollbar::-webkit-scrollbar-thumb {
  background: color-mix(in oklab, var(--ui-bg) 84%, var(--ui-border-muted) 16%);
  border: 2px solid var(--ui-bg);
  border-radius: 9999px;
}
</style>
