import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { relative } from 'node:path'
import {
  docsContentDir,
  lintMarkdownFiles,
  repoRoot,
  resolveMarkdownTargets,
} from './lib/mdc-source-lint.mjs'

assert.ok(existsSync(docsContentDir), `Missing docs content directory: ${docsContentDir}`)

function getStagedPaths() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', 'docs/content'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

const stagedPaths = getStagedPaths()
const markdownFiles = resolveMarkdownTargets(stagedPaths)

if (!markdownFiles.length) {
  console.log('No staged docs/content markdown files to lint.')
  process.exit(0)
}

const results = await lintMarkdownFiles(markdownFiles)
const issues = results.flatMap(result => result.issues)

if (issues.length > 0) {
  console.error(`Staged MDC source lint failed for ${new Set(issues.map(issue => issue.filePath)).size} file(s).`)

  for (const issue of issues.sort((left, right) => {
    const fileCompare = left.filePath.localeCompare(right.filePath)
    if (fileCompare !== 0) {
      return fileCompare
    }
    return left.line - right.line || left.column - right.column || left.ruleId.localeCompare(right.ruleId)
  })) {
    const relativePath = relative(repoRoot, issue.filePath)
    console.error(`- ${relativePath}:${issue.line}:${issue.column} [${issue.ruleId}] ${issue.message}`)
  }

  process.exit(1)
}

console.log(`Staged MDC source lint passed for ${markdownFiles.length} markdown file(s).`)
