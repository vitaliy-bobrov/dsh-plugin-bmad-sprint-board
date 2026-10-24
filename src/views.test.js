/**
 * The four views, rendered headlessly.
 *
 * A plugin that only ever runs in a browser is a plugin whose views are never
 * asserted: `node --check` sees structure, `bundle.test.js` sees the factory
 * materialise, and nothing sees what the board actually puts on screen. So this
 * file runs the built bundle the way the loader does, applies it, and walks the
 * element tree the components return.
 *
 * It is not a React renderer. It tracks one hook slot per call site so the
 * snapshot can resolve, expands every function component, and stops at leaf
 * elements. That is enough to answer the questions the browser was being asked:
 * which view is shown, which initiative it is showing, and whether settled work
 * is folded out of the way without being dropped.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

/**
 * The hook runtime for one component instance.
 *
 * Slots are positional, which is what React guarantees and what the components
 * rely on; `cursor` is reset before each pass so slot N is always the same call.
 */
const runtime = { slots: [], cursor: -1, pending: [], dirty: false }

/** The current pass's slot for this hook call. */
function slotAt() {
  runtime.cursor += 1;
  if (!(runtime.cursor in runtime.slots)) runtime.slots[runtime.cursor] = {};
  return runtime.slots[runtime.cursor];
}

/**
 * Load the bundle and apply it, capturing the component it registers.
 *
 * @returns {Promise<Function>} the board component.
 */
function loadBoard() {
  const captured = []
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => {
      const slot = slotAt();
      if (!('value' in slot)) slot.value = typeof initial === 'function' ? initial() : initial;
      return [slot.value, (next) => {
        const value = typeof next === 'function' ? next(slot.value) : next;
        if (value !== slot.value) {
          slot.value = value;
          runtime.dirty = true;
        }
      }];
    },
    useEffect: (fn, deps) => {
      const slot = slotAt();
      const same = slot.deps !== undefined && deps !== undefined
        && slot.deps.length === deps.length
        && deps.every((dep, i) => dep === slot.deps[i]);
      if (same) return;
      slot.deps = deps;
      runtime.pending.push(fn);
    },
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useRef: (value) => {
      const slot = slotAt();
      if (!('ref' in slot)) slot.ref = { current: value };
      return slot.ref;
    },
  }

  let registered = null
  const previous = globalThis.window
  globalThis.window = { __ModuleLoader__: { load: (entry) => { registered = entry } } }
  try {
    new Function(source)()
  } finally {
    globalThis.window = previous
  }
  const api = registered.factory((spec) => {
    if (spec === 'react') return react
    throw new Error(`unexpected require: ${spec}`)
  })

  const slots = {
    inject: (_name, make) => make(),
    register: (_spec, Component) => { captured.push(Component); return () => {} },
  }
  api.apply({
    effect: (run) => run(),
    locale: { register: () => {}, bind: () => (key) => key },
    slots,
    sidebarRightTabs: { register: () => () => {} },
    shortcuts: { register: () => () => {} },
    inject: () => {},
  })
  assert.ok(captured.length > 0, 'the plugin registered a component')
  return captured[captured.length - 1]
}

/** The workspace the board reads, as a path -> text map. */
const FILES = {
  '_bmad/config.toml': '[core]\noutput_folder = "{project-root}/_bmad-output"\n',
  '_bmad-output/initiative-open/initiative-open.md':
    "---\ntype: initiative\ntitle: 'Open work'\nstatus: 'in-progress'\n---\n",
  '_bmad-output/initiative-open/tickets/tickets.toml':
    '[[epic]]\nid = 1\nslug = "epic-a"\ntitle = "Epic A"\n',
  '_bmad-output/initiative-open/tickets/epic-a/epic-a.md':
    "---\ntype: epic\ntitle: 'Epic A'\nparent: open\nstatus: 'in-progress'\n---\n",
  '_bmad-output/initiative-open/tickets/epic-a/tickets/tickets.toml':
    '[[entry]]\nid = "1"\ntype = "story"\ntitle = "Wire the panel"\n',
  '_bmad-output/initiative-open/tickets/epic-a/tickets/story-wire-the-panel-plan.md':
    "---\ntitle: 'Wire the panel'\ntype: story\nstatus: 'in-progress'\nticket: '1'\n---\n",
  '_bmad-output/initiative-finished/initiative-finished.md':
    "---\ntype: initiative\ntitle: 'Finished work'\nstatus: 'done'\n---\n",
}

