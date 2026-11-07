/**
 * The UX reader: the run, its component patterns, and who delivers them.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { deliveredBy, parseComponentPatterns, parseUxRun } from './ux.js'

const REAL = '/root/drunk-beaver-storefront/_bmad-output/initiative-vip-reservations/'
  + 'ux-drunk-beaver-storefront-vip-reservations-2026-10-22/EXPERIENCE.md'
const hasReal = existsSync(REAL)

test('finds the run folder, and reports none when there is none', () => {
  const entries = [
    { name: 'initiative-x.md', type: 'file' },
    { name: 'ux-a-2026-01-01', type: 'directory' },
    { name: 'brainstorm-b', type: 'directory' },
  ]
  assert.equal(parseUxRun(entries), 'ux-a-2026-01-01')
  assert.equal(parseUxRun([{ name: 'other', type: 'directory' }]), null)
  assert.equal(parseUxRun([]), null)
})

test('reads the component patterns under their own section', () => {
  const patterns = parseComponentPatterns(`## Foundation

### Not a pattern

## Component Patterns

### Reserve Button (PDP)

some text

### Loyalty Tracker *(Deferred to Phase 3)*

## Journeys

### J1 -- a journey
`)
  assert.deepEqual(patterns.map((p) => p.name), ['Reserve Button', 'Loyalty Tracker'])
  assert.equal(patterns[0].deferred, false)
  // the design postponed it itself, so the plan cannot have failed to deliver it
  assert.equal(patterns[1].deferred, true)
})

test('a document with no patterns section yields nothing', () => {
  assert.deepEqual(parseComponentPatterns('# Just a doc\n\n### A heading\n'), [])
  assert.deepEqual(parseComponentPatterns(null), [])
})

test('a component is delivered by whichever text names it, however it is written', () => {
  const tickets = [
    { ref: 'epic-a', text: 'builds the ReservationCard and the dialog' },
    { ref: 'epic-b', text: 'unrelated work' },
    { ref: 'epic-c', text: 'touches dashboard-reservations-zone styles' },
  ]
  assert.deepEqual(deliveredBy('Reservation Card', tickets), ['epic-a'])
  assert.deepEqual(deliveredBy('Dashboard Reservations Zone', tickets), ['epic-c'])
  assert.deepEqual(deliveredBy('Teaser PDP', tickets), [])
})

test('an empty name matches nothing rather than everything', () => {
  const tickets = [{ ref: 'a', text: 'anything at all' }]
  assert.deepEqual(deliveredBy('', tickets), [])
  assert.deepEqual(deliveredBy('()', tickets), [])
})

test('real workspace: the live UX run parses into named patterns', { skip: !hasReal }, () => {
  const patterns = parseComponentPatterns(readFileSync(REAL, 'utf8'))
  assert.ok(patterns.length > 0, 'the design names component patterns')
  for (const pattern of patterns) {
    assert.ok(pattern.name !== '', 'every pattern has a name')
    assert.equal(typeof pattern.deferred, 'boolean')
  }
  assert.ok(patterns.some((p) => p.deferred), 'and at least one is marked deferred')
})
