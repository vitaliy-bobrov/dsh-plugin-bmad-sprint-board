/**
 * The ticket store: index parsing, and the three-way answer to "which plan
 * belongs to which ticket".
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { linkPlans, readEpicIndex, readPlan, readStoryIndex, slugify } from './store.js'

const EPIC_INDEX = `[[epic]]
id = 1
slug = "epic-one"
title = "First"

[[epic]]
id = 2
slug = "epic-two"
title = "Second"
`

const STORY_INDEX = `[[entry]]
id = "1"
type = "story"
title = "Build the header navigation"
v6_key = "1-1"

[[entry]]
id = "2"
type = "feature"
title = "Add a slider input"
`

/** Build a plan fixture the way a file on disk would read. */
const plan = (path, ticket, status = 'done') => ({
  path,
  title: null,
  type: 'story',
  status,
  ticket,
  baseline: null,
  context: [],
})

test('readEpicIndex keeps order and skips a row with no slug', () => {
  const epics = readEpicIndex(`${EPIC_INDEX}\n[[epic]]\nid = 3\ntitle = "No slug"\n`)
  assert.deepEqual(epics.map((e) => e.slug), ['epic-one', 'epic-two'])
  assert.equal(epics[0].id, 1)
})

test('readStoryIndex keeps the type and the v6 key', () => {
  const entries = readStoryIndex(STORY_INDEX)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].v6Key, '1-1')
  assert.equal(entries[1].type, 'feature')
  assert.equal(entries[1].v6Key, null)
})

test('readStoryIndex on a missing file is empty, not an error', () => {
  assert.deepEqual(readStoryIndex(null), [])
  assert.deepEqual(readEpicIndex(null), [])
})

test('a plan whose ticket names an entry is linked by the store itself', () => {
  const entries = readStoryIndex(STORY_INDEX)
  const plans = [plan('x/story-anything-plan.md', '2')]
  const { links, unlinked } = linkPlans(entries, plans)
  assert.equal(links.get('2').ticket, '2')
  assert.equal(unlinked.length, 0)
})

test('an unlinked plan is matched by name when exactly one entry could claim it', () => {
  const entries = readStoryIndex(STORY_INDEX)
  const plans = [plan('x/story-build-the-header-navigation-plan.md', null)]
  const { links, unlinked } = linkPlans(entries, plans)
  assert.equal(links.get('1').status, 'done')
  // The store does not link it, so the fact is reported rather than hidden.
  assert.equal(unlinked.length, 1)
  assert.equal(unlinked[0].entry.id, '1')
})

test('a plan whose name is a truncated form of the current title still links', () => {
  // BMAD derives the file name when the ticket is created, and a title edited
  // afterwards leaves a shorter stem. Truncation happens before `-plan.md`, so
  // comparing the two names whole would miss every one of these.
  const entries = readStoryIndex(`[[entry]]
id = "1"
type = "story"
title = "Series resistor route assembly, dynamic URL state sync and integration tests"
`)
  const plans = [plan('x/story-series-resistor-route-assembly-dynamic-url-state-plan.md', null)]
  const { links } = linkPlans(entries, plans)
  assert.equal(links.size, 1)
})

test('an ambiguous name match stays unlinked rather than picking the first', () => {
  const entries = readStoryIndex(`[[entry]]
id = "1"
type = "story"
title = "Add the header"
[[entry]]
id = "2"
type = "story"
title = "Add the header navigation"
`)
  const plans = [plan('x/story-add-the-header-plan.md', null)]
  const { links, orphans } = linkPlans(entries, plans)
  assert.equal(links.size, 0, 'two entries could claim this file')
  assert.equal(orphans.length, 1, 'and it is reported as claimed by nobody')
})

test('an entry with no plan and a plan with no entry are both reported', () => {
  const entries = readStoryIndex(STORY_INDEX)
  const plans = [plan('x/story-nothing-matches-this-plan.md', null)]
  const { links, orphans, missing } = linkPlans(entries, plans)
  assert.equal(links.size, 0)
  assert.equal(orphans.length, 1)
  assert.equal(missing.length, 2)
})

test('two plans with the same name leave the entry unlinked rather than picking one', () => {
  const entries = readStoryIndex(STORY_INDEX)
  const plans = [
    plan('x/story-build-the-header-navigation-plan.md', null),
    plan('y/story-build-the-header-navigation-plan.md', null),
  ]
  const { links, orphans, missing } = linkPlans(entries, plans)
  // Picking one would show a state that might belong to the other file, so
  // neither is attached and both are reported.
  assert.equal(links.size, 0)
  assert.equal(orphans.length, 2)
  assert.ok(missing.some((entry) => entry.id === '1'))
})

test('slugify reduces a title to the form BMAD writes', () => {
  assert.equal(slugify('Shared Tool UI Components (ValueField, SolveForButton)'),
    'shared-tool-ui-components-valuefield-solveforbutton')
  assert.equal(slugify('  leading and trailing  '), 'leading-and-trailing')
})

test('readPlan reads the fields the board uses', () => {
  const p = readPlan(`---
title: 'Story 1.5: Shared components'
type: 'feature'
status: 'done'
ticket: '5'
baseline_commit: 'f4c32ab2'
context:
  - 'a/b.md'
---

body`, 'x/story-shared-plan.md')
  assert.equal(p.status, 'done')
  assert.equal(p.ticket, '5')
  assert.equal(p.type, 'feature')
  assert.equal(p.baseline, 'f4c32ab2')
  assert.deepEqual(p.context, ['a/b.md'])
})

test('readPlan reports a missing ticket as null, which is what makes it unlinked', () => {
  const p = readPlan('---\ntitle: x\nstatus: done\n---\n', 'x/story-x-plan.md')
  assert.equal(p.ticket, null)
})