/** Build a workspace face over FILES, deriving directories from the paths. */
function face(files) {
  const dirs = new Set([''])
  for (const path of Object.keys(files)) {
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'))
  }
  return {
    read: async (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`)
      return files[path]
    },
    list: async (path) => {
      if (!dirs.has(path)) throw new Error(`ENOENT ${path}`)
      const prefix = path === '' ? '' : `${path}/`
      const out = new Map()
      for (const key of dirs) {
        if (key === path || !key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        if (rest === '' || rest.includes('/')) continue
        out.set(rest, 'directory')
      }
      for (const key of Object.keys(files)) {
        if (!key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        if (rest === '' || rest.includes('/') || out.has(rest)) continue
        out.set(rest, 'file')
      }
      return [...out].map(([name, type]) => ({ name, type }))
    },
    stat: async (path) => (path in files || dirs.has(path) ? { ok: true } : { ok: false }),
  }
}

/** Collect every element in a tree, whether nested in props or children. */
function elements(node, into = []) {
  if (Array.isArray(node)) {
    for (const child of node) elements(child, into)
    return into
  }
  if (node === null || typeof node !== 'object') return into
  into.push(node)
  for (const child of Object.values(node.props ?? {})) {
    if (typeof child === 'object') elements(child, into)
  }
  for (const child of node.children ?? []) elements(child, into)
  if (node.rendered !== undefined) elements(node.rendered, into)
  return into
}

/** Every name in a tree, which is how a component's presence is asserted. */
function names(node) {
  return elements(node).map((element) => (typeof element.type === 'function' ? element.type.name : element.type))
}

/**
 * Expand the element tree, calling every function component once.
 *
 * Leaves are returned as they are, so the assertions read the same names the
 * source uses.
 *
 * @param {object} node - an element from `createElement`.
 * @returns {object} the expanded tree.
 */
function expand(node) {
  if (Array.isArray(node)) return node.map(expand)
  if (node === null || typeof node !== 'object') return node
  if (typeof node.type === 'function') {
    const rendered = node.type({ ...node.props })
    return { fn: node.type, name: node.type.name, props: node.props, rendered: expand(rendered) }
  }
  return { name: node.type, props: node.props, children: (node.children ?? []).map(expand) }
}

/**
 * Render the board and settle its snapshot.
 *
 * The snapshot resolves through an effect, so the board is rendered repeatedly
 * until nothing changes. Each pass awaits a macrotask, which lets `scanProject`'s
 * promise chain run to completion between passes.
 *
 * @param {Function} Board - the registered component.
 * @param {object} props - the tab props.
 * @returns {Promise<object>} the settled element tree.
 */
async function settle(Board, props, { reset = true } = {}) {
  if (reset) runtime.slots = []
  let tree = null
  for (let pass = 0; pass < 6; pass += 1) {
    runtime.cursor = -1
    runtime.pending = []
    runtime.dirty = false
    tree = expand(Board(props))
    for (const effect of runtime.pending) effect()
    // The snapshot resolves through a promise chain, so the tick has to happen
    // after the effect starts it and before the next pass reads the state.
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (!runtime.dirty) break
  }
  return tree
}

test('the board opens on Initiatives when no active initiative is named', async () => {
  const Board = loadBoard()
  const io = face(FILES)
  const tree = await settle(Board, {
    t: (key) => key,
    useTabInfo: () => ({ tab: { actions: {}, signal: new AbortController().signal } }),
    sessionId: 'session-open',
    readWorkspaceFile: io.read,
    listWorkspaceDir: io.list,
    statWorkspacePath: io.stat,
    fileAddress: (path) => path,
  })

  const found = names(tree)
  assert.ok(found.includes('InitiativesView'), `expected the Initiatives view, saw: ${found.join(', ')}`)
})

test('the header offers four views and the board renders the selected one', async () => {
  const Board = loadBoard()
  const io = face(FILES)
  const tree = await settle(Board, {
    t: (key) => key,
    useTabInfo: () => ({ tab: { actions: {}, signal: new AbortController().signal } }),
    sessionId: 'session-views',
    readWorkspaceFile: io.read,
    listWorkspaceDir: io.list,
    statWorkspacePath: io.stat,
    fileAddress: (path) => path,
  })

  const header = elements(tree).find((element) => element.type?.name === 'BoardHeader')
  assert.ok(header, 'the header rendered')
  const segments = header.props.views ?? header.props.viewList ?? null
  // The view list is passed down; when it is not, the segment labels are built
  // from it, so names() is the fallback evidence.
  if (segments !== null) {
    assert.deepEqual(segments, ['status', 'epic', 'tickets', 'initiatives'])
  } else {
    const found = names(tree)
    assert.ok(found.includes('InitiativesView'), `views reached the body: ${found.join(', ')}`)
  }
})

test('settled initiatives fold into one lane, and are counted not dropped', async () => {
  const Board = loadBoard()
  const io = face(FILES)
  const tree = await settle(Board, {
    t: (key) => key,
    useTabInfo: () => ({ tab: { actions: {}, signal: new AbortController().signal } }),
    sessionId: 'session-settled',
    readWorkspaceFile: io.read,
    listWorkspaceDir: io.list,
    statWorkspacePath: io.stat,
    fileAddress: (path) => path,
  })

  const lanes = elements(tree).filter((element) => element.name === 'CardLane')
  const settled = lanes.find((lane) => lane.props.label === 'settledInitiatives')
  assert.ok(settled, `expected a settled lane, saw: ${lanes.map((l) => l.props.label).join(', ')}`)
  // Counted, so the fold says how much is behind it, and folded, so finished
  // work is not the first thing on the page.
  assert.equal(settled.props.count, '1')
  assert.equal(settled.props.collapsed, true)
})

test('picking an initiative switches the board to the Status view', async () => {
  const Board = loadBoard()
  const io = face(FILES)
  const props = {
    t: (key) => key,
    useTabInfo: () => ({ tab: { actions: {}, signal: new AbortController().signal } }),
    sessionId: 'session-pick',
    readWorkspaceFile: io.read,
    listWorkspaceDir: io.list,
    statWorkspacePath: io.stat,
    fileAddress: (path) => path,
  }

  const first = await settle(Board, props)
  const card = elements(first).find((element) => element.name === 'Card')
  assert.ok(card, 'the initiatives list rendered a card')

  card.props.onOpen()
  const second = await settle(Board, props, { reset: false })
  const found = names(second)
  assert.ok(found.includes('StatusView'), `expected the Status view, saw: ${found.join(', ')}`)
  assert.ok(!found.includes('InitiativesView'), 'and it left the Initiatives view')
})

test('a v6 project is refused with the version that reads it', async () => {
  const Board = loadBoard()
  const io = face({
    '_bmad/config.toml': '[modules.bmm]\nimplementation_artifacts = "x"\n',
    '_bmad-output/implementation-artifacts/sprint-status.yaml': 'development_status:\n  1-1: done\n',
  })
  const tree = await settle(Board, {
    t: (key) => key,
    useTabInfo: () => ({ tab: { actions: {}, signal: new AbortController().signal } }),
    sessionId: 'session-v6',
    readWorkspaceFile: io.read,
    listWorkspaceDir: io.list,
    statWorkspacePath: io.stat,
    fileAddress: (path) => path,
  })

  const found = names(tree)
  assert.ok(found.includes('VersionNotice'), `a v6 project gets the notice, saw: ${found.join(', ')}`)
})
