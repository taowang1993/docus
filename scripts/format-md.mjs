import { execFileSync, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const flags = new Set(process.argv.slice(2))
const check = flags.has('--check')
const staged = flags.has('--staged')

const gitArgs = staged
  ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.md', '*.mdx']
  : ['ls-files', '--', '*.md', '*.mdx']

const files = [
  ...new Set(
    execFileSync('git', gitArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map(file => file.trim())
      .filter(Boolean),
  ),
]

if (files.length === 0) {
  console.log(staged ? 'No staged Markdown files to format.' : 'No Markdown files found.')
  process.exit(0)
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const chunkSize = 100
const prettierArgs = check ? ['exec', 'prettier', '--check'] : ['exec', 'prettier', '--write']

for (let index = 0; index < files.length; index += chunkSize) {
  const chunk = files.slice(index, index + chunkSize)
  const result = spawnSync(pnpm, [...prettierArgs, ...chunk], {
    cwd: repoRoot,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if ((result.status ?? 0) !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (staged && !check) {
  for (let index = 0; index < files.length; index += chunkSize) {
    const chunk = files.slice(index, index + chunkSize)
    const result = spawnSync('git', ['add', '--', ...chunk], {
      cwd: repoRoot,
      stdio: 'inherit',
    })

    if (result.error) {
      console.error(result.error)
      process.exit(1)
    }

    if ((result.status ?? 0) !== 0) {
      process.exit(result.status ?? 1)
    }
  }
}
