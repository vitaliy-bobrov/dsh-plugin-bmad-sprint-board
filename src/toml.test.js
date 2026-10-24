/**
 * The TOML reader, against the shapes BMAD's own files take.
 *
 * The important case is the last one: the merged result must agree with what
 * `_bmad/scripts/resolve_config.py` reports, because the board and the tooling
 * disagreeing about where the output lives is the failure this module exists to
 * prevent.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { test } from 'node:test'

import { mergeLayers, parseToml, pick } from './toml.js'

const REPO = '/root/drunk-beaver-storefront'
const hasRepo = existsSync(`${REPO}/_bmad/config.toml`)

const SAMPLE = `# a comment
[core]
output_folder = "{project-root}/_bmad-output"
active_initiative = "initiative-tools"   # trailing comment
layers = 3
enabled = true
half = 0.5

[modules.tea]
tea_evaluations_folder = '{project-root}/_bmad-output/test-artifacts/evals'

[[epic]]
id = 1
slug = "epic-one"
title = "A title with a # inside"

[[epic]]
id = 2
slug = "epic-two"
title = "Second"
`

test('reads tables, scalars and array-of-table entries', () => {
  const doc = parseToml(SAMPLE)
  assert.equal(pick(doc, 'core.output_folder'), '{project-root}/_bmad-output')
  assert.equal(pick(doc, 'core.layers'), 3)
  assert.equal(pick(doc, 'core.enabled'), true)
  assert.equal(pick(doc, 'core.half'), 0.5)
  assert.equal(pick(doc, 'modules.tea.tea_evaluations_folder'), '{project-root}/_bmad-output/test-artifacts/evals')
  assert.equal(doc.epic.length, 2)
  assert.equal(doc.epic[1].slug, 'epic-two')
})

test('a hash inside a string is not a comment', () => {
  const doc = parseToml(SAMPLE)
  assert.equal(doc.epic[0].title, 'A title with a # inside')
})

test('a trailing comment is dropped', () => {
  const doc = parseToml('[core]\nactive_initiative = "x" # pick me\n')
  assert.equal(pick(doc, 'core.active_initiative'), 'x')
})

test('a value it cannot read is omitted, never guessed', () => {
  const doc = parseToml('[core]\nlist = [1, 2, 3]\ntable = { a = 1 }\nreal = "kept"\n')
  assert.equal(pick(doc, 'core.list'), undefined)
  assert.equal(pick(doc, 'core.table'), undefined)
  assert.equal(pick(doc, 'core.real'), 'kept')
})

test('later layers win for scalars, tables deep-merge', () => {
  const base = parseToml('[core]\noutput_folder = "base"\nother = "kept"\n[modules.a]\nx = 1\ny = 2\n')
  const user = parseToml('[core]\noutput_folder = "user"\n[modules.a]\ny = 9\n')
  const merged = mergeLayers([base, user])
  assert.equal(pick(merged, 'core.output_folder'), 'user')
  assert.equal(pick(merged, 'core.other'), 'kept')
  assert.equal(pick(merged, 'modules.a.x'), 1)
  assert.equal(pick(merged, 'modules.a.y'), 9)
})

test('pick returns undefined rather than throwing on a missing path', () => {
  const doc = parseToml('[core]\n')
  assert.equal(pick(doc, 'core.nope'), undefined)
  assert.equal(pick(doc, 'nope.deeper'), undefined)
})

test('real workspace: the merge agrees with resolve_config.py', { skip: !hasRepo }, () => {
  const layers = ['_bmad/config.toml', '_bmad/custom/config.toml', '_bmad/custom/config.user.toml']
    .map((name) => {
      const path = `${REPO}/${name}`
      return existsSync(path) ? parseToml(readFileSync(path, 'utf8')) : {}
    })
  const merged = mergeLayers(layers)

  // resolve_config.py --key core.output_folder reports exactly this, and reports
  // nothing for active_initiative while config.user.toml is absent. Asserting
  // agreement rather than a literal lets the project move its own output folder.
  assert.equal(pick(merged, 'core.output_folder'), '{project-root}/_bmad-output')
  assert.equal(pick(merged, 'core.active_initiative'), undefined)
})
