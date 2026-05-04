<script setup lang="ts">
import type { DocsCollectionItem } from '../../types'

definePageMeta({
  layout: 'docs',
})

const { t } = useTockDocsI18n()
const docs = useTockDocs()

if (docs.mode.value === 'kb') {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const {
  page,
  surround,
  title,
  description,
  headline,
  breadcrumbs,
  github,
  editLink,
  shouldHideToc,
} = await useDocsPage(docs.collectionName)

useSeo({
  title,
  description,
  type: 'article',
  modifiedAt: computed(() => (page.value as unknown as Record<string, unknown>)?.modifiedAt as string | undefined),
  breadcrumbs,
})

defineOgImage('Docs', {
  headline: headline.value,
  title: title.value?.slice(0, 60),
  description: formatOgDescription(title.value, description.value),
})
</script>

<template>
  <UPage
    v-if="page"
    :key="`page-${shouldHideToc}`"
  >
    <UPageHeader
      :title="page.title"
      :description="page.description"
      :headline="headline"
      :ui="{
        wrapper: 'flex-row items-center flex-wrap justify-between',
      }"
    >
      <template #links>
        <UButton
          v-for="(link, index) in (page as DocsCollectionItem).links"
          :key="index"
          size="sm"
          v-bind="link"
        />

        <DocsPageHeaderLinks />
      </template>
    </UPageHeader>

    <UPageBody>
      <ContentRenderer
        v-if="page"
        :value="page"
      />

      <USeparator v-if="github">
        <div class="flex items-center gap-2 text-sm text-muted">
          <UButton
            variant="link"
            color="neutral"
            :to="editLink"
            target="_blank"
            icon="i-lucide-pen"
            :ui="{ leadingIcon: 'size-4' }"
          >
            {{ t('docs.edit') }}
          </UButton>
          <template v-if="github?.url">
            <span>{{ t('common.or') }}</span>
            <UButton
              variant="link"
              color="neutral"
              :to="`${github.url}/issues/new/choose`"
              target="_blank"
              icon="i-lucide-alert-circle"
              :ui="{ leadingIcon: 'size-4' }"
            >
              {{ t('docs.report') }}
            </UButton>
          </template>
        </div>
      </USeparator>
      <UContentSurround :surround="surround" />
    </UPageBody>

    <template
      v-if="page?.body?.toc?.links?.length && !shouldHideToc"
      #right
    >
      <DocsAsideRight
        :page="page"
      />
    </template>
  </UPage>
</template>
