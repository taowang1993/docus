import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const localeDir = resolve(repoRoot, 'layer/i18n/locales')
const scanRoots = [
  resolve(repoRoot, 'layer/app'),
  resolve(repoRoot, 'layer/modules'),
  resolve(repoRoot, 'layer/server'),
  resolve(repoRoot, 'layer/utils'),
  resolve(repoRoot, 'docs/app'),
]
const sourceFilePattern = /\.(?:vue|ts|js|mjs)$/i
const translationCallPatterns = [
  { quote: '\'', pattern: /\b\$?t\(\s*'[^'\\]*(?:\\.[^'\\]*)*'\s*[,)\]]/g },
  { quote: '"', pattern: /\b\$?t\(\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*[,)\]]/g },
]

assert.ok(readdirSync(localeDir).length > 0, `Missing locale files in ${localeDir}`)

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      return walkFiles(entryPath)
    }

    return entry.isFile() && sourceFilePattern.test(entry.name) ? [entryPath] : []
  })
}

function flattenMessageKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return flattenMessageKeys(child, nextPrefix)
  })
}

function getMessageValue(messages, key) {
  return key.split('.').reduce((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }

    return current[segment]
  }, messages)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unwrapQuotedMatch(match, quote) {
  const startIndex = match.indexOf(quote)
  const endIndex = match.lastIndexOf(quote)

  if (startIndex === -1 || endIndex <= startIndex) {
    return undefined
  }

  return match.slice(startIndex + 1, endIndex).replace(/\\(['"])/g, '$1')
}

const localeFiles = readdirSync(localeDir)
  .filter(fileName => fileName.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right))

const localeMessages = Object.fromEntries(
  localeFiles.map((fileName) => {
    const locale = fileName.replace(/\.json$/i, '')
    const filePath = join(localeDir, fileName)
    return [locale, JSON.parse(readFileSync(filePath, 'utf8'))]
  }),
)

assert.ok(localeMessages.en, 'Missing default locale file: layer/i18n/locales/en.json')

const defaultKeys = new Set(flattenMessageKeys(localeMessages.en))
const namespaces = Object.keys(localeMessages.en)
const namespacePattern = new RegExp(`^(?:${namespaces.map(escapeRegExp).join('|')})(?:[.]|$)`)
const sourceFiles = scanRoots.flatMap(walkFiles)
const usedKeys = new Map()

for (const filePath of sourceFiles) {
  const relativePath = relative(repoRoot, filePath)
  const source = readFileSync(filePath, 'utf8')

  for (const { quote, pattern } of translationCallPatterns) {
    for (const match of source.matchAll(pattern)) {
      const key = unwrapQuotedMatch(match[0], quote)

      if (!key || !namespacePattern.test(key)) {
        continue
      }

      const locations = usedKeys.get(key) || []
      locations.push(relativePath)
      usedKeys.set(key, locations)
    }
  }
}

const issues = []

for (const key of [...defaultKeys].sort((left, right) => left.localeCompare(right))) {
  for (const locale of Object.keys(localeMessages).sort((left, right) => left.localeCompare(right))) {
    if (typeof getMessageValue(localeMessages[locale], key) === 'string') {
      continue
    }

    issues.push(`- ${locale}: missing key ${key}`)
  }
}

for (const [key, locations] of [...usedKeys.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  if (!defaultKeys.has(key)) {
    issues.push(`- source: key ${key} is used but missing from en.json (${[...new Set(locations)].join(', ')})`)
  }
}

if (issues.length > 0) {
  console.error(`i18n key check failed with ${issues.length} issue(s):`)
  for (const issue of issues) {
    console.error(issue)
  }
  process.exit(1)
}

console.log(`i18n key check passed for ${localeFiles.length} locale file(s) and ${usedKeys.size} referenced key(s).`)
