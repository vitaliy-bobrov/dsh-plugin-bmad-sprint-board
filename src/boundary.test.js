/**
 * The boundary test. Run: node --test src/
 *
 * `core-extraction.md` decided that the board's logic lives in a
 * host-independent core. That decision decays silently the moment someone
 * reaches for `ctx` or a theme token inside it, so it is asserted rather than
 * trusted.
 *
 * Comments are stripped before checking. A first pass at this counted four DOM
 * references in the core that were the word "document" inside JSDoc -- the same
 * species of instrument error the project has now made ten times, and the
 * reason this file removes comments first.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const PURE_MODULES = ['core.js', 'detect.js', 'plan.js', 'config.js', 'analyse.js']
const raw = PURE_MODULES.map((f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')).join('\n')

/** Remove block and line comments, so prose cannot trip a rule. */
const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/^\s*\*.*$/gm, '')

const code = strip(raw)
const coreOnly = strip(readFileSync(new URL('./core.js', import.meta.url), 'utf8'))

const FORBIDDEN = [
  [/\bctx\b/, 'Cordis context'],
  [/\bwindow\b/, 'browser global'],
  [/\bdocument\b/, 'DOM'],
  [/\bnavigator\b/, 'browser global'],
  [/\bReact\b/, 'React'],
  [/__ModuleLoader__/, 'the DSH client loader'],
  [/dsh-resource:/, 'the DSH file-address scheme'],
  [/--dsw-/, 'a DSH theme token'],
  [/\brequire\s*\(/, 'a module require'],
  // a sibling edge within the core is fine and is stripped at build time;
  // reaching outside it is not
  [/^\s*import\s[^\n]*from\s+['"](?!\.\/)/m, 'a non-relative import'],
  [/\bslots\b|\bsidebarRightTabs\b|\bshortcuts\b/, 'a DSH service'],
]

test('every pure module is free of DSH, Cordis, React and the DOM', () => {
  const found = FORBIDDEN.filter(([re]) => re.test(code)).map(([, name]) => name)
  assert.deepEqual(found, [], `core.js must stay host-independent; found: ${found.join(', ')}`)
})

test('the core is ESM with named exports', () => {
  assert.ok(/^export (async )?function /m.test(raw), 'exports functions')
  assert.ok(!/module\.exports/.test(code), 'no CommonJS export')
})

test('host-specific concerns live in the shell, not the core', () => {
  // the palette and the addressing scheme were carved into the shell
  const shellPre = readFileSync(new URL('./shell-pre.js', import.meta.url), 'utf8')
  for (const needle of ['STATUS_TOKEN', 'IDLE_TOKEN', 'FILE_ADDRESS_PREFIX', 'sessionFileAddress']) {
    assert.ok(shellPre.includes(needle), `${needle} belongs to the shell`)
    assert.ok(!raw.includes(needle), `${needle} must not be in the core`)
  }
})

test('the built client.js is current', () => {
  // build.mjs --check is the same assertion from the outside; this keeps it in
  // the test run so a stale bundle cannot be committed.
  execFileSync(process.execPath, [new URL('../build.mjs', import.meta.url).pathname, '--check'], {
    stdio: 'pipe',
  })
})
