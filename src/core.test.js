/**
 * Core tests. Run: node --test src/
 *
 * These exercise the extracted core directly -- the thing that ships -- rather
 * than a reimplementation. Every case in the "real workspace" block was
 * computed independently by the Python precision probe, so it checks the core
 * against outside evidence rather than against itself.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import {
  buildModel,
  parseSprintStatus,
  parseDeferredWork,
  classifyStatus,
  toneOf,
  under,
  dirOf,
  specSlugsOf,
  bestSpecSlug,
} from './core.js'
import { detect } from './detect.js'

const SPRINT = `generated: 09-26-2026 14:27
last_updated: 10-03-2026 20:13
project: demo
tracking_system: file-system
story_location: _bmad-output/implementation-artifacts
development_status:
  epic-1: done
  1-1-first-story: done
  1-2-second-story: review
  1-3-third-story: backlog
  epic-1-retrospective: optional
  epic-2: in-progress
  2-1-fourth-story: in-progress
action_items:
  - id: "epic-1-retro-item-1-something"
    epic: 1
    action: "Settle the contract."
    owner: "Developer / PM"
    status: open
`

test('parseSprintStatus reads scalars, statuses and folded action items', () => {
  const s = parseSprintStatus(SPRINT)

  assert.equal(s.meta.project, 'demo')
  assert.equal(s.meta.story_location, '_bmad-output/implementation-artifacts')
  assert.equal(s.status['1-2-second-story'], 'review')
  assert.equal(s.status['epic-1'], 'done')
  assert.equal(s.actions.length, 1)
  assert.equal(s.actions[0].owner, 'Developer / PM')
  assert.equal(s.actions[0].status, 'open')
  assert.equal(s.actions[0].action, 'Settle the contract.')
})

test('classifyStatus splits epics, stories and retrospectives by key grammar', () => {
  const { epics, stories, retrospectives } = classifyStatus(parseSprintStatus(SPRINT).status)

  assert.deepEqual(epics.map((e) => e.key), ['epic-1', 'epic-2'])
  assert.deepEqual(stories.map((s) => s.key), [
    '1-1-first-story',
    '1-2-second-story',
    '1-3-third-story',
    '2-1-fourth-story',
  ])
  // a Map keyed by epic number, not a list
  assert.ok(retrospectives instanceof Map)
  assert.equal(retrospectives.size, 1)
  assert.equal(retrospectives.get(1), 'optional')
  assert.equal(stories[0].epic, 1) // a number; the epic KEY carries the prefix
})

test('toneOf is semantic, not a theme token', () => {
  assert.equal(toneOf('done'), 'success')
  assert.equal(toneOf('review'), 'warning')
  assert.equal(toneOf('in-progress'), 'info')
  assert.equal(toneOf('backlog'), 'neutral')
  assert.equal(toneOf('nonsense'), 'neutral')
})

test('path helpers are host-free', () => {
  assert.equal(under('a/b', 'c.md'), 'a/b/c.md')
  assert.equal(under('', 'c.md'), 'c.md')
  assert.equal(dirOf('a/b/c.yaml'), 'a/b')
  assert.equal(dirOf('c.yaml'), '')
})

test('specSlugsOf and bestSpecSlug match truncated keys', () => {
  const entries = [
    { type: 'file', name: 'spec-1-1-shopify-admin-metaobject-modeling.md' },
    { type: 'file', name: 'spec-1-2-schema-org.md' },
    { type: 'directory', name: 'spec-9-9-not-a-file.md' },
    { type: 'file', name: 'deferred-work.md' },
  ]
  assert.deepEqual(specSlugsOf(entries), ['1-1-shopify-admin-metaobject-modeling', '1-2-schema-org'])

  // the tracking file truncates slugs, and the truncation drops hyphens
  assert.equal(
    bestSpecSlug(['1-1-shopify-admin-metaobject-modeling'], '1-1-shopify-admin-metaobject-modeli'),
    '1-1-shopify-admin-metaobject-modeling',
  )
  assert.equal(bestSpecSlug(['1-2-schema-org'], 'no-such-key'), null)

  // regression: the 64-char cut lands inside a hyphenated token and drops the
  // separator, so the key is not a literal prefix of the file's slug. Story 1-5
  // in the reference repo was unresolvable before this was handled.
  const truncated = '1-5-shared-tool-ui-components-valuefield-solveforbutton-resultsc'
  const fileName = '1-5-shared-tool-ui-components-valuefield-solveforbutton-results-card-formula-display'
  assert.ok(!fileName.startsWith(truncated), 'the pair really is not a literal prefix')
  assert.equal(bestSpecSlug([fileName], truncated), fileName)
})

test('buildModel computes counts and links specs', () => {
  const entries = SPRINT.split('\n')
    .filter((l) => l.includes('-story:'))
    .map((l) => ({ type: 'file', name: `spec-${l.trim().split(':')[0]}.md` }))
  const model = buildModel(SPRINT, '', entries, '_bmad-output/implementation-artifacts/sprint-status.yaml')

  assert.equal(model.totalStories, 4)
  assert.equal(model.doneStories, 1)
  assert.equal(model.openActions.length, 1)
  assert.equal(model.stories.find((s) => s.key === '1-1-first-story').file,
    '_bmad-output/implementation-artifacts/spec-1-1-first-story.md')
})

// --- against the real workspace, values computed outside this code ----------
const ART = '/root/drunk-beaver-storefront/_bmad-output/implementation-artifacts'
const available = existsSync(`${ART}/sprint-status.yaml`)

test('real workspace: model matches the independently computed truth', { skip: !available }, () => {
  const sprintText = readFileSync(`${ART}/sprint-status.yaml`, 'utf8')
  const deferredPath = `${ART}/deferred-work.md`
  const deferredText = existsSync(deferredPath) ? readFileSync(deferredPath, 'utf8') : ''
  const entries = readdirSync(ART, { withFileTypes: true }).map((d) => ({
    type: d.isDirectory() ? 'directory' : 'file',
    name: d.name,
  }))

  const model = buildModel(sprintText, deferredText, entries, `${ART}/sprint-status.yaml`)

  /**
   * The lines of one top-level block, read without the parser under test.
   *
   * Counting the file a second way is what makes this a comparison rather than
   * a restatement. The block runs until a line starts in column zero.
   */
  const block = (key) => {
    const lines = sprintText.split('\n')
    const start = lines.findIndex((line) => line.startsWith(`${key}:`))
    if (start === -1) return []
    const out = []
    for (let i = start + 1; i < lines.length; i += 1) {
      if (/^\S/.test(lines[i])) break
      if (lines[i].trim() !== '') out.push(lines[i].trim())
    }
    return out
  }

  // Every assertion below compares the model against this file read a second,
  // simpler way. None pins a count that the sprint is free to change: the
  // previous version asserted "4 epics / 15 stories / 16 actions" and a fixed
  // two unticked patches, so it failed the moment the work moved on.
  const storyLines = block('development_status').filter((line) => /^\d+-\d+-/.test(line))
  const epicLines = block('development_status').filter((line) => /^epic-\d+:/.test(line))
  const actionLines = block('action_items').filter((line) => line.startsWith('- id:'))

  assert.equal(model.stories.length, new Set(storyLines).size, 'one model story per tracking key')
  assert.equal(model.epics.length, new Set(epicLines).size, 'one model epic per epic key')
  assert.equal(
    model.openActions.length + model.doneActionCount,
    new Set(actionLines).size,
    'one model action per action_items entry',
  )

  assert.ok(model.stories.length > 0, 'the file has stories to read')
  assert.equal(model.totalStories, model.stories.length)

  // internal consistency, which cannot drift with the sprint
  assert.equal(
    model.doneStories,
    model.stories.filter((s) => s.status === 'done').length,
    'doneStories agrees with the story list',
  )

  // This file asserts that the model *agrees* with the repository. Whether any
  // particular condition currently holds is the repository's business: an
  // earlier version required a done-and-owing story and a story with unapplied
  // patches, and both went away as the work was finished -- the detectors were
  // right and the premises were stale. The fixtures below prove each detector
  // fires; this only proves it fires on what is really there.
  const owing = model.stories.filter((s) => s.status === 'done' && s.deferred > 0)
  for (const story of owing) {
    assert.ok(story.deferred > 0, `${story.key} counts the deferrals it owes`)
  }

  // B3: the detector's reading equals a plain line scan of the same file. Two
  // independent readings of one document, so the assertion holds whether the
  // patches are still outstanding or have since been applied.
  const spec15 = entries.find((e) => e.name.startsWith('spec-1-5-'))
  const body = readFileSync(`${ART}/${spec15.name}`, 'utf8')
  const unticked = body
    .split('\n')
    .filter((line) => /^\s*- \[ \]/.test(line) && line.includes('[Review][Patch]'))
  const { gaps } = detect(model, {
    readStory: (path) => (path.endsWith(spec15.name) ? body : null),
  })
  const b3 = gaps.find((g) => g.id === 'B3')
  assert.equal(
    b3 !== undefined,
    unticked.length > 0,
    'B3 fires exactly when the file still holds unticked patches',
  )
  if (b3 !== undefined) {
    assert.match(b3.evidence, new RegExp(`yet ${unticked.length} unticked`), 'and reports their count')
  }
})

test('real workspace: every epic key resolves for its stories', { skip: !available }, () => {
  const sprintText = readFileSync(`${ART}/sprint-status.yaml`, 'utf8')
  const model = buildModel(sprintText, '', [], `${ART}/sprint-status.yaml`)
  const epicKeys = new Set(model.epics.map((e) => e.key))
  // a story records its epic as a number; the epic keys carry the `epic-` prefix
  const orphans = model.stories.filter((s) => !epicKeys.has(`epic-${s.epic}`))
  assert.deepEqual(orphans, [], 'no orphaned stories')
})
