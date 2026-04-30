import { createResolver, defineNuxtModule, extendPages } from '@nuxt/kit'
import { getDocusContentConfiguration } from '../utils/knowledge-bases'
import { landingPageExists } from '../utils/pages'

type DocusI18nOptions = { locales?: Array<string | { code: string }> }
type NuxtPage = { file?: string, children?: NuxtPage[] }

function removePagesByFile(pages: NuxtPage[], file: string) {
  for (let index = pages.length - 1; index >= 0; index--) {
    const page = pages[index]

    if (page?.file === file) {
      pages.splice(index, 1)
      continue
    }

    if (page?.children?.length) {
      removePagesByFile(page.children, file)
    }
  }
}

export default defineNuxtModule({
  meta: {
    name: 'routing',
  },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const contentConfiguration = getDocusContentConfiguration(nuxt.options.rootDir)

    const i18nOptions = (nuxt.options as typeof nuxt.options & { i18n?: DocusI18nOptions }).i18n
    const isI18nEnabled = !!i18nOptions?.locales
    const isKnowledgeBaseMode = contentConfiguration.mode === 'kb'

    nuxt.hook('imports:extend', (imports) => {
      if (!imports.some(i => i.name === 'useDocusI18n')) {
        imports.push({
          name: 'useDocusI18n',
          from: resolve('../app/composables/useDocusI18n'),
        })
      }

      if (!imports.some(i => i.name === 'useDocusDocs')) {
        imports.push({
          name: 'useDocusDocs',
          from: resolve('../app/composables/useDocusDocs'),
        })
      }
    })

    extendPages((pages) => {
      const legacyDocsPage = resolve('../app/pages/[[lang]]/[...slug].vue')
      const knowledgeBaseDocsPage = resolve('../app/pages/docs/[kb]/[locale]/[[...slug]].vue')

      if (isKnowledgeBaseMode) {
        removePagesByFile(pages as NuxtPage[], legacyDocsPage)
        removePagesByFile(pages as NuxtPage[], knowledgeBaseDocsPage)

        pages.push({
          name: 'docs-kb-locale-slug',
          path: '/docs/:kb/:locale/:slug(.*)*',
          file: knowledgeBaseDocsPage,
        })
      }

      if (landingPageExists(nuxt.options.rootDir)) {
        return
      }

      const landingTemplate = resolve('../app/templates/landing.vue')

      if (isKnowledgeBaseMode) {
        pages.push({
          name: 'index',
          path: '/',
          file: landingTemplate,
        })
        return
      }

      if (isI18nEnabled) {
        pages.push({
          name: 'lang-index',
          path: '/:lang?',
          file: landingTemplate,
        })
      }
      else {
        pages.push({
          name: 'index',
          path: '/',
          file: landingTemplate,
        })
      }
    })
  },
})
