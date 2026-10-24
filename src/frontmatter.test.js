/**
 * Ticket frontmatter, against the shapes v7 tickets actually carry.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { listOf, readFrontmatter, stringOf } from './frontmatter.js'

const REPO = '/root/drunk-beaver-storefront'
const INITIATIVE = `${REPO}/_bmad-output/initiative-tools/initiative-tools.md`
const EPIC = `${REPO}/_bmad-output/initiative-tools/tickets/epic-parallel-resistor-core-substrate/epic-parallel-resistor-core-substrate.md`
const hasRepo = existsSync(INITIATIVE) && existsSync(EPIC)

test('reads quoted, single-quoted and bare scalars', () => {
  const { data } = readFrontmatter(`---
type: initiative
title: "A story: with a colon"
status: 'done'
count: 3
flag: true
---

body`)
  assert.equal(stringOf(data, 'type'), 'initiative')
  assert.equal(stringOf(data, 'title'), 'A story: with a colon')
  assert.equal(stringOf(data, 'status'), 'done')
  assert.equal(data.get('count'), 3)
  assert.equal(data.get('flag'), true)
})

test('reads an indented list under its key', () => {
  const { data, body } = readFrontmatter(`---
title: 'x'
context:
  - 'a/b.md'
  - 'c/d.md'
route: dispatch
---

# Body`)
  assert.deepEqual(listOf(data, 'context'), ['a/b.md', 'c/d.md'])
  assert.equal(stringOf(data, 'route'), 'dispatch')
  assert.match(body, /# Body/)
})

test('a file with no fence yields nothing and keeps its text as the body', () => {
  const { data, body } = readFrontmatter('# Just markdown\n\nno frontmatter here\n')
  assert.equal(data.size, 0)
  assert.match(body, /Just markdown/)
})

test('an unterminated fence does not swallow the whole document into one value', () => {
  const { data } = readFrontmatter('---\ntitle: "x"\n')
  assert.equal(stringOf(data, 'title'), 'x')
})

test('a key that opened a list but never got one holds no value', () => {
  const { data } = readFrontmatter('---\ncontext:\nroute: dispatch\n---\n')
  assert.equal(data.has('context'), false)
  assert.equal(stringOf(data, 'route'), 'dispatch')
})

test('stringOf reports null for absent or empty values', () => {
  const { data } = readFrontmatter('---\ntitle: ""\nn: 5\n---\n')
  assert.equal(stringOf(data, 'title'), null)
  assert.equal(stringOf(data, 'n'), null)
  assert.equal(stringOf(data, 'absent'), null)
})

test('real workspace: an initiative and an epic both declare a status', { skip: !hasRepo }, () => {
  const initiative = readFrontmatter(readFileSync(INITIATIVE, 'utf8')).data
  const epic = readFrontmatter(readFileSync(EPIC, 'utf8')).data

  assert.equal(stringOf(initiative, 'type'), 'initiative')
  assert.equal(stringOf(epic, 'type'), 'epic')
  // The board counts a container as settled by reading this; both must answer.
  for (const ticket of [initiative, epic]) {
    assert.ok(stringOf(ticket, 'status') !== null, 'every container declares a status')
    assert.ok(stringOf(ticket, 'title') !== null, 'every container declares a title')
  }
  assert.equal(stringOf(epic, 'parent'), 'initiative-tools')
})
