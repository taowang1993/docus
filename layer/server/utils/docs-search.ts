import { Document } from 'flexsearch'
import Fuse from 'fuse.js'
import type { IFuseOptions } from 'fuse.js'
import { queryCollection } from '@nuxt/content/server'
import type { Collections } from '@nuxt/content'
import type { H3Event } from 'h3'
import { inferSiteURL } from '../../utils/meta'
import { getAvailableLocales, isSearchableContentPath } from './content'

type SearchIndexDocument = {
  id: string
  path: string
  locale: string
  title: string
  description: string
  headings: string
  pathTokens: string
  content: string
  rawContent: string
}

type SearchResultCandidate = {
  doc: SearchIndexDocument
  flexIndex?: number
  fuseIndex?: number
  fuseScore?: number
}

export type DocusSearchResult = {
  title: string
  description: string
  path: string
  url: string
  locale?: string
  excerpt: string
}

type DocsSearchIndex = {
  flex: Document<SearchIndexDocument>
  fuse: Fuse<SearchIndexDocument>
  documents: SearchIndexDocument[]
  byId: Map<string, SearchIndexDocument>
}

const EXCERPT_LENGTH = 420
const EXCERPT_RADIUS = 180
const FLEXSEARCH_LIMIT_MULTIPLIER = 6
const FLEXSEARCH_FALLBACK_MIN_RESULTS = 3

const fuseOptions: IFuseOptions<SearchIndexDocument> = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.35,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.36 },
    { name: 'headings', weight: 0.24 },
    { name: 'pathTokens', weight: 0.16 },
    { name: 'description', weight: 0.14 },
    { name: 'content', weight: 0.1 },
  ],
}

let docsSearchPromise: Promise<DocsSearchIndex> | null = null

function logDocsSearch(step: string, data: Record<string, unknown>) {
  console.info(`[docus-docs-search] ${JSON.stringify({ step, ...data })}`)
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeForMatch(value: string) {
  return normalizeWhitespace(value).toLowerCase()
}

function stripFrontmatter(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, '\n')

  if (!normalized.startsWith('---\n')) {
    return normalized.trim()
  }

  const endOfFrontmatter = normalized.indexOf('\n---\n', 4)
  if (endOfFrontmatter === -1) {
    return normalized.trim()
  }

  return normalized.slice(endOfFrontmatter + 5).replace(/^\n+/, '').trim()
}

function extractHeadings(markdown: string) {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => /^#{1,6}\s/.test(line))
    .map(line => line.replace(/^#{1,6}\s+/, '').trim())
    .filter(Boolean)
    .join('\n')
}

function getPathTokens(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => segment.replace(/[-_]+/g, ' '))
    .join(' ')
}

function normalizeLocale(collectionName: string) {
  return collectionName.startsWith('docs_') ? collectionName.slice(5) : ''
}

function getOrigin(event: H3Event) {
  return getRequestURL(event).origin || inferSiteURL() || ''
}

function normalizeQueryTerms(query: string) {
  return [...new Set(
    normalizeForMatch(query)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(term => term.length >= 2),
  )]
}

function buildSearchExcerpt(content: string, query: string) {
  const normalizedContent = normalizeWhitespace(content)
  const lowerContent = normalizedContent.toLowerCase()
  const queryTerms = normalizeQueryTerms(query)

  const matchIndex = queryTerms
    .map(term => lowerContent.indexOf(term))
    .find(index => index >= 0) ?? 0

  const start = Math.max(0, matchIndex - EXCERPT_RADIUS)
  const end = Math.min(normalizedContent.length, start + EXCERPT_LENGTH)
  const excerpt = normalizedContent.slice(start, end).trim()

  if (start === 0 && end === normalizedContent.length) {
    return excerpt
  }

  return `${start > 0 ? '…' : ''}${excerpt}${end < normalizedContent.length ? '…' : ''}`
}

function getFieldMatchScore(text: string, queryTerms: string[]) {
  if (!text) return 0

  const normalizedText = normalizeForMatch(text)
  const fullQuery = normalizeWhitespace(queryTerms.join(' '))
  let score = 0

  if (fullQuery && normalizedText.includes(fullQuery)) {
    score += 2
  }

  for (const term of queryTerms) {
    if (normalizedText.includes(term)) {
      score += 1
    }
  }

  return score
}

function scoreCandidate(candidate: SearchResultCandidate, query: string) {
  const queryTerms = normalizeQueryTerms(query)
  const { doc } = candidate

  let score = 0
  score += getFieldMatchScore(doc.title, queryTerms) * 140
  score += getFieldMatchScore(doc.headings, queryTerms) * 110
  score += getFieldMatchScore(doc.description, queryTerms) * 80
  score += getFieldMatchScore(doc.pathTokens, queryTerms) * 70
  score += getFieldMatchScore(doc.content, queryTerms) * 35

  if (candidate.flexIndex !== undefined) {
    score += 320 - candidate.flexIndex * 12
  }

  if (candidate.fuseIndex !== undefined) {
    score += 120 - candidate.fuseIndex * 6
  }

  if (candidate.fuseScore !== undefined) {
    score += Math.round((1 - candidate.fuseScore) * 100)
  }

  return score
}

function isQueryWeakForFlex(results: SearchResultCandidate[], limit: number) {
  return results.length < Math.min(Math.max(limit, 1), FLEXSEARCH_FALLBACK_MIN_RESULTS)
}

function flattenFlexResults(results: unknown): Array<{ doc?: SearchIndexDocument, id?: string }> {
  if (!Array.isArray(results)) {
    return []
  }

  return results.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }

    if ('doc' in item || 'id' in item) {
      return [item as { doc?: SearchIndexDocument, id?: string }]
    }

    if ('result' in item) {
      return flattenFlexResults((item as { result?: unknown }).result)
    }

    return []
  })
}

