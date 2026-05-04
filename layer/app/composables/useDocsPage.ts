import type { ComputedRef, Ref } from 'vue'
import type { Collections } from '@nuxt/content'
import type { DocsCollectionItem } from '../types'
import { findPageHeadline } from '@nuxt/content/utils'
import { kebabCase } from 'scule'

export async function useDocsPage(collectionName: Ref<string> | ComputedRef<string>) {
  const route = useRoute()
  const appConfig = useAppConfig()
  const { shouldPushContent: shouldHideToc } = useAssistant()
  const routePath = route.path
  const routeKey = kebabCase(routePath)
  const navigationAsyncData = useDocsNavigation(collectionName)
  const { data: navigation } = navigationAsyncData

  const [, { data: page }, { data: surround }] = await Promise.all([
    navigationAsyncData,
    useAsyncData(routeKey, () => queryCollection(collectionName.value as keyof Collections).path(routePath).first() as Promise<DocsCollectionItem | null>),
    useAsyncData(`${routeKey}-surround`, () => {
      return queryCollectionItemSurroundings(collectionName.value as keyof Collections, routePath, {
        fields: ['description'],
      })
    }),
  ])

  if (!page.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
  }

  const title = computed(() => page.value?.seo?.title || page.value?.title)
  const description = computed(() => page.value?.seo?.description || page.value?.description)
  const headline = computed(() => findPageHeadline(navigation.value, routePath))
  const breadcrumbs = computed(() => findPageBreadcrumbs(navigation.value, routePath))

  const github = computed(() => appConfig.github ? appConfig.github : null)

  const editLink = computed(() => {
    if (!github.value || !page.value) {
      return undefined
    }

    const contentStem = page.value.stem.replace(/^docs\//, '')

    return [
      github.value.url,
      'edit',
      github.value.branch,
      github.value.rootDir,
      'content',
      `${contentStem}.${page.value.extension}`,
    ].filter(Boolean).join('/')
  })

  addPrerenderPath(`/raw${route.path}.md`)

  return {
    page,
    surround,
    title,
    description,
    headline,
    breadcrumbs,
    github,
    editLink,
    shouldHideToc,
  }
}
