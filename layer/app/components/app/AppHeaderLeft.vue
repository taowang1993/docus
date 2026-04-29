<script setup lang="ts">
const appConfig = useAppConfig()
const site = useSiteConfig()
const { isEnabled, locales, localePath } = useDocusI18n()

const ariaLabel = appConfig.header?.title || site.name
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
    <NuxtLink
      :to="localePath('/')"
      :aria-label="ariaLabel"
      class="inline-flex h-9 shrink-0 -translate-y-px items-center leading-none"
    >
      <AppHeaderLogo class="h-6 w-auto shrink-0" />
    </NuxtLink>

    <template v-if="isEnabled && locales.length > 1">
      <ClientOnly>
        <LanguageSelect />

        <template #fallback>
          <div class="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </template>
      </ClientOnly>
    </template>
  </div>
</template>
