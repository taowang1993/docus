import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('hides the header menu toggle while the assistant sidebar is docked', () => {
  const source = readFileSync(new URL('./AppHeader.vue', import.meta.url), 'utf8')
  const toggleStart = source.indexOf('<template #toggle')
  const bodyStart = source.indexOf('<template #body>', toggleStart)

  assert.ok(toggleStart !== -1, 'expected the header toggle slot to exist')
  assert.ok(bodyStart !== -1, 'expected the header body slot to exist')

  const toggleBlock = source.slice(toggleStart, bodyStart)

  assert.match(toggleBlock, /v-if="!assistantDocked"/)
  assert.match(toggleBlock, /<IconMenuToggle/)
})
