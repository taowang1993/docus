<script setup lang="ts">
const docs = useTockDocs()

const knowledgeBases = computed(() => docs.knowledgeBases.value)
const currentKnowledgeBase = computed(() => docs.activeKnowledgeBase.value)
const currentLabel = computed(() => currentKnowledgeBase.value?.title || 'Knowledge base')
</script>

<template>
  <UPopover :content="{ align: 'start', sideOffset: 8 }">
    <template #default="{ open }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :label="currentLabel"
        aria-haspopup="menu"
        :aria-expanded="open"
        class="h-9 rounded-lg bg-default px-3 text-sm font-medium shadow-none ring ring-inset ring-transparent transition-colors hover:text-highlighted hover:ring-default focus-visible:ring-default"
        :class="open ? 'text-highlighted ring-default' : 'text-default'"
        :ui="{ label: 'truncate max-w-32' }"
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
      <div class="flex w-56 max-w-[calc(100vw-1rem)] flex-col gap-1 px-1 py-1">
        <NuxtLink
          v-for="knowledgeBase in knowledgeBases"
          :key="knowledgeBase.id"
          :to="docs.switchKnowledgeBasePath(knowledgeBase.id)"
          class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-elevated hover:text-highlighted"
          :class="knowledgeBase.id === currentKnowledgeBase?.id ? 'bg-elevated font-medium text-highlighted' : 'text-muted'"
          :aria-current="knowledgeBase.id === currentKnowledgeBase?.id ? 'page' : undefined"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium">
              {{ knowledgeBase.title }}
            </div>
            <div class="truncate text-xs text-dimmed">
              {{ knowledgeBase.description || knowledgeBase.id }}
            </div>
          </div>

          <UIcon
            v-if="knowledgeBase.id === currentKnowledgeBase?.id"
            name="i-lucide-check"
            class="size-4 shrink-0 text-primary"
          />
        </NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
