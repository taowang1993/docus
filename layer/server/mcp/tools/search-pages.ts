import { z } from 'zod'
import { searchDocs } from '../../utils/docs-search'

export default defineMcpTool({
  description: `Searches the full documentation corpus, including page body content, headings, titles, descriptions, and paths.

WHEN TO USE: Use this tool for factual questions, feature lookups, troubleshooting, configuration details, or anything that might be mentioned inside page content rather than just in page titles. Common scenarios:
- "How do I configure markdown rewrites?"
- "Where is async context enabled?"
- "What environment variable controls the site URL?"
- User asks with typos or approximate wording

WHEN NOT TO USE: If the user wants to browse the documentation structure, use list-pages. If you already know the exact page path and need the full markdown, use get-page.

WORKFLOW: Search first to find the most relevant pages. Then use get-page for the best match when you need full context, code examples, or precise wording.

OUTPUT: Returns ranked documentation matches with title, description, path, locale, full page URL, and a short excerpt.`,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    query: z.string().describe('The search query. Natural language questions, keywords, and slightly misspelled terms are all supported.'),
    limit: z.number().int().min(1).max(20).optional().describe('Maximum number of results to return. Defaults to 5.'),
    locale: z.string().optional().describe('Optional locale code to scope results (for example: "en" or "fr").'),
  },
  inputExamples: [
    { query: 'How do I customize llms domain?', locale: 'en' },
    { query: 'markdwon rewrites' },
  ],
  cache: '1h',
  handler: async ({ query, limit, locale }) => {
    const event = useEvent()

    try {
      return await searchDocs(event, {
        query,
        limit,
        locale,
      })
    }
    catch {
      throw createError({ statusCode: 500, message: 'Failed to search pages' })
    }
  },
})
