<script setup lang="ts">
import { useTockDocsColorMode } from '../../composables/useTockDocsColorMode'
import { useSubNavigation } from '../../composables/useSubNavigation'

const appConfig = useAppConfig()
const route = useRoute()
const { forced: forcedColorMode } = useTockDocsColorMode()

const { isEnabled: isAssistantEnabled } = useAssistant()
const { subNavigationMode } = useSubNavigation()

const showAskAiButton = computed(() => isAssistantEnabled.value && route.meta.layout === 'docs')

const links = computed(() => appConfig.github && appConfig.github.url
  ? [
      {
        'icon': 'i-simple-icons-github',
        'to': appConfig.github.url,
        'target': '_blank',
        'aria-label': 'GitHub',
      },
    ]
  : [])
</script>

<template>
  <UHeader
    :ui="{ center: 'min-w-0 flex-1', right: 'flex items-center gap-1 shrink-0' }"
    :class="{ 'flex flex-col': subNavigationMode === 'header' }"
  >
    <AppHeaderCenter :show-ask-ai-button="showAskAiButton" />

    <template #left>
      <AppHeaderLeft />
    </template>

    <template #right>
      <AppHeaderCTA />

      <UContentSearchButton
        size="lg"
        class="shrink-0 lg:hidden"
      />

      <AskAiButton
        v-if="showAskAiButton"
        mobile
        class="shrink-0 sm:hidden"
      />

      <ClientOnly v-if="!forcedColorMode">
        <UColorModeButton />

        <template #fallback>
          <div class="h-8 w-8 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        </template>
      </ClientOnly>

      <template v-if="links?.length">
        <UButton
          v-for="(link, index) of links"
          :key="index"
          class="shrink-0"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>
    </template>

    <template #toggle="{ open, toggle }">
      <IconMenuToggle
        :open="open"
        class="lg:hidden"
        @click="toggle"
      />
    </template>

    <template #body>
      <AppHeaderBody />
    </template>

    <template
      v-if="subNavigationMode === 'header'"
      #bottom
    >
      <AppHeaderBottom />
    </template>
  </UHeader>
</template>
