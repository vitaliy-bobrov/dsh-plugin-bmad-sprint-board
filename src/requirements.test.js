/**
 * Requirements and their coverage, against the shape v7 keeps them in.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { coverageOf, coverageState, parseRequirements } from './requirements.js'

const REAL = '/root/drunk-beaver-storefront/_bmad-output/initiative-vip-reservations/initiative-vip-reservations.md'
const hasReal = existsSync(REAL)

test('reads the requirement bullets, with their source note', () => {
  const reqs = parseRequirements(`## Description

- not a requirement

## Requirements

- R1 (EXPERIENCE Foundation, architecture AD-4): All-Access tier eligibility resolves server-side
- R2: A plain one with no note

## Constraints

- R9 (should not be read): outside the section
`)
  assert.deepEqual(reqs.map((r) => r.id), ['R1', 'R2'])
  assert.equal(reqs[0].source, 'EXPERIENCE Foundation, architecture AD-4')
  assert.match(reqs[0].text, /All-Access tier eligibility/)
  assert.equal(reqs[1].source, '')
})

test('a reference outside the Requirements section is not a declaration', () => {
  assert.deepEqual(parseRequirements('## Notes\n\n- R1 is handled by epic 2\n'), [])
})

test('an absent file declares nothing', () => {
  assert.deepEqual(parseRequirements(null), [])
})

test('coverage state separates uncovered from unfinished', () => {
  assert.equal(coverageState(undefined), 'uncovered')
  assert.equal(coverageState([]), 'uncovered')
  assert.equal(coverageState([{ status: 'done' }]), 'covered')
  assert.equal(coverageState([{ status: 'done' }, { status: 'dropped' }]), 'covered')
  assert.equal(coverageState([{ status: 'done' }, { status: 'backlog' }]), 'partial')
})

test('coverage comes from both containers and tickets', () => {
  const initiative = {
    epics: [{
      slug: 'epic-a',
      status: 'done',
      covers: ['R1'],
      tickets: [{ ref: '1.1', status: 'done', covers: ['R1', 'R2'] }],
    }],
  }
  const coverage = coverageOf(initiative)
  assert.equal(coverage.get('R1').length, 2, 'the epic and the ticket both claim it')
  assert.equal(coverage.get('R2').length, 1)
  assert.equal(coverage.get('R3'), undefined)
})

test('real workspace: the initiative declares requirements and covers them', { skip: !hasReal }, () => {
  const reqs = parseRequirements(readFileSync(REAL, 'utf8'))
  assert.ok(reqs.length > 0, 'requirements are declared')
  assert.equal(new Set(reqs.map((r) => r.id)).size, reqs.length, 'ids are unique')
  for (const req of reqs) {
    assert.match(req.id, /^R\d+$/)
    assert.ok(req.text !== '', `${req.id} has text`)
  }
})
