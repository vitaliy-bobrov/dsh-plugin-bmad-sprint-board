/**
 * Bundle test. Run: node --test src/
 *
 * Loads the built `client.js` the way the browser loader does and materializes
 * its factory. `node --check` cannot catch everything: a stray backtick inside
 * the CSS template literal ends it early, and the leftover text can still parse
 * as valid JavaScript -- `.bmad-sb-card` becomes `.bmad - sb - card`, which is
 * syntactically fine and blows up only when the factory runs. That is exactly
 * what happened, and this file is why it cannot happen silently again.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const CLIENT = new URL('../client.js', import.meta.url)
const source = readFileSync(CLIENT, 'utf8')

/** A React stand-in: enough for the factory to build components, nothing more. */
const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (initial) => [initial, () => {}],
  useEffect: () => {},
  useMemo: (factory) => factory(),
  useCallback: (fn) => fn,
  useRef: (value) => ({ current: value }),
}

/** Load the bundle and materialize its factory, exactly as the loader does. */
function materialize(text) {
  let registered = null
  const previous = globalThis.window
  globalThis.window = { __ModuleLoader__: { load: (entry) => { registered = entry } } }
  try {
    new Function(text)()
  } finally {
    globalThis.window = previous
  }
  if (registered === null) throw new Error('the bundle registered no module')

  const api = registered.factory((spec) => {
    if (spec === 'react') return reactStub
    throw new Error(`unexpected require: ${spec}`)
  })
  return { registered, api }
}

test('the bundle registers under its own id', () => {
  const { registered } = materialize(source)
  assert.equal(registered.id, '@local/dsh-plugin-bmad-sprint-board')
})

test('the factory materializes without throwing', () => {
  const { api } = materialize(source)
  assert.ok(api && typeof api === 'object', 'the factory returns the plugin object')
  assert.ok(Array.isArray(api.inject), 'it declares its inject list')
  assert.equal(typeof api.apply, 'function', 'it exposes apply')
  for (const key of ['slots', 'locale', 'sidebarRightTabs', 'remote.workspaceFiles']) {
    assert.ok(api.inject.includes(key), `injects ${key}`)
  }
})

test('apply registers the dictionary', () => {
  const { api } = materialize(source)
  const calls = []
  const ctx = {
    effect: (run, label) => { calls.push(label); run() },
    locale: { register: (ns) => calls.push(`locale:${ns}`), bind: () => (k) => k },
    slots: { inject: () => {}, register: () => {} },
    sidebarRightTabs: { register: () => {} },
    inject: () => {},
  }
  api.apply(ctx)
  assert.ok(calls.some((c) => String(c).startsWith('locale:')), 'registers its dictionary')
})

test('the bundle is plain ASCII', () => {
  // Not a rule the harness states, but a hand-assembled bundle is better off
  // without an encoding question in it.
  const nonAscii = [...source].filter((c) => c.codePointAt(0) > 126)
  assert.deepEqual(nonAscii, [], 'no non-ASCII characters in the built bundle')
})

test('the CSS template literal closes exactly once', () => {
  const start = source.indexOf('const CSS = `')
  assert.ok(start > 0, 'the CSS block exists')
  const end = source.indexOf('`;', start)
  assert.ok(end > start, 'and it closes')
  const body = source.slice(start + 'const CSS = `'.length, end)
  assert.ok(!body.includes('`'), 'no stray backtick inside the CSS text')
})

test('every declaration a source module exports survives into the bundle', () => {
  // The inverse of a check that kept misfiring. Reading definitions from the
  // sources and looking for them in the build cannot false-positive on string
  // content, and it catches the failure that actually happens: the inliner
  // dropping a module or a declaration.
  //
  // Known gap: this cannot catch an identifier that is *used* but never defined
  // anywhere -- `WARN_TOKEN` was invented once and reached a build that way.
  // Nothing here renders, so a free identifier only fails when executed; the
  // live board is what caught that one.
  const dir = new URL('./', import.meta.url)
  const modules = readdirSync(dir)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js') && f !== 'index.js')
    .map((f) => readFileSync(new URL(f, dir), 'utf8'))

  const declared = new Set()
  for (const text of modules) {
    for (const m of text.matchAll(/^export const ([A-Z][A-Z0-9_]*)/gm)) declared.add(m[1])
    for (const m of text.matchAll(/^export function (\w+)/gm)) declared.add(m[1])
  }

  const missing = [...declared].filter(
    (name) => !source.includes(`function ${name}`) && !source.includes(`const ${name} `),
  )
  assert.deepEqual(missing, [], `not inlined: ${missing.join(', ')}`)
  assert.ok(declared.size > 20, `found modules to check (${declared.size} declarations)`)
})

test('analyse returns one key per thing it produces', () => {
  // `requirements` was used twice in the same object literal: once for the
  // summary bar and once for the requirements view. JavaScript allows it, the
  // last one wins, and the view silently became the bar -- so the pane read
  // `lanes` off an object that has none and the tab crashed on open. Nothing
  // caught it, because nothing looked at the shape of what analyse returns.
  const dir = new URL('./', import.meta.url)
  const text = readFileSync(new URL('analyse.js', dir), 'utf8')
  const body = text.slice(text.indexOf('  return {'), text.lastIndexOf('}'))
  const keys = [...body.matchAll(/^\s{4}([A-Za-z_$][\w$]*)\s*[,:]/gm)].map((m) => m[1])
  const duplicates = keys.filter((key, i) => keys.indexOf(key) !== i)
  assert.deepEqual(duplicates, [], `duplicate keys: ${duplicates.join(', ')}`)
  assert.ok(keys.includes('requirementView'), 'the view is returned under its own key')
})

test('analyse returns one key per thing it produces', () => {
  // `requirements` was used twice in the same object literal: once for the
  // summary bar and once for the requirements view. JavaScript allows it, the
  // last one wins, and the view silently became the bar -- so the pane read
  // `lanes` off an object that has none and the tab crashed on open. Nothing
  // caught it, because nothing looked at the shape of what analyse returns.
  const dir = new URL('./', import.meta.url)
  const text = readFileSync(new URL('analyse.js', dir), 'utf8')
  const body = text.slice(text.indexOf('  return {'), text.lastIndexOf('}'))
  const keys = [...body.matchAll(/^\s{4}([A-Za-z_$][\w$]*)\s*[,:]/gm)].map((m) => m[1])
  const duplicates = keys.filter((key, i) => keys.indexOf(key) !== i)
  assert.deepEqual(duplicates, [], `duplicate keys: ${duplicates.join(', ')}`)
  assert.ok(keys.includes('requirementView'), 'the view is returned under its own key')
})
