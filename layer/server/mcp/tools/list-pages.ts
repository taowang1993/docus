import { z } from 'zod'
import { queryCollection } from '@nuxt/content/server'
import type { Collections } from '@nuxt/content'
import { getCollectionsToQuery, getScopedKnowledgeBaseAndLocale, isSearchableContentPath } from '../../utils/content'
import { inferSiteURL } from '../../../utils/meta'

export default defineMcpTool({
  description: `Lists available documentation pages with their titles, paths, and descriptions.

WHEN TO USE: Use this tool when you need to explore the documentation structure, browse sections, or inspect available page titles.

WHEN NOT TO USE: If the answer may be buried inside page body text, use search-pages first. If you already know the exact page path, use get-page directly.

This tool is knowledge-base aware. In multi-KB sites you can scope results with kb and locale.`,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    kb: z.string().optional().describe('Optional knowledge base id to scope results (for example: "platform" or "parser").'),
    locale: z.string().optional().describe('Optional locale code to scope results (for example: "en" or "fr").'),
  },
  inputExamples: [
    { kb: 'platform', locale: 'en' },
    { locale: 'fr' },
    {},
  ],
  cache: '1h',
  handler: async ({ kb, locale }) => {
    const event = useEvent()
    const config = useRuntimeConfig(event).public as Parameters<typeof getCollectionsToQuery>[1]

    const scoped = getScopedKnowledgeBaseAndLocale(event, { kb, locale })
    const siteUrl = getRequestURL(event).origin || inferSiteURL()
    const collections = getCollectionsToQuery(scoped, config)

    try {
      const allPages = await Promise.all(
        collections.map(async (collectionName) => {
          const pages = (await queryCollection(event, collectionName as keyof Collections)
            .select('title', 'path', 'description')
            .all())
            .filter(page => isSearchableContentPath(page.path || ''))

          return pages.map(page => ({
            title: page.title,
            path: page.path,
            description: page.description,
            url: `${siteUrl}${page.path}`,
          }))
        }),
      )

      return allPages.flat()
    }
    catch {
      throw createError({ statusCode: 500, message: 'Failed to list pages' })
    }
  },
})
