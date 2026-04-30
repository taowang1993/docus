import type { ComputedRef, Ref } from 'vue'
import type { Collections, ContentNavigationItem, DocsCollectionItem } from '@nuxt/content'
import { findPageHeadline } from '@nuxt/content/utils'
import { kebabCase } from 'scule'

export async function useDocsPage(collectionName: Ref<string> | ComputedRef<string>) {
  const route = useRoute()
  const appConfig = useAppConfig()
  const navigation = inject<Ref<ContentNavigationItem[]>>('navigation', ref([]))
  const { shouldPushContent: shouldHideToc } = useAssistant()

  const [{ data: page }, { data: surround }] = await Promise.all([
    useAsyncData(kebabCase(route.path), () => queryCollection(collectionName.value as keyof Collections).path(route.path).first() as Promise<DocsCollectionItem>),
    useAsyncData(`${kebabCase(route.path)}-surround`, () => {
      return queryCollectionItemSurroundings(collectionName.value as keyof Collections, route.path, {
        fields: ['description'],
      })
    }),
  ])

  if (!page.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
  }

  const title = computed(() => page.value?.seo?.title || page.value?.title)
  const description = computed(() => page.value?.seo?.description || page.value?.description)
  const headline = ref(findPageHeadline(navigation?.value, page.value?.path))
  const breadcrumbs = computed(() => findPageBreadcrumbs(navigation?.value, page.value?.path || ''))

  watch(() => navigation?.value, () => {
    headline.value = findPageHeadline(navigation?.value, page.value?.path) || headline.value
  })

  const github = computed(() => appConfig.github ? appConfig.github : null)

  const editLink = computed(() => {
    if (!github.value || !page.value) {
      return undefined
    }

    return [
      github.value.url,
      'edit',
      github.value.branch,
      github.value.rootDir,
      'content',
      `${page.value.stem}.${page.value.extension}`,
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
