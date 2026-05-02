import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { getLandingOgImagePrerenderRoute } from './config.ts'
import { trimTrailingSlash } from '../utils/meta.ts'

test('prerenders the landing OG image from site content on KB builds', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'tockdocs-og-'))

  try {
    mkdirSync(join(rootDir, 'content', 'site'), { recursive: true })
    writeFileSync(
      join(rootDir, 'content', 'site', 'index.md'),
      `---
title: TockDocs
seo:
  description: An AI-powered Knowledge Management System
---
`,
    )

    const route = getLandingOgImagePrerenderRoute({
      rootDir,
      contentConfiguration: { mode: 'kb', hasSiteContent: true },
      siteName: 'Fallback Site',
      seo: {
        title: 'Fallback Title',
        description: 'Fallback Description',
      },
    })

    assert.equal(route, '/_og/s/c_Landing,title_TockDocs,description_An+AI-powered+Knowledge+Management+System.png')
  }
  finally {
    rmSync(rootDir, { recursive: true, force: true })
  }
})

test('drops trailing slashes from configured site URLs', () => {
  assert.equal(trimTrailingSlash('https://tockdocs.vercel.app/'), 'https://tockdocs.vercel.app')
  assert.equal(trimTrailingSlash('https://tockdocs.vercel.app/docs/'), 'https://tockdocs.vercel.app/docs')
})
