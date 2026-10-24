/**
 * The scan, against a synthetic workspace.
 *
 * The face is stubbed rather than mocked with a library: `read`/`list`/`stat`
 * are three functions, and a plain object of them is both shorter and clearer
 * than any harness.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mapLimit, scanProject } from './scan.js'

/**
 * Build a workspace face over a path -> text map.
 *
 * Directories are derived from the paths, so a fixture only lists the files that
 * matter and cannot get its own directory listing wrong.
 *
 * @param {object} files - path -> contents.
 * @returns {object} the face.
 */
function face(files) {
  const dirs = new Set([''])
  for (const path of Object.keys(files)) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'))
  }
  return {
    async read(path) {
      if (!(path in files)) throw new Error(`ENOENT ${path}`)
      return files[path]
    },
    async list(path) {
      if (!dirs.has(path)) throw new Error(`ENOENT ${path}`)
      const prefix = path === '' ? '' : `${path}/`
      const seen = new Map()
      // Directories are read from the directory set, never inferred from a child
      // path: a folder that also appears as a file's parent must stay a folder.
      for (const key of dirs) {
        if (key === path || !key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        if (rest === '' || rest.includes('/')) continue
        seen.set(rest, 'directory')
      }
      for (const key of Object.keys(files)) {
        if (!key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        if (rest === '' || rest.includes('/') || seen.has(rest)) continue
        seen.set(rest, 'file')
      }
      return [...seen].map(([name, type]) => ({ name, type }))
    },
    async stat(path) {
      const ok = path in files || dirs.has(path)
      return ok ? { ok: true } : { ok: false, code: 'ENOENT' }
    },
  }
}

/** The smallest v7 project that carries one initiative and one ticket. */
const V7 = {
  '_bmad/config.toml': '[core]\noutput_folder = "{project-root}/_bmad-output"\n',
  '_bmad-output/initiative-x/initiative-x.md': "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n",
  '_bmad-output/initiative-x/tickets/tickets.toml': '[[epic]]\nid = 1\nslug = "epic-a"\ntitle = "Epic A"\n',
  '_bmad-output/initiative-x/tickets/epic-a/epic-a.md': "---\ntype: epic\ntitle: 'Epic A'\nparent: x\nstatus: 'in-progress'\n---\n",
  '_bmad-output/initiative-x/tickets/epic-a/tickets/tickets.toml': '[[entry]]\nid = "1"\ntype = "story"\ntitle = "Only ticket"\n',
  // a leaf: the ticket itself, named the way BMAD names one and typed as the
  // store requires, with its id matching the index entry
  '_bmad-output/initiative-x/tickets/epic-a/tickets/story-only-ticket.md': "---\nid: '1'\ntitle: 'Only ticket'\ntype: story\nstatus: 'done'\n---\n",
}

test('a v7 project is recognised and read into initiatives', async () => {
  const result = await scanProject(face(V7))
  assert.equal(result.version, 'v7')
  assert.equal(result.config.outputFolder, '_bmad-output')
  assert.equal(result.initiatives.length, 1)
  assert.equal(result.initiatives[0].counts.tickets, 1)
  assert.equal(result.initiatives[0].counts.settled, 1)
  assert.deepEqual(result.unreadable, [])
})

test('the active initiative is resolved from the user layer', async () => {
  const result = await scanProject(face({
    ...V7,
    '_bmad/custom/config.user.toml': '[core]\nactive_initiative = "initiative-x"\n',
  }))
  assert.equal(result.config.activeInitiative, 'initiative-x')
})

test('no active initiative is reported as null, not invented', async () => {
  const result = await scanProject(face(V7))
  assert.equal(result.config.activeInitiative, null)
})

test('a v6 project is identified so the board can point at the older version', async () => {
  const result = await scanProject(face({
    '_bmad/config.toml': '[modules.bmm]\nimplementation_artifacts = "{project-root}/_bmad-output/implementation-artifacts"\n',
    '_bmad-output/implementation-artifacts/sprint-status.yaml': 'development_status:\n  1-1: done\n',
  }))
  assert.equal(result.version, 'v6')
  assert.deepEqual(result.initiatives, [])
})

test('a project with no BMAD at all is none', async () => {
  const result = await scanProject(face({ 'README.md': '# hi' }))
  assert.equal(result.version, 'none')
})

test('an initiative with no epic index is empty, not unreadable', async () => {
  const result = await scanProject(face({
    '_bmad/config.toml': '[core]\noutput_folder = "{project-root}/_bmad-output"\n',
    '_bmad-output/initiative-empty/initiative-empty.md': "---\ntype: initiative\ntitle: 'Empty'\nstatus: 'done'\n---\n",
  }))
  assert.equal(result.initiatives.length, 1)
  assert.equal(result.initiatives[0].counts.epics, 0)
  assert.deepEqual(result.unreadable, [], 'an absent index is absence, not failure')
})

test('a listed plan that cannot be read is reported', async () => {
  const files = { ...V7 }
  delete files['_bmad-output/initiative-x/tickets/epic-a/tickets/story-only-ticket.md']
  // The listing still names the file, because dirs are derived from files: so
  // add a sibling probe by listing the directory directly.
  const io = face(files)
  const list = io.list
  io.list = async (path, signal) => (
    path.endsWith('epic-a/tickets')
      ? [...(await list(path, signal)), { name: 'story-ghost.md', type: 'file' }]
      : list(path, signal)
  )
  const result = await scanProject(io)
  assert.equal(result.unreadable.length, 1)
  assert.match(result.unreadable[0].path, /story-ghost\.md/)
})

test('mapLimit keeps input order and never exceeds the limit', async () => {
  let inFlight = 0
  let peak = 0
  const out = await mapLimit([3, 1, 2, 5, 4], 2, async (n) => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise((resolve) => setTimeout(resolve, n))
    inFlight -= 1
    return n * 2
  })
  assert.deepEqual(out, [6, 2, 4, 10, 8])
  assert.ok(peak <= 2, `peak concurrency was ${peak}`)
})

test('mapLimit on an empty list resolves to an empty list', async () => {
  assert.deepEqual(await mapLimit([], 8, async () => 1), [])
})
