<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const isOpen = defineModel<boolean>({ required: true })
const isMobile = useMediaQuery('(max-width: 767px)')
const { t } = useTockDocsI18n()

const menuTitle = computed(() => t('docs.menu'))

function close() {
  isOpen.value = false
}
</script>

<template>
  <!-- Mobile: Nuxt UI Slideover -->
  <USlideover
    v-if="isMobile"
    v-model:open="isOpen"
    side="left"
    :ui="{ content: 'ring-0 bg-default' }"
  >
    <template #content>
      <div class="flex h-full flex-col">
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-default px-4">
          <span class="text-base font-semibold text-highlighted">{{ menuTitle }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-muted hover:text-highlighted"
            @click="close"
          />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <AppHeaderBody />
        </div>
      </div>
    </template>
  </USlideover>

  <!-- Desktop: custom sidebar with backdrop -->
  <template v-else>
    <!-- Backdrop overlay -->
    <div
      :class="[
        'fixed inset-0 z-[60] bg-black/30 transition-opacity duration-200',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      ]"
      @click="close"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed left-0 top-0 z-[60] h-dvh w-72 border-r border-default bg-default shadow-xl transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-full flex-col">
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-default px-4">
          <span class="text-base font-semibold text-highlighted">{{ menuTitle }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-muted hover:text-highlighted"
            @click="close"
          />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <AppHeaderBody />
        </div>
      </div>
    </aside>
  </template>
</template>
