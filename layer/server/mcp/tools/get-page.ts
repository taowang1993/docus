import { z } from 'zod'
import { queryCollection } from '@nuxt/content/server'
import type { Collections } from '@nuxt/content'
import { getCollectionFromPath, isSearchableContentPath } from '../../utils/content'
import { inferSiteURL } from '../../../utils/meta'

export default defineMcpTool({
  description: `Retrieves the full content and metadata for a specific documentation page.

WHEN TO USE: Use this tool when you already know the exact page path and want the full markdown.

WHEN NOT TO USE: If you do not know the exact path, use search-pages or list-pages first.

The path should include the full routed path. In KB-first sites that means paths like /docs/platform/en/getting-started.`,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    path: z.string().describe('The exact page path (for example: /docs/platform/en/getting-started or /en/getting-started/installation).'),
  },
  inputExamples: [
    { path: '/docs/platform/en/getting-started/installation' },
    { path: '/en/getting-started/installation' },
  ],
  cache: '1h',
  handler: async ({ path }) => {
    const event = useEvent()
    const config = useRuntimeConfig(event).public as Parameters<typeof getCollectionFromPath>[1]
    const siteUrl = getRequestURL(event).origin || inferSiteURL()

    if (!isSearchableContentPath(path)) {
      throw createError({ statusCode: 404, message: 'Page not found' })
    }

    const collectionName = getCollectionFromPath(path, config)

    try {
      const page = await queryCollection(event, collectionName as keyof Collections)
        .where('path', '=', path)
        .select('title', 'path', 'description')
        .first()

      if (!page) {
        throw createError({ statusCode: 404, message: 'Page not found' })
      }

      const content = await event.$fetch<string>(`/raw${path}.md`)

      return {
        title: page.title,
        path: page.path,
        description: page.description,
        content,
        url: `${siteUrl}${page.path}`,
      }
    }
    catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) throw error
      throw createError({ statusCode: 500, message: 'Failed to get page' })
    }
  },
})
