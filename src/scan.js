/**
 * Read a BMAD v7 project through the workspace face.
 *
 * The file operations arrive as arguments, so the whole scan is exercised by the
 * tests against fixture directories without a Host. Nothing here writes.
 *
 * The read plan mirrors the layout: config, then the initiative folders, then
 * each initiative's epic index, then each epic's ticket index and plan files.
 * Every read that fails contributes an "unreadable" record instead of throwing,
 * because one missing file must not take the whole board down and a board that
 * cannot see a file must say so.
 *
 * @module dsh-plugin-bmad-sprint-board/scan
 */

import { CONFIG_LAYERS, detectedVersion, resolveConfig } from './config.js'
import { buildInitiative } from './model.js'
import { PLAN_SUFFIX, readEpicIndex } from './store.js'

/** How many reads the scan keeps in flight; the same figure the shell used. */
export const READ_CONCURRENCY = 8

/** The folder-name prefix every v7 initiative carries. */
export const INITIATIVE_PREFIX = 'initiative-'

/**
 * Run `mapper` over `items` with at most `limit` in flight, preserving order.
 *
 * @param {Array<*>} items - the work items.
 * @param {number} limit - how many may run at once.
 * @param {function(*, number): Promise<*>} mapper - the async work.
 * @returns {Promise<Array<*>>} the results, in input order.
 */
export async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Join a workspace-directory path with a name.
 *
 * @param {string} dir - the directory, possibly empty for the workspace root.
 * @param {string} name - the child's name.
 * @returns {string} the joined path.
 */
export function join(dir, name) {
  return dir === '' ? name : `${dir.replace(/\/+$/, '')}/${name}`
}

/**
 * Read a file, treating a miss as absence rather than failure.
 *
 * Most files the scan wants are legitimately optional: an initiative with no
 * epics has no `tickets.toml`, and a project with no personal overrides has no
 * `config.user.toml`. Recording those as unreadable would fill the board with
 * alarms about files that are correctly not there.
 *
 * @param {object} io - the workspace face.
 * @param {string} path - the workspace-relative path.
 * @param {AbortSignal|undefined} signal - cancellation.
 * @returns {Promise<string|null>} the text, or null when absent or unreadable.
 */
async function tryRead(io, path, signal) {
  try {
    return await io.read(path, signal)
  } catch {
    return null
  }
}

/**
 * List a directory, treating a miss as an empty listing.
 *
 * @param {object} io - the workspace face.
 * @param {string} path - the workspace-relative path.
 * @param {AbortSignal|undefined} signal - cancellation.
 * @returns {Promise<Array<{name: string, type: string}>>} the entries.
 */
async function tryList(io, path, signal) {
  try {
    return await io.list(path, signal)
  } catch {
    return []
  }
}

/**
 * Read one epic: its ticket index, its own file, and every plan beside them.
 *
 * @param {object} io - the workspace face.
 * @param {string} initiativeDir - the initiative's folder.
 * @param {{id: *, slug: string, title: string}} row - one row of the epic index.
 * @param {AbortSignal|undefined} signal - cancellation.
 * @param {Array<object>} unreadable - the list failures are appended to.
 * @returns {Promise<object>} the epic's raw contents, for `buildInitiative`.
 */
async function readEpic(io, initiativeDir, row, signal, unreadable) {
  const folder = join(join(initiativeDir, 'tickets'), row.slug)
  const [ticket, storyIndex, listing] = await Promise.all([
    tryRead(io, join(folder, `${row.slug}.md`), signal),
    tryRead(io, join(join(folder, 'tickets'), 'tickets.toml'), signal),
    tryList(io, join(folder, 'tickets'), signal),
  ])

  const names = listing
    .filter((entry) => entry.type === 'file' && entry.name.endsWith(PLAN_SUFFIX))
    .map((entry) => entry.name)
    .sort()

  // A plan that the directory listing named and the reader could not open is a
  // real problem -- it exists and its state is hidden -- so only this read is
  // recorded when it fails.
  const plans = await mapLimit(names, READ_CONCURRENCY, async (name) => {
    const path = join(join(folder, 'tickets'), name)
    const text = await tryRead(io, path, signal)
    if (text === null) {
      unreadable.push({ path, error: 'listed but unreadable' })
      return null
    }
    return { path, text }
  })

  return { ...row, folder, ticket, storyIndex, plans: plans.filter(Boolean) }
}

/**
 * Read one initiative.
 *
 * @param {object} io - the workspace face.
 * @param {string} outputFolder - the resolved output folder.
 * @param {string} name - the folder name, `initiative-<slug>`.
 * @param {AbortSignal|undefined} signal - cancellation.
 * @param {Array<object>} unreadable - the list failures are appended to.
 * @returns {Promise<object>} the initiative model.
 */
async function readInitiative(io, outputFolder, name, signal, unreadable) {
  const dir = join(outputFolder, name)
  const slug = name.slice(INITIATIVE_PREFIX.length)
  const before = unreadable.length

  const [ticket, indexText] = await Promise.all([
    tryRead(io, join(dir, `${name}.md`), signal),
    tryRead(io, join(join(dir, 'tickets'), 'tickets.toml'), signal),
  ])

  const rows = readEpicIndex(indexText)
  const epics = await mapLimit(rows, READ_CONCURRENCY, (row) =>
    readEpic(io, dir, row, signal, unreadable))

  return buildInitiative({
    slug,
    dir,
    ticket,
    epics,
    unreadable: unreadable.length - before,
  })
}

/**
 * Read every initiative in a v7 project.
 *
 * @param {object} io - `{read, list, stat}` bound to the session's workspace.
 * @param {AbortSignal|undefined} signal - cancellation.
 * @returns {Promise<object>} the version, the resolved config, every initiative, and what could not be read.
 */
export async function scanProject(io, signal) {
  const unreadable = []

  const layers = await Promise.all(
    CONFIG_LAYERS.map((path) => tryRead(io, path, signal)),
  )
  const config = resolveConfig(layers)

  // Without a declared output folder the project is either not BMAD or a v6
  // install, and the files the board would need are not where it looks. Say so
  // rather than showing an empty board.
  const hasBmad = await io.stat('_bmad/config.toml', signal).then((r) => r.ok).catch(() => false)
  const hasSprintStatus = await io
    .stat('_bmad-output/implementation-artifacts/sprint-status.yaml', signal)
    .then((r) => r.ok)
    .catch(() => false)

  if (config.outputFolder === null) {
    return { version: hasBmad ? 'v6' : 'none', config, initiatives: [], unreadable }
  }

  const listing = await tryList(io, config.outputFolder, signal)
  const names = listing
    .filter((entry) => entry.type === 'directory' && entry.name.startsWith(INITIATIVE_PREFIX))
    .map((entry) => entry.name)
    .sort()

  const initiatives = await mapLimit(names, READ_CONCURRENCY, (name) =>
    readInitiative(io, config.outputFolder, name, signal, unreadable))

  return {
    version: detectedVersion({
      config,
      hasSprintStatus,
      initiatives: initiatives.length,
    }),
    config,
    initiatives,
    unreadable,
  }
}
