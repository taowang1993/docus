import { spawn } from 'node:child_process'
import { resolveDevPort } from './dev-port.mjs'

const appDir = process.argv[2]
const extraArgs = process.argv.slice(3)

if (!appDir) {
  console.error('Usage: node scripts/run-dev.mjs <docs|playground> [...nuxt args]')
  process.exit(1)
}

const host = process.env.NUXT_HOST || 'localhost'
const publicHost = ['0.0.0.0', '::', '[::]'].includes(host) ? 'localhost' : host
const existingPort = Number(process.env.NUXT_PORT || process.env.PORT)
const port = Number.isFinite(existingPort) && existingPort > 0
  ? existingPort
  : await resolveDevPort({ host })
const siteUrl = process.env.NUXT_SITE_URL || `http://${publicHost}:${port}`
const env = {
  ...process.env,
  NUXT_HOST: host,
  NUXT_PORT: String(port),
  NUXT_SITE_URL: siteUrl,
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

await run(pnpm, ['run', 'layer:prepare'], { env })
await run(pnpm, [
  'exec',
  'nuxt',
  'dev',
  '--extends',
  '../layer',
  '--host',
  host,
  '--port',
  String(port),
  ...extraArgs,
], {
  cwd: appDir,
  env,
})

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal)
        return
      }

      if (code && code !== 0) {
        process.exit(code)
      }

      resolve()
    })
  })
}
