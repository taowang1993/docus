import { createResolver, defineNuxtModule, extendPages } from '@nuxt/kit'
import { getDocusContentConfiguration } from '../utils/knowledge-bases'
import { landingPageExists } from '../utils/pages'

type DocusI18nOptions = { locales?: Array<string | { code: string }> }

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

    if (!landingPageExists(nuxt.options.rootDir)) {
      extendPages((pages) => {
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
    }
  },
})
