import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const ARCHITECTURE = [
  '                                TockDocs Workspace',
  '┌──────────────────────────────────────────────────────────────────────────────┐',
  '│ Root pnpm workspace                                                          │',
  '│ package.json · pnpm-workspace.yaml · scripts/ · CI                           │',
  '└───────────────┬───────────────────────────────┬──────────────────────────────┘',
  '                │                               │',
  '                │ consumes / builds             │',
  '                │                               │',
  '        ┌───────▼────────┐              ┌───────▼────────┐',
  '        │   layer/       │              │    cli/        │',
  '        │ TockDocs Nuxt  │              │ create-tockdocs│',
  '        │ layer/product  │              │ scaffolder     │',
  '        └───────┬────────┘              └───────┬────────┘',
  '                │                              uses',
  '     extends    │                               │',
  '                │                        ┌──────▼──────────────────┐',
  '        ┌───────▼────────┐               │ .starters/default       │',
  '        │    docs/       │               │ .starters/i18n          │',
  '        │ official site  │               └─────────────────────────┘',
  '        └───────┬────────┘',
  '                │',
  '        ┌───────▼────────┐',
  '        │ playground/    │',
  '        │ dev harness    │',
  '        └────────────────┘',
  '',
  'Inside layer/',
  '',
  '┌──────────────────────────────────────────────────────────────────────────────┐',
  '│ Nuxt modules                                                                 │',
  '│ config · routing · markdown-rewrite · skills · css · assistant               │',
  '└───────────────┬───────────────────────────────┬──────────────────────────────┘',
  '                │                               │',
  '                │ registers                     │ exposes',
  '                │                               │',
  '     ┌──────────▼──────────┐         ┌──────────▼──────────────────────────┐',
  '     │ app/                │         │ server/                             │',
  '     │ layouts · pages     │         │ content utils · docs search         │',
  '     │ header/footer       │         │ MCP tools · sitemap route           │',
  '     │ docs navigation UI  │         └───────────┬─────────────────────────┘',
  '     └──────────┬──────────┘                     │',
  '                │                                │',
  '                │ renders                        │ queries',
  '                │                                │',
  '         ┌──────▼───────┐                ┌───────▼──────────┐',
  '         │ Nuxt Content │                │ FlexSearch +     │',
  '         │ collections  │                │ Fuse.js index    │',
  '         └──────────────┘                └──────────────────┘',
  '',
  'Assistant path',
  '',
  'User → AssistantPanel.vue → /__tockdocs__/assistant → AI provider resolver',
  '     → MCP client/server → search-pages | list-pages | get-page',
  '     → Nuxt Content + hybrid search → streamed grounded answer',
].join('\n')

const PROJECT_STRUCTURE = [
  '.',
  '├── .context/                # Local project context docs for assistants',
  '├── .github/                 # CI and PR-related repo automation',
  '├── .starters/               # CLI starter templates (default, i18n)',
  '├── cli/                     # create-tockdocs package',
  '│   ├── cli.ts               # CLI command definition',
  '│   └── main.ts              # CLI entrypoint',
  '├── docs/                    # Official docs app extending the TockDocs layer',
  '│   ├── app/                 # Docs-site-specific app config/plugins',
  '│   ├── content/             # Documentation content',
  '│   └── nuxt.config.ts       # Docs-site config',
  '├── layer/                   # Reusable TockDocs Nuxt layer',
  '│   ├── app/                 # Layouts, pages, components, composables',
  '│   ├── i18n/                # Locale message files',
  '│   ├── modules/             # TockDocs Nuxt modules',
  '│   ├── server/              # MCP tools, search, sitemap, content helpers',
  '│   └── nuxt.config.ts       # Layer composition root',
  '├── playground/              # Minimal local consumer for manual testing',
  '├── scripts/                 # Env/bootstrap helper scripts',
  '├── package.json             # Workspace scripts',
  '└── pnpm-workspace.yaml      # Workspace package definitions',
].join('\n')

function extractTextBlock(filePath, heading) {
  const lines = readFileSync(filePath, 'utf8').split('\n')
  const headingIndex = lines.findIndex(line => line === heading)

  if (headingIndex === -1) {
    throw new Error(`Missing heading ${heading} in ${filePath}`)
  }

  const fenceStart = lines.indexOf('```text', headingIndex + 1)

  if (fenceStart === -1) {
    throw new Error(`Missing fenced text block after ${heading} in ${filePath}`)
  }

  const fenceEnd = lines.indexOf('```', fenceStart + 1)

  if (fenceEnd === -1) {
    throw new Error(`Unterminated fenced text block after ${heading} in ${filePath}`)
  }

  return lines.slice(fenceStart + 1, fenceEnd).join('\n')
}

const cases = [
  ['AGENTS.md', '## Architecture', ARCHITECTURE],
  ['AGENTS.md', '## Project Structure', PROJECT_STRUCTURE],
  ['README.md', '## Architecture', ARCHITECTURE],
  ['README.md', '## Project Structure', PROJECT_STRUCTURE],
]

for (const [file, heading, expected] of cases) {
  const actual = extractTextBlock(resolve(repoRoot, file), heading)
  assert.strictEqual(actual, expected, `${file} ${heading} ASCII diagram drifted`)
}

console.log('ASCII diagrams match expected snapshots.')
