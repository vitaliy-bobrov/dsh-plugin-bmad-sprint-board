#!/usr/bin/env node
/**
 * Assemble `client.js` from the source pieces.
 *
 * DSH serves a client bundle as one built file and its loader resolves only
 * platform seeds and registered factories -- a sibling `require` throws and a
 * relative chunk must be an async `client.<name>.js`. So the core cannot be
 * imported at runtime; it is inlined here instead.
 *
 * Zero dependencies on purpose: the bundle had none, and a build step is not
 * worth a package.
 *
 *   node build.mjs           write client.js
 *   node build.mjs --check   fail if client.js is out of date
 */
import { readFileSync, writeFileSync } from 'node:fs'

const read = (f) => readFileSync(new URL(`./src/${f}`, import.meta.url), 'utf8')
const OUT = new URL('./client.js', import.meta.url)

/** Re-indent a dedented core module to factory depth, dropping its module edges. */
const inline = (source) =>
  source
    // Every symbol is already in factory scope, so imports go. The pattern has to
    // span lines: a single-line rule leaves the tail of a multi-line import
    // behind, which arrives as a bare `} from './x.js'` and fails the build with
    // a syntax error pointing at the bundled file rather than at the import.
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^export \* from .*$/gm, '')
    .replace(/^export \{[^}]*\} from .*$/gm, '')
    .replace(/^export /gm, '')
    .replace(/^export \{\};?$/gm, '')
    .split('\n')
    .map((l) => (l.trim() === '' ? '' : `    ${l}`))
    .join('\n')

const banner = `/**
 * BMAD Sprint Board -- the Client half of the bundle. GENERATED -- do not edit.
 *
 * Built from src/ by \`node build.mjs\`. Edit src/core.js, src/shell-*.js.
 * src/boundary.test.js asserts the core names no DSH symbol; src/core.test.js
 * exercises it directly.
 *
 * Contributes one page-type tab to the Session's right Sidebar and one guide
 * entry that opens it. The board is strictly read-only: it reads workspace
 * files through the Host \`workspaceFiles\` Remote face and never writes.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/client
 */

`

// The core modules are inlined in dependency order: core defines the model,
// plan and detect build on it. `index.js` is the Node-facing entry and is not
// inlined -- the shell calls the same functions directly.
const pieces = [
  banner,
  read('shell-head.js'),
  read('shell-pre.js'),
  inline(read('core.js')),
  inline(read('config.js')),
  inline(read('detect.js')),
  inline(read('plan.js')),
  inline(read('ux.js')),
  inline(read('requirements.js')),
  inline(read('planning.js')),
  inline(read('analyse.js')),
  read('shell-post.js'),
]
const built = pieces.join('\n')

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== built) {
    console.error('client.js is stale -- run: node build.mjs')
    process.exit(1)
  }
  console.log('client.js is up to date')
} else {
  writeFileSync(OUT, built)
  const n = built.split('\n').length
  console.log(`wrote client.js -- ${n} lines, ${built.length} bytes`)
}
