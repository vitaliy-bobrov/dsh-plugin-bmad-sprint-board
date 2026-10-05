/**
 * Planning tests: FR coverage, the requirement bar, the ladder.
 * Run: node --test src/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { parseFrCoverage, requirementBar, nextAction, bars } from './plan.js'
import { buildModel } from './core.js'

const EPICS_MD = '/root/drunk-beaver-storefront/_bmad-output/planning-artifacts/epics.md'
const ART = '/root/drunk-beaver-storefront/_bmad-output/implementation-artifacts'
const available = existsSync(EPICS_MD) && existsSync(`${ART}/sprint-status.yaml`)

const FIXTURE = `# Doc
## Requirements Inventory
### FR Coverage Map
- FR1 (Header Nav "Tools"): Epic 4
- FR2 (Tools Shelf): Epic 4
- FR3 (Tool Page Shell): Epic 1 (Template), Epic 2, Epic 3, Epic 4
- FR4 (Solve-For): Epic 1, Epic 2, Epic 3
## Epic List
- something else entirely: Epic 9
`

test('parseFrCoverage reads the map and stops at the next heading', () => {
  const cov = parseFrCoverage(FIXTURE)
  assert.equal(cov.size, 4, 'only the four FR bullets')
  assert.deepEqual(cov.get('FR1'), { name: 'Header Nav "Tools"', epics: [4] })
  assert.deepEqual(cov.get('FR3').epics, [1, 2, 3, 4])
  assert.equal(cov.get('FR3').name, 'Tool Page Shell', 'the epic annotations are not part of the name')
  assert.equal(cov.has('FR9'), false, 'the section ends at the next heading')
})

test('parseFrCoverage returns nothing when the map is absent', () => {
  assert.equal(parseFrCoverage('# Doc\n## Epic List\n- FR1 (x): Epic 1\n').size, 0)
})

test('requirementBar counts only fully-carried requirements as delivered', () => {
  const cov = parseFrCoverage(FIXTURE)
  const epics = [
    { key: 'epic-1', status: 'done' },
    { key: 'epic-2', status: 'done' },
    { key: 'epic-3', status: 'in-progress' },
    { key: 'epic-4', status: 'backlog' },
  ]
  const bar = requirementBar(cov, epics)

  assert.equal(bar.total, 4)
  assert.equal(bar.delivered, 0, 'no requirement has all its carriers done')
  // partial means *some* carrier is done and some is not; FR1/FR2 depend only
  // on epic 4, which has not started, so they are unstarted rather than partial
  assert.deepEqual(bar.partial.map((p) => p.id).sort(), ['FR3', 'FR4'])
  assert.deepEqual(bar.unstarted.map((p) => p.id).sort(), ['FR1', 'FR2'])
  assert.equal(bar.unverifiable, null)
})

test('requirementBar refuses to invent a number without a coverage map', () => {
  const bar = requirementBar(new Map(), [])
  assert.equal(bar.total, 0)
  assert.match(bar.unverifiable, /no FR Coverage Map/)
})

test('requirementBar marks a requirement whose epic is missing as unknown', () => {
  const cov = new Map([['FR1', { name: 'x', epics: [7] }]])
  const bar = requirementBar(cov, [{ key: 'epic-1', status: 'done' }])
  assert.equal(bar.delivered, 0)
  assert.equal(bar.partial[0].unknown, true)
})

test('nextAction follows the ladder in order', () => {
  const mk = (statuses) => ({
    stories: statuses.map((s, i) => ({ key: `1-${i + 1}-s`, epic: 1, index: i + 1, status: s, title: `S${i + 1}` })),
    epics: [],
  })

  assert.equal(nextAction(mk(['backlog', 'in-progress'])).skill, 'bmad-build')
  assert.equal(nextAction(mk(['backlog', 'in-progress'])).key, '1-2-s')
  assert.equal(nextAction(mk(['backlog', 'review'])).skill, 'bmad-code-review')
  assert.equal(nextAction(mk(['backlog', 'ready-for-dev'])).skill, 'bmad-build')
  assert.equal(nextAction(mk(['backlog'])).key, '1-1-s')
  assert.equal(nextAction(mk(['done'])).skill, null)
  assert.match(nextAction(mk(['done'])).reason, /every story is done/)
})

test('nextAction falls through to an open retrospective', () => {
  const model = { stories: [{ key: '1-1-s', epic: 1, index: 1, status: 'done', title: 'S' }], epics: [{ key: 'epic-1', retro: 'optional' }] }
  assert.equal(nextAction(model).skill, 'bmad-retrospective')
})

test('bars keep the denominator honest when a number is unverifiable', () => {
  const model = { stories: [{ status: 'done' }, { status: 'done' }, { status: 'backlog' }] }
  const b = bars(model, { delivered: 0, total: 0, unverifiable: 'no map' })
  assert.equal(b.stories.total, 3)
  assert.equal(b.stories.done, 2)
  assert.equal(b.requirements.total, 0)
  assert.equal(b.requirements.unverifiable, 0, 'nothing to be unsure about when there is no map')
})

test('a missing measurement is not a zero', () => {
  const model = { stories: [{ status: 'done' }] }
  const withMap = bars(model, { delivered: 3, total: 10, unverifiable: null })
  assert.equal(withMap.requirements.noData, false)
  assert.equal(withMap.requirements.total, 10)

  // no coverage map: the bar has no denominator, and `0 / 0` would read as
  // "nothing to do" rather than "cannot measure"
  const without = bars(model, requirementBar(new Map(), []))
  assert.equal(without.requirements.noData, true)
  assert.equal(without.requirements.total, 0)
})

test('real workspace: the coverage map is read whole', { skip: !available }, () => {
  const cov = parseFrCoverage(readFileSync(EPICS_MD, 'utf8'))
  assert.equal(cov.size, 17, 'the reference repo declares 17 functional requirements')
  for (const [id, fr] of cov) {
    assert.ok(fr.epics.length > 0, `${id} names at least one epic`)
    assert.ok(fr.name.length > 0, `${id} has a name`)
  }
  // three requirements cross all four epics -- the reason a tree cannot show this
  const crossing = [...cov.values()].filter((fr) => fr.epics.length === 4)
  assert.ok(crossing.length >= 3, 'the map is genuinely many-to-many')
})

test('real workspace: the requirement bar partitions every FR once', { skip: !available }, () => {
  const cov = parseFrCoverage(readFileSync(EPICS_MD, 'utf8'))
  const model = buildModel(readFileSync(`${ART}/sprint-status.yaml`, 'utf8'), '', [], `${ART}/sprint-status.yaml`)
  const bar = requirementBar(cov, model.epics)

  assert.equal(bar.total, 17)
  assert.equal(
    bar.delivered + bar.partial.length + bar.unstarted.length,
    17,
    'every requirement lands in exactly one bucket',
  )
  // the finding that motivated the second bar: epics done, requirements not
  assert.ok(bar.delivered < 17, 'not everything is delivered while later epics are unfinished')
  assert.equal(bar.unverifiable, null)
})