function normalizeFlexResults(rawResults: unknown, byId: Map<string, SearchIndexDocument>) {
  return flattenFlexResults(rawResults)
    .map((item) => {
      if (item.doc) {
        return item.doc
      }

      if (item.id) {
        return byId.get(item.id)
      }

      return undefined
    })
    .filter((doc): doc is SearchIndexDocument => Boolean(doc))
}

async function getCollectionDocuments(event: H3Event, collectionName: string) {
  const pages = (await queryCollection(event, collectionName as keyof Collections)
    .select('title', 'path', 'description')
    .all())
    .filter(page => isSearchableContentPath(page.path || ''))

  const locale = normalizeLocale(collectionName)

  return Promise.all(pages.map(async (page) => {
    let markdown = ''

    try {
      markdown = await event.$fetch<string>(`/raw${page.path}.md`)
    }
    catch {
      markdown = [page.title, page.description].filter(Boolean).join('\n\n')
    }

    const rawContent = stripFrontmatter(markdown)

    return {
      id: page.path,
      path: page.path,
      locale,
      title: page.title || page.path,
      description: page.description || '',
      headings: extractHeadings(rawContent),
      pathTokens: getPathTokens(page.path),
      rawContent,
      content: [page.title, page.description, rawContent].filter(Boolean).join('\n\n'),
    } satisfies SearchIndexDocument
  }))
}

async function createDocsSearch(event: H3Event): Promise<DocsSearchIndex> {
  const startedAt = performance.now()
  const config = useRuntimeConfig(event).public
  const availableLocales = getAvailableLocales(config)
  const collections = availableLocales.length > 0
    ? availableLocales.map(locale => `docs_${locale}`)
    : ['docs']

  const documents = (await Promise.all(collections.map(collectionName => getCollectionDocuments(event, collectionName)))).flat()

  logDocsSearch('build_index', {
    requestPath: getRequestURL(event).pathname,
    docCount: documents.length,
    collections,
    durationMs: Number((performance.now() - startedAt).toFixed(1)),
  })

  const flex = new Document<SearchIndexDocument>({
    document: {
      id: 'id',
      index: ['title', 'description', 'headings', 'pathTokens', 'content'],
      store: true,
    },
    tokenize: 'forward',
  })

  for (const document of documents) {
    flex.add(document)
  }

  return {
    flex,
    fuse: new Fuse(documents, fuseOptions),
    documents,
    byId: new Map(documents.map(document => [document.id, document])),
  }
}

async function getDocsSearch(event: H3Event) {
  if (import.meta.dev) {
    return createDocsSearch(event)
  }

  docsSearchPromise ??= createDocsSearch(event).catch((error) => {
    docsSearchPromise = null
    throw error
  })
  return docsSearchPromise
}

function toSearchResult(event: H3Event, doc: SearchIndexDocument, query: string): DocusSearchResult {
  return {
    title: doc.title,
    description: doc.description,
    path: doc.path,
    url: `${getOrigin(event)}${doc.path}`,
    locale: doc.locale || undefined,
    excerpt: buildSearchExcerpt(doc.rawContent, query),
  }
}

export async function searchDocs(event: H3Event, {
  query,
  limit = 5,
  locale,
}: {
  query: string
  limit?: number
  locale?: string
}): Promise<DocusSearchResult[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const search = await getDocsSearch(event)
  const effectiveLimit = Math.max(1, Math.min(limit, 20))
  const overfetchLimit = Math.max(effectiveLimit * FLEXSEARCH_LIMIT_MULTIPLIER, 12)

  const flexRawResults = await search.flex.searchAsync(trimmedQuery, {
    enrich: true,
    merge: true,
    limit: overfetchLimit,
  })

  const filteredDocuments = locale
    ? search.documents.filter(document => document.locale === locale)
    : search.documents

  const candidates = new Map<string, SearchResultCandidate>()

  for (const [index, doc] of normalizeFlexResults(flexRawResults, search.byId).entries()) {
    if (locale && doc.locale !== locale) {
      continue
    }

    candidates.set(doc.id, {
      doc,
      ...candidates.get(doc.id),
      flexIndex: index,
    })
  }

  let usedFuseFallback = false

  if (isQueryWeakForFlex([...candidates.values()], effectiveLimit)) {
    usedFuseFallback = true
    const fuse = locale
      ? new Fuse(filteredDocuments, fuseOptions)
      : search.fuse

    const fuseResults = fuse.search(trimmedQuery, { limit: overfetchLimit })

    for (const [index, result] of fuseResults.entries()) {
      const existing = candidates.get(result.item.id)
      candidates.set(result.item.id, {
        doc: result.item,
        flexIndex: existing?.flexIndex,
        fuseIndex: Math.min(existing?.fuseIndex ?? Number.POSITIVE_INFINITY, index),
        fuseScore: existing?.fuseScore === undefined
          ? result.score
          : Math.min(existing.fuseScore, result.score ?? 1),
      })
    }
  }

  const results = [...candidates.values()]
    .sort((left, right) => scoreCandidate(right, trimmedQuery) - scoreCandidate(left, trimmedQuery))
    .slice(0, effectiveLimit)
    .map(candidate => toSearchResult(event, candidate.doc, trimmedQuery))

  logDocsSearch('search', {
    requestPath: getRequestURL(event).pathname,
    query: trimmedQuery,
    locale,
    limit: effectiveLimit,
    candidateCount: candidates.size,
    usedFuseFallback,
    resultCount: results.length,
    topPaths: results.map(result => result.path),
  })

  return results
}
