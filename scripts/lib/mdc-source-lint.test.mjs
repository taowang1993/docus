import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  docsContentDir,
  lintMarkdownSource,
  loadMdcSourceDependencies,
  repoRoot,
  resolveMarkdownTargets,
} from './mdc-source-lint.mjs'

const dependencies = await loadMdcSourceDependencies(repoRoot)

function withTempMarkdown(source, callback) {
  const directory = mkdtempSync(join(tmpdir(), 'tockdocs-mdc-lint-'))
  const filePath = join(directory, 'page.md')
  writeFileSync(filePath, source)

  return Promise.resolve()
    .then(() => callback(filePath))
    .finally(() => {
      rmSync(directory, { recursive: true, force: true })
    })
}

test('passes valid MDC content', async () => {
  await withTempMarkdown(`---
title: Hello
---

::note
Works.
::
`, async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.deepStrictEqual(issues, [])
  })
})

test('flags component fences converted into headings', async () => {
  await withTempMarkdown('## :::note\n', async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.equal(issues.some(issue => issue.ruleId === 'headingized-component-fence'), true)
  })
})

test('flags unclosed component fences', async () => {
  await withTempMarkdown('::note\nHello\n', async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.equal(issues.some(issue => issue.ruleId === 'component-fence-unclosed'), true)
  })
})

test('flags blank lines before component frontmatter', async () => {
  await withTempMarkdown('::::accordion-item\n\n---\nlabel: Hi\n---\nBody\n::::\n', async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.equal(issues.some(issue => issue.ruleId === 'component-frontmatter-blank-line'), true)
  })
})

test('flags invalid component frontmatter YAML', async () => {
  await withTempMarkdown('::note\n---\nlabel: [\n---\nBody\n::\n', async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.equal(issues.some(issue => issue.ruleId === 'component-frontmatter-yaml-invalid'), true)
  })
})

test('flags slot markers outside components', async () => {
  await withTempMarkdown('#title\nHello\n', async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.equal(issues.some(issue => issue.ruleId === 'slot-marker-outside-component'), true)
  })
})

test('flags malformed component fence syntax', async () => {
  await withTempMarkdown('::note{to="/docs"\nHello\n::\n', async (filePath) => {
    const issues = await lintMarkdownSource({
      filePath,
      ...dependencies,
    })

    assert.equal(issues.some(issue => issue.ruleId === 'component-fence-invalid'), true)
  })
})

test('resolveMarkdownTargets includes new markdown files from docs/content inputs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tockdocs-mdc-targets-'))
  const contentDir = join(directory, 'docs/content')
  const relativeFilePath = 'docs/content/new-page.mdc'
  const filePath = join(directory, relativeFilePath)

  try {
    mkdirSync(contentDir, { recursive: true })
    writeFileSync(filePath, '::note\nHello\n::\n')

    const resolved = resolveMarkdownTargets([relativeFilePath], {
      rootDir: directory,
      contentDir,
    })

    assert.deepStrictEqual(resolved, [filePath])
    assert.notEqual(filePath.startsWith(docsContentDir), true)
  }
  finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
