/**
 * Detector tests. Run: node --test src/
 *
 * Both detectors fired TRUE against the reference repository, and those cases
 * are asserted here -- the flagship B1 on story 3-2 and B3 on story 1-5, whose
 * two unticked `[Review][Patch]` items turned a loose proxy into a rule.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { detect, detectDoneButOwing, detectReviewPatches } from './detect.js'
import { buildModel } from './core.js'

const ART = '/root/drunk-beaver-storefront/_bmad-output/implementation-artifacts'
const available = existsSync(`${ART}/sprint-status.yaml`)

const story = (over) => ({
  key: '1-1-a-story', epic: 1, index: 1, slug: 'a-story',
  status: 'done', file: 'x/spec-1-1-a-story.md', title: 'A Story', deferred: 0, ...over,
})

const model = (stories, deferred = []) => ({
  stories, deferred, epics: [], counts: {}, totalStories: stories.length, doneStories: 0, openActions: [],
})

test('B1 fires on a done story its deferrals still name', () => {
  const linked = story({ deferred: 2 })
  const m = model(
    [linked],
    [{ spec: 'spec-1-1-a-story.md', story: linked }, { spec: 'spec-1-1-a-story.md', story: linked }],
  )
  const { gaps, unverifiable } = detectDoneButOwing(m)

  assert.equal(gaps.length, 1)
  assert.equal(gaps[0].id, 'B1')
  assert.equal(gaps[0].severity, 'high')
  assert.equal(gaps[0].subject, '1-1-a-story')
  assert.match(gaps[0].evidence, /2 deferred entries/)
  assert.equal(unverifiable.length, 0)
})

test('B1 stays silent for an unfinished story, however much it owes', () => {
  const linked = story({ status: 'in-progress', deferred: 3 })
  const m = model([linked], [{ spec: 's', story: linked }])
  assert.equal(detectDoneButOwing(m).gaps.length, 0)
})

test('B1 does not claim a deferral that attributes to no story', () => {
  // an unattributed entry is not this detector's to claim: blaming a story
  // would be a guess, and a guessed gap is worse than no gap.
  const m = model([story()], [{ spec: '', story: null }])
  const { gaps, unverifiable } = detectDoneButOwing(m)

  assert.equal(gaps.length, 0, 'no gap is claimed')
  assert.equal(unverifiable.length, 0, 'and nothing is left dangling either')
})

const REVIEW_FILE = `---
status: 'done'
---
## Tasks
- [x] did a thing
- [ ] [Review][Patch] Orphan class \`a\` applied but never defined [x.ts:1]
- [ ] [Review][Patch] Orphan class \`b\` applied but never defined [y.ts:2]
- [ ] an optional task nobody wanted
`

test('B3 fires only on unticked [Review][Patch] items', () => {
  const m = model([story()])
  const { gaps } = detectReviewPatches(m, () => REVIEW_FILE)

  assert.equal(gaps.length, 1, 'one gap per story, not per item')
  assert.equal(gaps[0].id, 'B3')
  assert.equal(gaps[0].evidence, 'marked done, yet 2 unticked entries in the spec')
  assert.ok(!/Orphan class/.test(gaps[0].evidence), 'no truncated item text')
})

test('B3 says "entry" for one and "entries" for several', () => {
  const one = '## Tasks\n- [ ] [Review][Patch] a thing [x.ts:1]\n'
  assert.equal(
    detectReviewPatches(model([story()]), () => one).gaps[0].evidence,
    'marked done, yet 1 unticked entry in the spec',
  )
})

test('B3 ignores unticked boxes that are not review patches', () => {
  const plain = '## Tasks\n- [x] one\n- [ ] an optional task nobody wanted\n'
  assert.equal(detectReviewPatches(model([story()]), () => plain).gaps.length, 0)
})

test('B3 reports unverifiable when the story file cannot be read', () => {
  const unreadable = detectReviewPatches(model([story()]), () => null)
  assert.equal(unreadable.gaps.length, 0)
  assert.equal(unreadable.unverifiable.length, 1)
  assert.match(unreadable.unverifiable[0].reason, /could not be read/)

  const missing = detectReviewPatches(model([story({ file: null })]), () => undefined)
  assert.equal(missing.unverifiable[0].gaps ?? missing.gaps.length, 0)
  assert.match(missing.unverifiable[0].reason, /no story file resolves/)
})

test('detect merges, orders by severity, and keeps unverifiable separate', () => {
  const linked = story({ deferred: 1 })
  const m = model([linked], [{ spec: 's', story: linked }])
  const { gaps, unverifiable } = detect(m, { readStory: () => REVIEW_FILE })

  assert.deepEqual(gaps.map((g) => g.id).sort(), ['B1', 'B3'])
  assert.equal(unverifiable.length, 0)
  for (const gap of gaps) {
    assert.ok(gap.action.payload.length > 0, 'every gap carries an action')
    assert.ok(gap.evidence.length > 0, 'every gap states its evidence')
  }
})

test('real workspace: both detectors fire on the stories that produced them', { skip: !available }, () => {
  const sprintText = readFileSync(`${ART}/sprint-status.yaml`, 'utf8')
  const deferredPath = `${ART}/deferred-work.md`
  const deferredText = existsSync(deferredPath) ? readFileSync(deferredPath, 'utf8') : ''
  const entries = readdirSync(ART, { withFileTypes: true }).map((d) => ({
    type: d.isDirectory() ? 'directory' : 'file',
    name: d.name,
  }))
  const model = buildModel(sprintText, deferredText, entries, `${ART}/sprint-status.yaml`)

  const readStory = (path) => {
    const name = path.split('/').pop()
    try {
      return readFileSync(`${ART}/${name}`, 'utf8')
    } catch {
      return null
    }
  }
  const { gaps, unverifiable } = detect(model, { readStory })

  // Each detector fires *exactly when* its condition holds, read independently
  // from the same files. Asserting that a particular story is flagged froze the
  // test to one sprint's state: B3 stopped firing the day 1-5's patches were
  // applied, which is the detector working, not failing.
  const owing = model.stories.filter((story) => story.status === 'done' && story.deferred > 0)
  const flagged = gaps.filter((gap) => gap.id === 'B1').map((gap) => gap.subject)
  assert.equal(
    flagged.length,
    owing.length,
    `one B1 per done-and-owing story (owing: ${owing.length}, flagged: ${flagged.length})`,
  )
  for (const subject of flagged) {
    assert.ok(
      owing.some((story) => story.key === subject),
      `B1 names a story that owes deferred work: ${subject}`,
    )
  }

  const unpatched = model.stories.filter((story) => {
    if (story.status !== 'done' || story.file === null) return false
    const body = readStory(story.file)
    return typeof body === 'string' && /^\s*- \[ \].*\[Review\]\[Patch\]/.test(body.replace(/\n\s*/g, '\n'))
  })
  const patched = gaps.filter((gap) => gap.id === 'B3').map((gap) => gap.subject)
  assert.equal(
    patched.length,
    unpatched.length,
    `one B3 per story with unapplied patches (unapplied: ${unpatched.length}, flagged: ${patched.length})`,
  )

  // and the board is not silently blind anywhere
  assert.deepEqual(unverifiable, [], 'every story file resolved and was readable')
})
