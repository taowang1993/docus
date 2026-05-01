import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { TockDocsKnowledgeBase } from './docs'

export interface ResolvedKnowledgeBase extends TockDocsKnowledgeBase {
  sourceDir: string
}

export interface TockDocsContentConfiguration {
  mode: 'legacy' | 'kb'
  knowledgeBases: ResolvedKnowledgeBase[]
  hasSiteContent: boolean
}

type KnowledgeBaseConfig = Partial<TockDocsKnowledgeBase> & {
  locales?: Array<string | { code?: string }>
}

function titleize(value: string) {
  return value
    .split(/[-_]+/g)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function normalizeLocaleEntry(locale: string | { code?: string }) {
  return typeof locale === 'string' ? locale : locale.code || ''
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function readKnowledgeBaseConfig(filePath: string): KnowledgeBaseConfig {
  try {
    return (parse(readFileSync(filePath, 'utf8')) as KnowledgeBaseConfig) || {}
  }
  catch {
    return {}
  }
}

function getKnowledgeBaseLocales(contentDir: string, configuredLocales: KnowledgeBaseConfig['locales']) {
  const discoveredLocales = existsSync(contentDir)
    ? readdirSync(contentDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
    : []

  const configured = configuredLocales?.map(normalizeLocaleEntry) || []
  return unique(configured.length > 0 ? configured : discoveredLocales)
}

export function resolveKnowledgeBases(rootDir: string): ResolvedKnowledgeBase[] {
  const contentDir = join(rootDir, 'content')

  if (!existsSync(contentDir)) {
    return []
  }

  const knowledgeBases: ResolvedKnowledgeBase[] = []

  for (const entry of readdirSync(contentDir, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const kbConfigPath = join(contentDir, entry.name, 'kb.yml')

    if (!existsSync(kbConfigPath)) {
      continue
    }

    const config = readKnowledgeBaseConfig(kbConfigPath)
    const locales = getKnowledgeBaseLocales(join(contentDir, entry.name), config.locales)

    if (locales.length === 0) {
      continue
    }

    const defaultLocale = config.defaultLocale && locales.includes(config.defaultLocale)
      ? config.defaultLocale
      : locales[0]

    if (!defaultLocale) {
      continue
    }

    knowledgeBases.push({
      id: config.id || entry.name,
      sourceDir: entry.name,
      title: config.title || titleize(config.id || entry.name),
      description: config.description || '',
      icon: config.icon || 'i-lucide-book-open',
      locales,
      defaultLocale,
      entry: config.entry,
      theme: config.theme,
      searchPlaceholder: config.searchPlaceholder,
      assistantName: config.assistantName,
    })
  }

  return knowledgeBases.sort((left, right) => left.title.localeCompare(right.title))
}

export function getTockDocsContentConfiguration(rootDir: string): TockDocsContentConfiguration {
  const knowledgeBases = resolveKnowledgeBases(rootDir)
  const hasSiteContent = existsSync(join(rootDir, 'content', 'site'))

  return {
    mode: knowledgeBases.length > 0 ? 'kb' : 'legacy',
    knowledgeBases,
    hasSiteContent,
  }
}
