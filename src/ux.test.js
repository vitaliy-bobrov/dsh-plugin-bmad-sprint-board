/**
 * UX detector tests. Run: node --test src/
 *
 * U1 and U2 both fire on the reference repository, and those cases are asserted
 * here: one UX design run the plan does not name, and eleven UX requirements no
 * story cites.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import {
  parseUxRuns,
  linkUxRuns,
  detectUxRuns,
  detectUxRequirements,
  linkUxToEpics,
  componentNames,
  UX_DIR,
} from './ux.js'
import {
  parseArchitectureDecisions,
  linkDecisionsToEpics,
  parseDeclaredInputs,
  artefactFamilies,
} from './planning.js'
import { parseRequirementInventory } from './plan.js'
import { buildModel } from './core.js'

const PLAN = '/root/drunk-beaver-storefront/_bmad-output/planning-artifacts'

const available = existsSync(`${PLAN}/epics.md`) && existsSync(`${PLAN}/${UX_DIR}`)
const ART_DIR = '/root/drunk-beaver-storefront/_bmad-output/implementation-artifacts'

test('parseUxRuns takes directories and ignores loose files', () => {
  const runs = parseUxRuns([
    { type: 'directory', name: 'ux-b-2026-01-02' },
    { type: 'file', name: 'notes.md' },
    { type: 'directory', name: 'ux-a-2025-12-01' },
  ])
  assert.deepEqual(runs.map((r) => r.name), ['ux-a-2025-12-01', 'ux-b-2026-01-02'], 'sorted')
  assert.equal(runs[0].file, 'ux-designs/ux-a-2025-12-01')
})

test('parseUxRuns survives an empty or absent listing', () => {
  assert.deepEqual(parseUxRuns([]), [])
  assert.deepEqual(parseUxRuns(undefined), [])
})

test('linkUxRuns marks the runs the epics document names', () => {
  const runs = [{ name: 'ux-alpha', file: 'x/ux-alpha' }, { name: 'ux-beta', file: 'x/ux-beta' }]
  const linked = linkUxRuns(runs, 'inputDocuments:\n  - _bmad-output/planning-artifacts/ux-designs/ux-alpha/DESIGN.md\n')
  assert.equal(linked[0].claimed, true)
  assert.equal(linked[1].claimed, false)
})

test('U1 fires on a run the plan does not name', () => {
  const runs = [{ name: 'ux-alpha', file: 'x/ux-alpha' }, { name: 'ux-orphan', file: 'x/ux-orphan' }]
  const { gaps, unverifiable } = detectUxRuns(runs, 'inputs: ux-alpha/DESIGN.md')

  assert.equal(gaps.length, 1)
  assert.equal(gaps[0].id, 'U1')
  assert.equal(gaps[0].subject, 'ux-orphan')
  assert.match(gaps[0].evidence, /names no input/)
  assert.equal(gaps[0].action.kind, 'prompt')
  assert.equal(unverifiable.length, 0)
})

test('U1 stays silent when every run is named', () => {
  const runs = [{ name: 'ux-alpha', file: 'x/ux-alpha' }]
  assert.equal(detectUxRuns(runs, 'inputs: ux-alpha').gaps.length, 0)
})

test('U1 reports unverifiable rather than orphaned when the plan is unreadable', () => {
  const runs = [{ name: 'ux-alpha', file: 'x/ux-alpha' }]
  const { gaps, unverifiable } = detectUxRuns(runs, '')

  assert.equal(gaps.length, 0, 'no run is accused without the document to check against')
  assert.equal(unverifiable.length, 1)
  assert.match(unverifiable[0].reason, /epics document could not be read/)
})

test('U1 says nothing at all when there are no runs', () => {
  assert.deepEqual(detectUxRuns([], 'anything').gaps, [])
  assert.deepEqual(detectUxRuns([], 'anything').unverifiable, [])
})

test('componentNames takes PascalCase identifiers and leaves prose alone', () => {
  const found = componentNames('Reusable input combining ValueField and SolveForButton; HTML output.')
  assert.deepEqual(found, ['SolveForButton', 'ValueField'])
  // A sentence's first word is capitalised too, and matching it links everything
  assert.ok(!found.includes('Reusable'), 'a leading capital is not an identifier')
  assert.ok(!found.includes('HTML'), 'all caps is an acronym, not a component')
})

test('U2 fires on a requirement whose components no story names', () => {
  const inventory = new Map([
    ['UX-DR', [{ id: 'UX-DR1', name: 'ValueField Component' }, { id: 'UX-DR2', name: 'GhostWidget Component' }]],
  ])
  const stories = [{ key: '1-1-a', epic: 1, index: 1, title: 'A', file: 'spec-1-1-a.md' }]
  const text = new Map([['spec-1-1-a.md', 'implements ValueField here']])

  const { gaps } = detectUxRequirements(inventory, stories, text)
  assert.equal(gaps.length, 1, 'one finding, not one per requirement')
  assert.equal(gaps[0].id, 'U2')
  assert.equal(gaps[0].subject, '1 of 2 UX design requirements')
  assert.match(gaps[0].evidence, /UX-DR2/)
  assert.match(gaps[0].action.payload, /GhostWidget/)
})

test('U2 stays silent when a component link exists even if the id is never quoted', () => {
  // This is the reference repository's actual shape: no story cites UX-DR1, and
  // every story that builds ValueField carries it anyway. Reporting the missing
  // citation as missing work was wrong.
  const inventory = new Map([['UX-DR', [{ id: 'UX-DR1', name: 'ValueField Component' }]]])
  const stories = [{ key: '1-5-tools', epic: 1, index: 5, title: 'Tools', file: 'spec-1-5-tools.md' }]
  const text = new Map([['spec-1-5-tools.md', 'ValueField accepts and spreads className']])

  assert.deepEqual(detectUxRequirements(inventory, stories, text).gaps, [])
})

test('linkUxToEpics reports the components the link rests on', () => {
  const inventory = new Map([
    ['UX-DR', [{ id: 'UX-DR6', name: 'ParallelSchematic and SeriesSchematic components' }]],
  ])
  const stories = [
    { key: '1-6-a', epic: 1, index: 6, title: 'A', file: 'spec-1-6-a.md' },
    { key: '3-2-b', epic: 3, index: 2, title: 'B', file: 'spec-3-2-b.md' },
    { key: '4-1-c', epic: 4, index: 1, title: 'C', file: 'spec-4-1-c.md' },
  ]
  const text = new Map([
    ['spec-1-6-a.md', 'ParallelSchematic renders'],
    ['spec-3-2-b.md', 'SeriesSchematic renders'],
    ['spec-4-1-c.md', 'nothing relevant here'],
  ])

  const link = linkUxToEpics(inventory, stories, text).get('UX-DR6')
  assert.deepEqual(link.components, ['ParallelSchematic', 'SeriesSchematic'])
  assert.deepEqual(link.epics, [1, 3], 'epics in order, and 4 excluded')
  assert.equal(link.stories.length, 2)
})

test('U2 reports unverifiable rather than accusing when no story was readable', () => {
  const inventory = new Map([['UX-DR', [{ id: 'UX-DR1', name: 'ValueField' }]]])
  const { gaps, unverifiable } = detectUxRequirements(inventory, [], new Map())

  assert.equal(gaps.length, 0, 'nothing is called undelivered without the files to check')
  assert.equal(unverifiable.length, 1)
  assert.match(unverifiable[0].reason, /no story file was readable/)
})

test('U2 has nothing to say when the inventory declares no UX requirements', () => {
  assert.deepEqual(detectUxRequirements(new Map(), ['anything']).gaps, [])
})

test('real workspace: U1 and U2 both fire', { skip: !available }, () => {
  const epicsText = readFileSync(`${PLAN}/epics.md`, 'utf8')
  const listing = readdirSync(`${PLAN}/${UX_DIR}`, { withFileTypes: true }).map((d) => ({
    type: d.isDirectory() ? 'directory' : 'file',
    name: d.name,
  }))
  const runs = parseUxRuns(listing)
  assert.ok(runs.length >= 2, 'the reference project has two UX design runs')

  const u1 = detectUxRuns(runs, epicsText)
  assert.equal(u1.gaps.length, 1, 'exactly one run the plan does not name')
  assert.match(u1.gaps[0].subject, /^ux-app-shell-/)

  const stories = readdirSync(ART_DIR)
    .filter((f) => f.startsWith('spec-') && f.endsWith('.md'))
    .map((f) => readFileSync(`${ART_DIR}/${f}`, 'utf8'))
  void stories
  const inventory = parseRequirementInventory(epicsText)
  assert.equal(inventory.get('UX-DR').length, 11, 'eleven UX design requirements')

  // The calculators UX is carried by components, not by id citations, so the
  // link has to be read from the components each requirement names.
  // The listing matters: without it no story is linked to a spec file, every
  // file is null, and the component join finds nothing.
  const entries = readdirSync(ART_DIR, { withFileTypes: true }).map((d) => ({
    type: d.isDirectory() ? 'directory' : 'file',
    name: d.name,
  }))
  const model = buildModel(
    readFileSync(`${ART_DIR}/sprint-status.yaml`, 'utf8'),
    '',
    entries,
    `${ART_DIR}/sprint-status.yaml`,
  )
  const storyText = new Map(
    model.stories
      .filter((story) => story.file !== null)
      .map((story) => [story.file, readFileSync(`/root/drunk-beaver-storefront/${story.file}`, 'utf8')]),
  )
  const links = linkUxToEpics(inventory, model.stories, storyText)
  const linked = [...links.entries()].filter(([, link]) => link.epics.length > 0)
  assert.ok(linked.length >= 7, `most UX requirements reach an epic (${linked.length} of 11)`)
  assert.deepEqual(links.get('UX-DR1').epics, [1, 3], 'ValueField is built in epics 1 and 3')
  assert.deepEqual(links.get('UX-DR8').epics, [3], 'SeriesRowControls is epic 3 work')
})

test('architecture decisions link to epics by citation, and uncited ones stay hollow', () => {
  const spine = [
    '### AD-1 - Pure Domain Core Isolation',
    '### AD-2 \u2014 State Architecture & Canonical URL Schema',
    '### AD-9 - Target Quantity Snapping',
  ].join('\n')

  const decisions = parseArchitectureDecisions(spine)
  assert.deepEqual(decisions.map((d) => d.id), ['AD-1', 'AD-2', 'AD-9'], 'both dash forms parse')
  assert.equal(decisions[1].title, 'State Architecture & Canonical URL Schema')

  const stories = [
    { key: '1-3-core', epic: 1, index: 3, title: 'Core', file: 'spec-1-3-core.md' },
    { key: '3-1-series', epic: 3, index: 1, title: 'Series', file: 'spec-3-1-series.md' },
  ]
  const text = new Map([
    ['spec-1-3-core.md', 'implements AD-1 and AD-2 here'],
    ['spec-3-1-series.md', 'cites AD-2 as well'],
  ])

  const links = linkDecisionsToEpics(decisions, stories, text)
  assert.deepEqual(links.get('AD-1').epics, [1])
  assert.deepEqual(links.get('AD-2').epics, [1, 3], 'one decision, two epics')
  assert.deepEqual(links.get('AD-9').epics, [], 'uncited is uncited, not invented')
  assert.match(links.get('AD-9').stories.join(','), /^$/)
})

test('parseDeclaredInputs reads the list and drops the closing fence', () => {
  const epics = [
    'inputDocuments:',
    "  - '_bmad-output/planning-artifacts/briefs/brief-x/brief.md'",
    '  - AGENTS.md',
    '---',
    'body text',
  ].join('\n')

  const inputs = parseDeclaredInputs(epics)
  assert.deepEqual(inputs, ['_bmad-output/planning-artifacts/briefs/brief-x/brief.md', 'AGENTS.md'])
  assert.ok(!inputs.includes('---'), 'the fence is not an input')
})

test('parseDeclaredInputs survives a document that declares nothing', () => {
  assert.deepEqual(parseDeclaredInputs('# No frontmatter here'), [])
  assert.deepEqual(parseDeclaredInputs(''), [])
})

test('artefactFamilies reports what the planning folder holds', () => {
  const entries = [
    { type: 'directory', name: 'ux-designs' },
    { type: 'directory', name: 'briefs' },
    { type: 'directory', name: 'unrelated' },
    { type: 'file', name: 'prd.md' },
  ]
  assert.deepEqual(artefactFamilies(entries), ['briefs', 'ux-designs'], 'known families only, in order')
})
