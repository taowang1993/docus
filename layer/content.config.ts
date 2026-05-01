import type { DefinedCollection } from '@nuxt/content'
import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { useNuxt } from '@nuxt/kit'
import { join } from 'node:path'
import { getDocsCollectionName } from './utils/docs'
import { getTockDocsContentConfiguration } from './utils/knowledge-bases'
import { landingPageExists, docsFolderExists } from './utils/pages'

const { options } = useNuxt()
const cwd = join(options.rootDir, 'content')
const locales = options.i18n?.locales
const contentConfiguration = getTockDocsContentConfiguration(options.rootDir)

const hasLandingPage = landingPageExists(options.rootDir)
const hasDocsFolder = docsFolderExists(options.rootDir)

const createDocsSchema = () => z.object({
  links: z.array(z.object({
    label: z.string(),
    icon: z.string(),
    to: z.string(),
    target: z.string().optional(),
  })).optional(),
})

let collections: Record<string, DefinedCollection>

if (contentConfiguration.mode === 'kb') {
  collections = {}

  if (contentConfiguration.hasSiteContent) {
    collections.site = defineCollection({
      type: 'page',
      source: {
        cwd,
        include: 'site/**/*',
        prefix: '/',
      },
      schema: createDocsSchema(),
    })
  }

  for (const knowledgeBase of contentConfiguration.knowledgeBases) {
    for (const locale of knowledgeBase.locales) {
      collections[getDocsCollectionName({
        mode: 'kb',
        kb: knowledgeBase.id,
        locale,
      })] = defineCollection({
        type: 'page',
        source: {
          cwd,
          include: `${knowledgeBase.sourceDir}/${locale}/**/*`,
          prefix: `/docs/${knowledgeBase.id}/${locale}`,
        },
        schema: createDocsSchema(),
      })
    }
  }
}
else if (locales && Array.isArray(locales)) {
  collections = {}

  for (const locale of locales) {
    const code = (typeof locale === 'string' ? locale : locale.code).replace('-', '_')
    const hasLocaleDocs = docsFolderExists(options.rootDir, code)

    if (!hasLandingPage) {
      collections[`landing_${code}`] = defineCollection({
        type: 'page',
        source: {
          cwd,
          include: `${code}/index.md`,
        },
      })
    }

    collections[`docs_${code}`] = defineCollection({
      type: 'page',
      source: {
        cwd,
        include: hasLocaleDocs ? `${code}/docs/**` : `${code}/**/*`,
        prefix: hasLocaleDocs ? `/${code}/docs` : `/${code}`,
        exclude: [`${code}/index.md`],
      },
      schema: createDocsSchema(),
    })
  }
}
else {
  collections = {
    docs: defineCollection({
      type: 'page',
      source: {
        cwd,
        include: hasDocsFolder ? 'docs/**' : '**',
        prefix: hasDocsFolder ? '/docs' : '/',
        exclude: ['index.md'],
      },
      schema: createDocsSchema(),
    }),
  }

  if (!hasLandingPage) {
    collections.landing = defineCollection({
      type: 'page',
      source: {
        cwd,
        include: 'index.md',
      },
    })
  }
}

export default defineContentConfig({ collections })
