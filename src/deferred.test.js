/**
 * The deferred-work reader, against the format BMAD writes and the one it does
 * not.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { deferredPath, parseDeferred } from './deferred.js'

const REAL = '/root/drunk-beaver-storefront/_bmad-output/initiative-vip-reservations/deferred-work.md'
const hasReal = existsSync(REAL)

test('reads a section and its entries, with the source and the date', () => {
  const { sections, count } = parseDeferred(`## Deferred from: code review of story-x (2026-10-27)

- one thing
- another thing

## Deferred from: story-y.md (2026-11-06)

- a third
`)
  assert.equal(count, 3)
  assert.equal(sections.length, 2)
  assert.equal(sections[0].source, 'code review of story-x')
  assert.equal(sections[0].date, '2026-10-27')
  assert.deepEqual(sections[0].items, ['one thing', 'another thing'])
  assert.equal(sections[1].date, '2026-11-06')
})

test('keeps the provenance attached to each entry', () => {
  // "deferred" without "deferred from what" is a note nobody can act on.
  const { sections } = parseDeferred('## Deferred from: somewhere (2026-01-01)\n\n- x\n')
  assert.equal(sections[0].source, 'somewhere')
})

test('a section with no entries contributes nothing', () => {
  const { sections, count } = parseDeferred('## Deferred from: empty (2026-01-01)\n\n## Deferred from: full (2026-01-02)\n\n- x\n')
  assert.equal(count, 1)
  assert.deepEqual(sections.map((s) => s.source), ['full'])
})

test('a heading without a date still reads', () => {
  const { sections } = parseDeferred('## Deferred from: something\n\n- x\n')
  assert.equal(sections[0].date, null)
  assert.equal(sections[0].source, 'something')
})

test('another section ends the deferred block', () => {
  const { count } = parseDeferred('## Deferred from: a\n\n- x\n\n## Notes\n\n- not deferred\n')
  assert.equal(count, 1)
})

test('an absent file is empty, not an error', () => {
  assert.deepEqual(parseDeferred(null), { sections: [], count: 0 })
})

test('a file in some other shape yields nothing rather than a guess', () => {
  const { sections, count } = parseDeferred('# A ledger\n\n- one\n- two\n')
  assert.equal(count, 0)
  assert.deepEqual(sections, [])
})

test('the path is the one the store writes', () => {
  assert.equal(deferredPath('a/b'), 'a/b/deferred-work.md')
})

test('real workspace: the initiative ledger parses', { skip: !hasReal }, () => {
  const { sections, count } = parseDeferred(readFileSync(REAL, 'utf8'))
  assert.ok(count > 0, 'the ledger has entries')
  assert.equal(count, sections.reduce((n, s) => n + s.items.length, 0), 'the count agrees with the sections')
  for (const section of sections) {
    assert.ok(section.source !== '', 'every section names its source')
    assert.ok(section.items.every((item) => item !== ''), 'no empty entries')
  }
})
