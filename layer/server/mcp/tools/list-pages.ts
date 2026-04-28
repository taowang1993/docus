import { z } from 'zod'
import { queryCollection } from '@nuxt/content/server'
import type { Collections } from '@nuxt/content'
import { getCollectionsToQuery, getAvailableLocales, isSearchableContentPath } from '../../utils/content'
import { inferSiteURL } from '../../../utils/meta'

export default defineMcpTool({
  description: `Lists all available documentation pages with their categories and basic information.

WHEN TO USE: Use this tool when you need to EXPLORE the documentation structure and browse available pages by title, path, or description. Common scenarios:
- "Show me all getting started guides" - browse introductory content
- "What sections exist for AI features?" - inspect the docs structure
- User asks for categories, sections, or page names
- You need to understand the overall documentation map before drilling down

WHEN NOT TO USE: If the answer may be buried inside page body text, use search-pages first. If you already know the specific page path (e.g., "/en/getting-started/installation"), use get-page directly instead.

WORKFLOW: This tool returns page titles, descriptions, and paths. After finding relevant pages, use get-page to retrieve the full content of specific pages that match the user's needs.

OUTPUT: Returns a structured list with:
- title: Human-readable page name
- path: Exact path for use with get-page
- description: Brief summary of page content
- url: Full URL for reference`,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    locale: z.string().optional().describe('The locale to filter pages by (e.g., "en", "fr")'),
  },
  inputExamples: [
    { locale: 'en' },
    {},
  ],
  cache: '1h',
  handler: async ({ locale }) => {
    const event = useEvent()
    const config = useRuntimeConfig(event).public

    const siteUrl = getRequestURL(event).origin || inferSiteURL()
    const availableLocales = getAvailableLocales(config)
    const collections = getCollectionsToQuery(locale, availableLocales)

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
            locale: collectionName.replace('docs_', ''),
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
