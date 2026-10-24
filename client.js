/**
 * BMAD Sprint Board -- the Client half of the bundle. GENERATED -- do not edit.
 *
 * Built from src/ by `node build.mjs`. Edit src/core.js, src/shell-*.js.
 * src/boundary.test.js asserts the core names no DSH symbol; src/core.test.js
 * exercises it directly.
 *
 * Contributes one page-type tab to the Session's right Sidebar and one guide
 * entry that opens it. The board is strictly read-only: it reads workspace
 * files through the Host `workspaceFiles` Remote face and never writes.
 *
 * @module dsh-plugin-bmad-sprint-board/client
 */


/**
 * BMAD Sprint Board -- the Client half of the bundle.
 *
 * Contributes one page-type tab to the Session's right Sidebar (the column that
 * already holds Chat, Guide, Files and Terminal) and one guide entry that opens
 * it. The board is strictly read-only: it reads the project through the Host
 * `workspaceFiles` Remote face and never writes to it.
 *
 * @module dsh-plugin-bmad-sprint-board/client
 */

window.__ModuleLoader__.load({
  id: 'dsh-plugin-bmad-sprint-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'bmadSprintBoard';
    /** This implementation's identity: the tab type id and the body's cell key. */
    const PLUGIN_ID = 'dsh-plugin-bmad-sprint-board';
    /** Page kind the guide entry opens. */
    const TAB_KIND = 'bmad-sprint-board';
    /** Command id of the keybinding that opens the board. */
    const BOARD_COMMAND = 'bmad.sprint-board';
    // --- Host-specific: theme palette and file addressing ---
    // Carved out of the core so it never names a DSH token or URI scheme.
    // Carved out of the core so it never names a DSH token or URI scheme.
    /**
    * Story status -> the theme token that carries its marker colour, read in
    * workflow order: grey while it waits, blue while it is being worked, orange
    * while it is being reviewed, green once it is done. The epic markers reuse
    * this same mapping for the epic's own status.
    *
    * The blue is `state-business-primary`, not `brand-primary`: the latter is
    * the primary *ink* (near-black in light, near-white in dark) that a solid
    * primary button fills with, so it reads as no colour at all on a 7px mark.
    * `state-business-primary` is the theme's real blue in both themes, and it
    * keeps the ramp inside one family of `state-*` aliases.
    */
    const IDLE_TOKEN = '--dsw-alias-state-idle-primary';
    /** The token a lane uses when its contents want attention rather than praise. */
    const WARN_TOKEN = '--dsw-alias-state-warn-primary';
    const CHEVRON_OPEN = '\u25BE';
    const FILE_ADDRESS_PREFIX = 'dsh-resource://file/';
    /**
    * Component-encode one path segment, keeping `:` literal for drive letters.
    * @param segment - one `/`-separated path segment.
    * @returns the encoded segment.
    */
    function encodeSegment(segment) {
    return encodeURIComponent(segment).replace(/%3A/gi, ':');
    }
    /**
    * Build the `dsh-resource://file/session/<id>/<path>` address of a workspace file.
    * @param sessionId - the Session whose Host workspace resolves the path.
    * @param path - absolute or workspace-relative path.
    * @returns the resource address the document preview claims.
    */
    function sessionFileAddress(sessionId, path) {
    const normalized = String(path)
    .replace(/\\/g, '/')
    .replace(/^(?:\.\/)+/, '');
    const encoded = normalized.split('/').map(encodeSegment).join('/');
    return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encoded}`;
    }
    const CHEVRON_CLOSED = '\u25B8';

    /**
     * A small TOML reader, sized for what BMAD actually writes.
     *
     * Not a TOML implementation. It reads the shape BMAD's own files take:
     * `[table]` headers, `[[array-of-table]]` headers, and scalar `key = value`
     * pairs holding strings, numbers or booleans. That is what `_bmad/config.toml`,
     * `_bmad/custom/config.toml`, `config.user.toml` and every `tickets.toml`
     * contain, and pulling in a parser library would be a dependency this bundle
     * does not have.
     *
     * The failure mode is chosen deliberately: anything it cannot understand is
     * skipped, so an unreadable file becomes a missing value and never a wrong one.
     *
     * @module dsh-plugin-bmad-sprint-board/toml
     */

    /** A basic string (`"..."`) with the escapes TOML defines for the common cases. */
    const BASIC = /^"((?:[^"\\]|\\.)*)"/;
    /** A literal string (`'...'`), where backslashes are ordinary characters. */
    const LITERAL = /^'([^']*)'/;
    /** What left of a value once the key and `=` are consumed. */
    const ASSIGNMENT = /^([A-Za-z0-9_"'.-]+)\s*=\s*(.*)$/;

    /**
     * Strip a trailing comment without touching a `#` inside a quoted string.
     *
     * A line is scanned once so that `title = "a # b"` keeps its hash and
     * `id = 1 # note` loses its note.
     *
     * @param {string} line - one raw line.
     * @returns {string} the line with any trailing comment removed.
     */
    function stripComment(line) {
      let quote = ''
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (quote !== '') {
          if (ch === '\\' && quote === '"') {
            i += 1
          } else if (ch === quote) {
            quote = ''
          }
        } else if (ch === '"' || ch === "'") {
          quote = ch
        } else if (ch === '#') {
          return line.slice(0, i)
        }
      }
      return line
    }

    /**
     * Decode a scalar value.
     *
     * Only the types that appear in BMAD files are recognised: strings, booleans,
     * integers and floats. An array or inline table returns `undefined`, which the
     * caller records as "present but unreadable" rather than guessing.
     *
     * @param {string} raw - the text after `=`.
     * @returns {string|number|boolean|undefined} the value, or undefined if unrecognised.
     */
    function decode(raw) {
      const text = raw.trim()
      if (text === 'true') return true
      if (text === 'false') return false

      const basic = BASIC.exec(text)
      if (basic !== null) {
        return basic[1].replace(/\\(["\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      }
      const literal = LITERAL.exec(text)
      if (literal !== null) return literal[1]

      if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10)
      if (/^[+-]?\d*\.\d+$/.test(text)) return Number.parseFloat(text)
      return undefined
    }

    /**
     * Read a dotted table path into an object, creating tables as needed.
     *
     * @param {object} root - the document being built.
     * @param {string} path - a dotted path such as `core` or `modules.tea`.
     * @returns {object} the table at that path.
     */
    function tableAt(root, path) {
      let node = root
      for (const part of path.split('.')) {
        const key = part.trim().replace(/^["']|["']$/g, '')
        if (typeof node[key] !== 'object' || node[key] === null || Array.isArray(node[key])) {
          node[key] = {}
        }
        node = node[key]
      }
      return node
    }

    /**
     * Parse a TOML document.
     *
     * @param {string} text - the file contents.
     * @returns {object} the parsed document; unreadable lines are omitted.
     */
    function parseToml(text) {
      const root = {}
      let current = root

      for (const raw of String(text).split('\n')) {
        const line = stripComment(raw).trim()
        if (line === '') continue

        const arrayHeader = /^\[\[\s*([A-Za-z0-9_."'\s-]+?)\s*\]\]$/.exec(line)
        if (arrayHeader !== null) {
          const path = arrayHeader[1]
          const parts = path.split('.')
          const name = parts.pop().trim().replace(/^["']|["']$/g, '')
          const parent = parts.length === 0 ? root : tableAt(root, parts.join('.'))
          if (!Array.isArray(parent[name])) parent[name] = []
          const entry = {}
          parent[name].push(entry)
          current = entry
          continue
        }

        const header = /^\[\s*([A-Za-z0-9_."'\s-]+?)\s*\]$/.exec(line)
        if (header !== null) {
          current = tableAt(root, header[1])
          continue
        }

        const assignment = ASSIGNMENT.exec(line)
        if (assignment === null) continue
        const key = assignment[1].replace(/^["']|["']$/g, '')
        const value = decode(assignment[2])
        if (value === undefined) continue
        current[key] = value
      }

      return root
    }

    /**
     * Merge configuration layers the way BMAD does: tables deep-merge, later wins.
     *
     * BMAD's own merge also keys array-of-tables by identity and appends the rest.
     * That branch is deliberately not reproduced here, because the only values the
     * board reads are `core.output_folder` and `core.active_initiative`, both
     * scalars -- a layer that sets them replaces them, which is what this does.
     *
     * @param {object[]} layers - documents from {@link parseToml}, lowest priority first.
     * @returns {object} the merged document.
     */
    function mergeLayers(layers) {
      const merged = {}
      const merge = (base, override) => {
        const out = { ...base }
        for (const [key, value] of Object.entries(override)) {
          const existing = out[key]
          const bothTables =
            typeof existing === 'object' && existing !== null && !Array.isArray(existing)
            && typeof value === 'object' && value !== null && !Array.isArray(value)
          out[key] = bothTables ? merge(existing, value) : value
        }
        return out
      }
      for (const layer of layers) {
        if (typeof layer !== 'object' || layer === null) continue
        Object.assign(merged, merge(merged, layer))
      }
      return merged
    }

    /**
     * Read a dotted key out of a merged document.
     *
     * @param {object} doc - the merged document.
     * @param {string} key - a dotted path such as `core.output_folder`.
     * @returns {*} the value, or undefined when any segment is missing.
     */
    function pick(doc, key) {
      let node = doc
      for (const part of key.split('.')) {
        if (typeof node !== 'object' || node === null || Array.isArray(node)) return undefined
        node = node[part]
      }
      return node
    }

    /**
     * BMAD v7 ticket frontmatter.
     *
     * Every v7 ticket -- initiative, epic and story plan -- opens with a `---`
     * fenced block of `key: value` lines. The schema is small but not exactly YAML:
     * values are single-quoted or double-quoted strings, bare scalars, booleans, and
     * indented `- item` lists (the `context:` a story plan carries). That subset is
     * what this reads; a full YAML parser would be a dependency the bundle does not
     * have.
     *
     * Unreadable lines are skipped, so a key the reader cannot parse is missing
     * rather than wrong.
     *
     * @module dsh-plugin-bmad-sprint-board/frontmatter
     */

    /** A closing fence, which is the same three dashes as the opening one. */
    const FENCE = /^---[ \t]*$/
    /** `key: value`, with the value possibly empty. */
    const SCALAR = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/
    /** An indented `- item` belonging to the key above it. */
    const LIST_ITEM = /^[ \t]+-[ \t]+(.*)$/

    /**
     * Read a bare scalar: a boolean, a number, or the text itself.
     *
     * @param {string} raw - the text after the colon.
     * @returns {string} the unquoted value.
     */
    function scalar(raw) {
      const text = raw.trim()
      if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
        return text.slice(1, -1).replace(/''/g, "'")
      }
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1).replace(/\\"/g, '"')
      }
      return text
    }

    /**
     * Split a document into its frontmatter and the rest.
     *
     * A file without a leading fence yields empty frontmatter and the whole text as
     * the body -- which is what an `archive-v6` file should produce.
     *
     * @param {string} text - the file contents.
     * @returns {{data: Map<string, string|string[]>, body: string}} the parsed keys and the remaining text.
     */
    function bare(text) {
      if (text === 'true') return true
      if (text === 'false') return false
      if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10)
      if (/^[+-]?\d*\.\d+$/.test(text)) return Number.parseFloat(text)
      return text
    }

    function readFrontmatter(text) {
      const lines = String(text).split('\n')
      const data = new Map()

      if (lines.length === 0 || !FENCE.test(lines[0].replace(/^\uFEFF/, ''))) {
        return { data, body: String(text) }
      }

      let end = lines.length
      for (let i = 1; i < lines.length; i += 1) {
        if (FENCE.test(lines[i])) {
          end = i
          break
        }
      }

      let openList = null
      for (let i = 1; i < end; i += 1) {
        const line = lines[i]
        if (line.trim() === '' || line.trim().startsWith('#')) continue

        const item = LIST_ITEM.exec(line)
        if (item !== null && openList !== null) {
          openList.push(scalar(item[1]))
          continue
        }

        const entry = SCALAR.exec(line)
        if (entry === null) continue
        const [, key, value] = entry

        if (value.trim() === '') {
          // An empty value may head either a list or a nested table. A list is what
          // BMAD writes here; a nested table is not used by any v7 ticket.
          openList = []
          data.set(key, openList)
          continue
        }
        openList = null
        const text = value.trim()
        const quoted = text.startsWith("'") || text.startsWith('"')
        data.set(key, quoted ? scalar(text) : bare(text))
      }

      // A key that opened a list and never received an item holds no information.
      for (const [key, value] of data) {
        if (Array.isArray(value) && value.length === 0) data.delete(key)
      }

      return { data, body: lines.slice(end + 1).join('\n') }
    }

    /**
     * Read a string key, falling back to `null`.
     *
     * @param {Map<string, *>} data - from {@link readFrontmatter}.
     * @param {string} key - the key to read.
     * @returns {string|null} the value, or null when absent or not a string.
     */
    function stringOf(data, key) {
      const value = data.get(key)
      return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
    }

    /**
     * Read a list key, falling back to an empty list.
     *
     * @param {Map<string, *>} data - from {@link readFrontmatter}.
     * @param {string} key - the key to read.
     * @returns {string[]} the items, or an empty list.
     */
    function listOf(data, key) {
      const value = data.get(key)
      return Array.isArray(value) ? value : []
    }

    /**
     * BMAD v7 configuration -- where output lives, and which initiative is in use.
     *
     * v7 replaced the per-module artefact declarations with two central keys:
     * `core.output_folder` and `core.active_initiative`. BMAD resolves them by
     * merging three TOML layers lowest priority first --
     *
     *   _bmad/config.toml
     *   _bmad/custom/config.toml        team overrides, committed
     *   _bmad/custom/config.user.toml   personal overrides, usually not committed
     *
     * -- which is exactly what `_bmad/scripts/resolve_config.py` does. This mirrors
     * that merge so the board agrees with the tooling rather than guessing at a
     * layout.
     *
     * @module dsh-plugin-bmad-sprint-board/config
     */



    /** The token BMAD writes where the project root belongs. */
    const PROJECT_ROOT = /\{project-root\}\/?/g

    /** The three layers, in merge order. */
    const CONFIG_LAYERS = [
      '_bmad/config.toml',
      '_bmad/custom/config.toml',
      '_bmad/custom/config.user.toml',
    ]

    /**
     * Reduce a config value to a workspace-relative path.
     *
     * The shell reads through the workspace API, which resolves relative paths
     * against the Session's selected workspace -- so `{project-root}` maps to the
     * empty string and the remainder is relative.
     *
     * @param {string} value - the raw config value.
     * @returns {string} the workspace-relative path.
     */
    function resolveProjectPath(value) {
      return String(value).replace(PROJECT_ROOT, '').replace(/^\.?\//, '').replace(/\/+$/, '')
    }

    /**
     * Merge the config layers and read the two keys the board needs.
     *
     * @param {Array<string|null>} texts - the contents of {@link CONFIG_LAYERS}, in order; null when a file is absent.
     * @returns {{outputFolder: string|null, activeInitiative: string|null, layers: number}} the resolved settings.
     */
    function resolveConfig(texts) {
      const layers = []
      let seen = 0
      for (const text of texts) {
        if (typeof text !== 'string') continue
        layers.push(parseToml(text))
        seen += 1
      }
      const merged = mergeLayers(layers)

      const folder = pick(merged, 'core.output_folder')
      const active = pick(merged, 'core.active_initiative')

      return {
        outputFolder: typeof folder === 'string' && folder !== '' ? resolveProjectPath(folder) : null,
        activeInitiative: typeof active === 'string' && active !== '' ? active.replace(/\/+$/, '') : null,
        layers: seen,
      }
    }

    /**
     * Recognise a BMAD installation and which major version it is.
     *
     * The two versions keep different central state: v7 declares `core.output_folder`
     * and work lives in `initiative-*` folders, while v6 declared per-module artefact
     * paths and tracked work in `sprint-status.yaml`. The board supports v7 only, so
     * telling a v6 project what it is beats rendering a v7 board over v6 files and
     * showing an empty one.
     *
     * @param {{config: {outputFolder: string|null}, hasSprintStatus: boolean, initiatives: number}} probe - what was found on disk.
     * @returns {'v7'|'v6'|'none'} the detected version.
     */
    function detectedVersion(probe) {
      if (probe.config.outputFolder !== null && probe.initiatives > 0) return 'v7'
      if (probe.hasSprintStatus) return 'v6'
      if (probe.config.outputFolder !== null) return 'v7'
      return 'none'
    }

    /**
     * The BMAD v7 ticket store, read from files.
     *
     * A v7 initiative keeps its work under `tickets/`:
     *
     *   tickets/tickets.toml                      [[epic]] id, slug, title
     *   tickets/epic-<slug>/epic-<slug>.md        type: epic, title, parent, status
     *   tickets/epic-<slug>/tickets/tickets.toml  [[entry]] id, type, title, v6_key
     *   tickets/epic-<slug>/tickets/<type>-<slug>-plan.md
     *
     * The index and the file are separate records of the same ticket, and they can
     * disagree. `tickets.py` links a plan to its entry through the plan's own
     * `ticket` key; a plan without one is an orphan it reports under `problems`.
     * This module reproduces the index, and keeps the linking question visible
     * rather than resolving it with a guess.
     *
     * @module dsh-plugin-bmad-sprint-board/store
     */




    /** The prefix every plan file shares. */
    const PLAN_SUFFIX = '-plan.md'

    /**
     * The types the ticket store treats as a ticket in its own right.
     *
     * `tickets.py` decides what a file is by its frontmatter `type`, not by its
     * name: one of these types is a leaf that carries the ticket, anything else
     * that declares a `ticket` key is a plan over one, and anything else is ignored.
     * A file named `story-x-plan.md` whose type is `feature` is therefore neither,
     * which is exactly how a migrated project quietly loses its plans.
     */
    const LEAF_TYPES = new Set(['story', 'spike', 'bug'])

    /**
     * Reduce a title to the slug BMAD derives file names from.
     *
     * @param {string} title - a ticket title.
     * @returns {string} the kebab-case slug.
     */
    function slugify(title) {
      return String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    /**
     * Read the epic index of an initiative.
     *
     * @param {string|null} text - the contents of `tickets/tickets.toml`.
     * @returns {Array<{id: number|string|null, slug: string, title: string}>} the epics, in file order.
     */
    function readEpicIndex(text) {
      if (typeof text !== 'string') return []
      const doc = parseToml(text)
      const rows = Array.isArray(doc.epic) ? doc.epic : []
      return rows
        .filter((row) => typeof row.slug === 'string' && row.slug !== '')
        .map((row) => ({ id: row.id ?? null, slug: row.slug, title: row.title ?? '' }))
    }

    /**
     * Read the story index inside one epic folder.
     *
     * @param {string|null} text - the contents of `tickets/epic-<slug>/tickets/tickets.toml`.
     * @returns {Array<{id: string, type: string, title: string, v6Key: string|null}>} the entries, in file order.
     */
    function readStoryIndex(text) {
      if (typeof text !== 'string') return []
      const doc = parseToml(text)
      const rows = Array.isArray(doc.entry) ? doc.entry : []
      return rows.map((row) => ({
        id: String(row.id ?? ''),
        type: typeof row.type === 'string' ? row.type : 'story',
        title: typeof row.title === 'string' ? row.title : '',
        v6Key: typeof row.v6_key === 'string' ? row.v6_key : null,
      }))
    }

    /**
     * Read a ticket file -- the leaf that carries the ticket itself.
     *
     * @param {string} text - the file's contents.
     * @param {string} path - its workspace-relative path.
     * @returns {{path: string, id: string|null, type: string|null, title: string|null, status: string}} the leaf.
     */
    function readLeaf(text, path) {
      const { data } = readFrontmatter(text)
      return {
        path,
        id: stringOf(data, 'id'),
        type: stringOf(data, 'type'),
        title: stringOf(data, 'title'),
        // an absent status is the empty string, which the store maps to backlog
        status: stringOf(data, 'status') ?? '',
      }
    }

    /**
     * Decide what a file in a ticket folder is.
     *
     * @param {string} text - the file's contents.
     * @returns {'leaf'|'plan'|'other'} the role the ticket store would give it.
     */
    function classify(text) {
      const { data } = readFrontmatter(text)
      const type = stringOf(data, 'type')
      if (type !== null && LEAF_TYPES.has(type)) return 'leaf'
      if (stringOf(data, 'ticket') !== null) return 'plan'
      return 'other'
    }

    /**
     * Read a plan file's frontmatter into the fields the board uses.
     *
     * @param {string} text - the plan file's contents.
     * @param {string} path - its workspace-relative path.
     * @returns {{path: string, title: string|null, type: string|null, status: string|null, ticket: string|null, baseline: string|null, context: string[]}} the plan.
     */
    function readPlan(text, path) {
      const { data } = readFrontmatter(text)
      return {
        path,
        title: stringOf(data, 'title'),
        type: stringOf(data, 'type'),
        ticket: stringOf(data, 'ticket'),
        status: stringOf(data, 'status') ?? '',
        blockedReason: stringOf(data, 'blocked_reason'),
        baseline: stringOf(data, 'baseline_commit'),
        context: listOf(data, 'context'),
      }
    }

    /**
     * Decide which plan file belongs to which index entry.
     *
     * Three outcomes, and keeping them apart is the point:
     *
     * - a plan whose `ticket` names an entry is **linked**, by BMAD's own rule;
     * - a plan with no `ticket` whose file name is the one BMAD would derive from an
     *   entry's title is **unlinked** -- the file is almost certainly that entry's,
     *   but the store does not say so, and the board reports that instead of
     *   asserting it;
     * - everything else is an **orphan**: a plan the index does not claim, or an
     *   entry with no plan at all.
     *
     * A name match is only accepted when exactly one entry could claim it, so an
     * ambiguous match is never resolved by picking the first.
     *
     * @param {Array<object>} entries - from {@link readStoryIndex}.
     * @param {Array<object>} plans - from {@link readPlan}, all plans in the epic.
     * @returns {{links: Map<string, object>, unlinked: Array<object>, orphans: Array<object>, missing: Array<object>}} the linking result.
     */
    function linkPlans(entries, plans) {
      const links = new Map()
      const unlinked = []
      const claimed = new Set()

      for (const plan of plans) {
        if (plan.ticket === null) continue
        const match = entries.find((entry) => entry.id === plan.ticket)
        if (match !== undefined && !links.has(match.id)) {
          links.set(match.id, plan)
          claimed.add(plan.path)
        }
      }

      for (const entry of entries) {
        if (links.has(entry.id)) continue
        const wanted = `${entry.type}-${slugify(entry.title)}`
        const stemOf = (plan) => {
          const name = plan.path.slice(plan.path.lastIndexOf('/') + 1)
          return name.endsWith(PLAN_SUFFIX) ? name.slice(0, -PLAN_SUFFIX.length) : null
        }
        const matches = (plan) => {
          if (plan.ticket !== null || claimed.has(plan.path)) return false
          const stem = stemOf(plan)
          if (stem === null) return false
          // BMAD derives the file name from the title, and a title that was still
          // moving when the file was created leaves a stem that is a truncated form
          // of the current one. Truncation happens before the suffix, so both sides
          // are compared without it. Either direction counts; neither is accepted
          // unless it is also unambiguous.
          return wanted.startsWith(stem) || stem.startsWith(wanted)
        }
        const candidates = plans.filter(matches)
        const rivals = entries.filter((other) => {
          if (links.has(other.id) || other.id === entry.id) return false
          const theirs = `${other.type}-${slugify(other.title)}`
          return plans.some((plan) => {
            if (!matches(plan)) return false
            const stem = stemOf(plan)
            return theirs.startsWith(stem) || stem.startsWith(theirs)
          })
        })
        if (candidates.length === 1 && rivals.length === 0) {
          links.set(entry.id, candidates[0])
          claimed.add(candidates[0].path)
          unlinked.push({ entry, plan: candidates[0] })
        }
      }

      const orphans = plans.filter((plan) => !claimed.has(plan.path))
      const missing = entries.filter((entry) => !links.has(entry.id))
      return { links, unlinked, orphans, missing }
    }

    /**
     * The board model: one BMAD v7 project, read into initiatives, epics and tickets.
     *
     * The model is built from text alone -- it never touches the file system, so it
     * is exercised directly by the tests and the shell only supplies the strings.
     *
     * A v7 project can have several initiatives and only one is "active". The board
     * builds every initiative so the reader can switch between them without a
     * reload, and marks the active one rather than hiding the rest.
     *
     * @module dsh-plugin-bmad-sprint-board/model
     */




    /**
     * The store's own status-to-state table.
     *
     * Copied from `tickets.py` rather than invented, because the board's lanes have
     * to be the lanes `tickets.py status` reports or the two disagree about the same
     * repository. An empty status is **backlog**: a ticket exists in the index and
     * nothing has happened to it, which is exactly how a planned story looks before
     * `bmad-build` writes its plan. Reading that as "unknown" was this board getting
     * it wrong -- a plan is an artefact of building, not a precondition of existing.
     */
    const STATE_OF = {
      '': 'backlog',
      draft: 'backlog',
      'ready-for-dev': 'backlog',
      'in-progress': 'in-progress',
      blocked: 'in-progress',
      'in-review': 'review',
      built: 'review',
      done: 'done',
      dropped: 'dropped',
    }

    /** The lane order, earliest first. */
    const STATE_ORDER = ['backlog', 'in-progress', 'review', 'done', 'dropped']

    /** States that mean the work is finished. */
    const SETTLED = new Set(['done', 'dropped'])

    /** Every status word the store understands. */
    const KNOWN_STATUS = new Set(Object.keys(STATE_OF))

    /** The lanes, plus the one for a word the store does not understand. */
    const STATUS_ORDER = [...STATE_ORDER, 'unknown']

    /**
     * Map a status word to the lane it belongs in.
     *
     * A word the store does not know becomes its own lane and a finding, rather than
     * being guessed at: `tickets.py` treats an unrecognised status as blocked, and
     * silently inheriting that would hide a broken ticket behind a normal one.
     *
     * @param {string} status - the word from the ticket.
     * @returns {string} the lane.
     */
    function stateOf(status) {
      const word = String(status ?? '')
      return Object.hasOwn(STATE_OF, word) ? STATE_OF[word] : 'unknown'
    }

    /**
     * Turn a BMAD slug into something a reader can scan.
     *
     * Folder and file names are kebab-case (`vip-reservations`), and showing that
     * raw reads like an identifier because it is one. A ticket that declares its own
     * title is shown by that title; this is the fallback for the ones that do not,
     * and the secondary label under it.
     *
     * @param {string} slug - a folder or file slug, with or without its prefix.
     * @returns {string} the words, each capitalised.
     */
    function humanise(slug) {
      return String(slug)
        .replace(/^(initiative|epic)-/, '')
        .split(/[-_]+/)
        .filter(Boolean)
        .map((word) => (/\d/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(' ')
    }

    /**
     * Read an initiative ticket's own file.
     *
     * @param {string|null} text - the contents of `initiative-<slug>.md`, or null when absent.
     * @returns {{title: string|null, status: string|null, type: string|null}} what the file declares.
     */
    function readInitiativeTicket(text) {
      if (typeof text !== 'string') return { title: null, status: null, type: null }
      const { data } = readFrontmatter(text)
      return {
        title: stringOf(data, 'title'),
        status: stringOf(data, 'status'),
        type: stringOf(data, 'type'),
      }
    }

    /**
     * Read an epic ticket's own file.
     *
     * @param {string|null} text - the contents of `epic-<slug>.md`, or null when absent.
     * @returns {{title: string|null, status: string|null, parent: string|null}} what the file declares.
     */
    function readEpicTicket(text) {
      if (typeof text !== 'string') return { title: null, status: null, parent: null }
      const { data } = readFrontmatter(text)
      return {
        title: stringOf(data, 'title'),
        status: stringOf(data, 'status'),
        parent: stringOf(data, 'parent'),
      }
    }

    /**
     * Decide a ticket's displayed state.
     *
     * A plan overrides its leaf, and a leaf overrides the index row. With neither,
     * the ticket is backlog -- not unknown. The only way to be unknown is to carry a
     * status word the store does not define.
     *
     * @param {object|null} plan - the joined plan, or null.
     * @param {object|null} leaf - the leaf file, or null.
     * @returns {string} the lane.
     */
    function ticketStatus(plan, leaf) {
      const word = plan?.status ?? leaf?.status ?? ''
      return stateOf(word)
    }

    /**
     * Assemble one initiative from the files read for it.
     *
     * @param {object} input - the initiative's name and file contents.
     * @param {string} input.slug - the folder name, `initiative-<slug>`.
     * @param {string} input.dir - its workspace-relative folder path.
     * @param {string|null} input.ticket - contents of `initiative-<slug>.md`.
     * @param {{epics: Array<object>}} input.index - the parsed epic index plus per-epic content.
     * @param {number} input.unreadable - how many files could not be read.
     * @returns {object} the initiative model.
     */
    function buildInitiative({ slug, dir, ticket, epics, unreadable = 0 }) {
      const own = readInitiativeTicket(ticket)
      const built = epics.map((epic) => {
        const header = readEpicTicket(epic.ticket)
        const entries = readStoryIndex(epic.storyIndex)

        // The store decides what a file is by its frontmatter type, not its name:
        // a leaf carries a ticket, a file with a `ticket` key is a plan over one,
        // and anything else is ignored. Splitting on the file name instead is what
        // made a folder of `*-plan.md` files invisible.
        const leaves = []
        const plans = []
        const ignored = []
        for (const file of epic.files ?? []) {
          const role = classify(file.text)
          if (role === 'leaf') leaves.push(readLeaf(file.text, file.path))
          else if (role === 'plan') plans.push(readPlan(file.text, file.path))
          else ignored.push(file.path)
        }

        const usedLeaves = new Set()
        const usedPlans = new Set()

        const build = (entry) => {
          const leaf = leaves.find((l) => l.id !== null && l.id === entry.id
            || l.path === `${entry.type}-${slugify(entry.title)}.md`) ?? null
          if (leaf !== null) usedLeaves.add(leaf.path)
          const plan = plans.find((pl) => pl.ticket === entry.id) ?? null
          if (plan !== null) usedPlans.add(plan.path)
          const word = plan?.status ?? leaf?.status ?? ''
          return {
            id: entry.id,
            ref: `${epic.id ?? '?'}.${entry.id}`,
            type: entry.type,
            title: leaf?.title ?? entry.title,
            v6Key: entry.v6Key,
            word,
            status: ticketStatus(plan, leaf),
            plan,
            leaf,
            linkedBy: plan === null ? 'none' : 'ticket',
          }
        }

        const tickets = entries.map(build)

        // A leaf the index does not list is still a ticket the store knows about.
        for (const leaf of leaves) {
          if (usedLeaves.has(leaf.path) || leaf.id === null) continue
          if (entries.some((entry) => entry.id === leaf.id)) continue
          const plan = plans.find((pl) => pl.ticket === leaf.id) ?? null
          if (plan !== null) usedPlans.add(plan.path)
          tickets.push({
            id: leaf.id,
            ref: `${epic.id ?? '?'}.${leaf.id}`,
            type: leaf.type ?? 'story',
            title: leaf.title ?? leaf.path,
            v6Key: null,
            word: plan?.status ?? leaf.status,
            status: ticketStatus(plan, leaf),
            plan,
            leaf,
            linkedBy: plan === null ? 'none' : 'ticket',
            unlisted: true,
          })
        }

        const orphans = plans.filter((pl) => !usedPlans.has(pl.path))

        return {
          id: epic.id,
          slug: epic.slug,
          folder: epic.folder,
          title: header.title ?? epic.title ?? epic.slug,
          // A container's status is absent until its first ticket starts, which is a
          // statement about the work rather than a gap in the file: it has not
          // started. Rendering that as "unknown" says the opposite.
          status: stateOf(header.status ?? ''),
          rawStatus: header.status,
          tickets,
          orphans,
          ignored,
          leaves: leaves.length,
        }
      })

      const byStatus = new Map()
      let total = 0
      let unknown = 0
      for (const epic of built) {
        for (const ticket of epic.tickets) {
          total += 1
          if (ticket.status === 'unknown') unknown += 1
          byStatus.set(ticket.status, (byStatus.get(ticket.status) ?? 0) + 1)
        }
      }

      return {
        slug,
        dir,
        title: own.title ?? humanise(slug),
        status: stateOf(own.status ?? ''),
        rawStatus: own.status,
        epics: built,
        counts: {
          epics: built.length,
          tickets: total,
          unknown,
          byStatus,
          settled: [...byStatus].filter(([status]) => SETTLED.has(status)).reduce((n, [, c]) => n + c, 0),
          orphanPlans: built.reduce((n, epic) => n + epic.orphans.length, 0),
          ignoredFiles: built.reduce((n, epic) => n + epic.ignored.length, 0),
        },
        unreadable,
      }
    }

    /**
     * Group an initiative's tickets into status lanes, in the published order.
     *
     * Tickets whose state nothing declares form their own lane rather than being
     * folded into an existing one: "not started" and "cannot tell" are different
     * claims, and a board that merges them cannot be trusted about either.
     *
     * @param {object} initiative - from {@link buildInitiative}.
     * @returns {Array<{status: string|null, tickets: Array<object>}>} the lanes, settled last.
     */
    function statusLanes(initiative) {
      const groups = new Map()
      for (const epic of initiative.epics) {
        for (const ticket of epic.tickets) {
          const key = ticket.status
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key).push({ ...ticket, epic: epic.slug, epicTitle: epic.title })
        }
      }

      const rank = (status) => {
        const index = STATUS_ORDER.indexOf(status)
        return index === -1 ? STATUS_ORDER.length - 1 : index
      }

      return [...groups]
        .map(([status, tickets]) => ({ status, tickets }))
        .sort((a, b) => rank(a.status) - rank(b.status))
    }

    /**
     * v7 checks: what the ticket store and the tickets on disk disagree about.
     *
     * The v6 detectors compared a sprint file against deferred work and review
     * patches. v7 has no sprint file; the equivalents are the two records every
     * ticket keeps -- the entry in `tickets.toml` and the plan file beside it -- and
     * the statuses its containers claim.
     *
     * Two rules carry over from v6 unchanged:
     *
     *   1. **Nothing here writes.** The board is a reader.
     *   2. **Unverifiable is not clean.** A check that could not be evaluated
     *      returns an entry rather than nothing, because a board showing nothing
     *      must never be confusable with a board that cannot see.
     *
     * @module dsh-plugin-bmad-sprint-board/detect
     */



    /** How much a gap matters, highest first. */
    const SEVERITY = ['high', 'medium', 'low']

    /**
     * Build one gap in the shape every view renders.
     *
     * @param {object} spec - the gap's fields.
     * @returns {object} the gap.
     */
    function gap({ id, title, severity, subject, subjectKind, evidence, action }) {
      return { id, title, severity, subject, subjectKind, evidence, action }
    }

    /**
     * A prompt that hands the finding back to the agent that owns the store.
     *
     * @param {string} text - the instruction.
     * @returns {{kind: string, label: string, payload: string}} the action.
     */
    function ask(text) {
      return { kind: 'prompt', label: 'Ask agent', payload: text }
    }

    /**
     * Check one initiative against its tickets.
     *
     * @param {object} initiative - from `buildInitiative`.
     * @returns {{gaps: Array<object>, unverifiable: Array<object>}} what disagrees.
     */
    function detectInitiative(initiative) {
      const gaps = []
      const unverifiable = []
      const where = initiative.slug

      // A ticket file the store cannot classify is invisible to `tickets.py`. The
      // store tells leaves from plans by frontmatter type, so a `*-plan.md` whose
      // type is not `story`/`spike`/`bug` and which names no ticket is neither --
      // its ticket then reports as backlog however finished the work is. Every
      // number the tooling prints is wrong while every file on disk looks correct.
      const ignored = initiative.epics.flatMap((epic) =>
        epic.ignored.map((path) => ({ epic, path })))
      if (ignored.length > 0) {
        const example = ignored[0]
        gaps.push(gap({
          id: 'L1',
          title: 'ticket files the store cannot read',
          severity: 'high',
          subject: where,
          subjectKind: 'initiative',
          evidence:
            `${ignored.length} file(s) in a ticket folder are neither a leaf ticket nor a plan, `
            + `so the store ignores them and reports their tickets as backlog.`,
          action: ask(
            `In ${where}, ${ignored.length} ticket file(s) are invisible to the store: `
            + `${example.path} and others. Each needs \`type: story\` (or spike/bug) to be a leaf, `
            + `or a \`ticket: <id>\` key to be a plan. Then re-run \`tickets.py status\`.`,
          ),
        }))
      }

      // A leaf the index does not list is a ticket the store knows and the plan does
      // not, which is the inverse of an orphan: work exists that nothing schedules.
      const unlisted = initiative.epics.flatMap((epic) =>
        epic.tickets.filter((ticket) => ticket.unlisted === true).map((ticket) => ({ epic, ticket })))
      if (unlisted.length > 0) {
        gaps.push(gap({
          id: 'L2',
          title: 'ticket files no index entry lists',
          severity: 'medium',
          subject: where,
          subjectKind: 'initiative',
          evidence: `${unlisted.length} leaf ticket(s) exist on disk with no entry in any ticket index.`,
          action: ask(
            `These tickets in ${where} have a file but no index entry: `
            + `${unlisted.map(({ ticket }) => ticket.ref).join(', ')}. Add the entry or remove the file.`,
          ),
        }))
      }

      // A plan file nothing claims is either a renamed ticket or leftover work.
      const orphans = initiative.epics.flatMap((epic) =>
        epic.orphans.map((plan) => ({ epic, plan })))
      if (orphans.length > 0) {
        gaps.push(gap({
          id: 'L3',
          title: 'plans no ticket claims',
          severity: 'medium',
          subject: where,
          subjectKind: 'initiative',
          evidence: `${orphans.length} plan file(s) correspond to no entry in any ticket index.`,
          action: ask(
            `These plan files in ${where} belong to no ticket index entry: `
            + `${orphans.map(({ plan }) => plan.path).join(', ')}. Add the ticket or delete the file.`,
          ),
        }))
      }

      // A status word the board does not know is shown, but never counted as
      // settled: guessing that an unfamiliar word means finished is how a board
      // starts lying.
      const odd = initiative.epics.flatMap((epic) =>
        epic.tickets
          .filter((ticket) => ticket.status === 'unknown')
          .map((ticket) => ({ epic, ticket })))
      if (odd.length > 0) {
        unverifiable.push({
          id: 'L4',
          title: 'unrecognised status words',
          subject: where,
          subjectKind: 'initiative',
          evidence: `${odd.length} ticket(s) carry a status this board does not recognise, so they are not counted either way.`,
          tickets: odd.map(({ ticket }) => `${ticket.ref} (${ticket.word})`),
          action: ask(`These statuses are unrecognised: ${odd.map(({ ticket }) => `${ticket.ref}=${ticket.word}`).join(', ')}. Confirm what they mean.`),
        })
      }

      // A container whose status is settled while its tickets are not is the classic
      // migration artefact: the folder was closed, the work inside it was not.
      for (const epic of initiative.epics) {
        if (epic.status === null || !SETTLED.has(epic.status)) continue
        const open = epic.tickets.filter((ticket) => !SETTLED.has(ticket.status))
        if (open.length === 0) continue
        gaps.push(gap({
          id: 'C1',
          title: 'epic settled with open tickets',
          severity: 'high',
          subject: epic.slug,
          subjectKind: 'epic',
          evidence: `the epic says ${epic.status}, but ${open.length} of its tickets are not settled.`,
          action: ask(
            `Epic ${epic.slug} is marked ${epic.status} while ${open.map((t) => t.ref).join(', ')} `
            + `are not settled. Reopen the epic or close those tickets.`,
          ),
        }))
      }

      if (initiative.status !== null && SETTLED.has(initiative.status)) {
        const open = initiative.epics.flatMap((epic) =>
          epic.tickets.filter((ticket) => !SETTLED.has(ticket.status)))
        if (open.length > 0) {
          gaps.push(gap({
            id: 'C2',
            title: 'initiative settled with open tickets',
            severity: 'high',
            subject: where,
            subjectKind: 'initiative',
            evidence: `the initiative says ${initiative.status}, but ${open.length} tickets inside it are not settled.`,
            action: ask(
              `Initiative ${where} is marked ${initiative.status} while ${open.length} tickets are open. `
              + `Reopen it or settle the tickets.`,
            ),
          }))
        }
      }

      return { gaps, unverifiable }
    }

    /**
     * Check an initiative that declares no epics.
     *
     * @param {object} initiative - from `buildInitiative`.
     * @returns {object|null} the gap, or null when the initiative has work.
     */
    function detectEmptyInitiative(initiative) {
      if (initiative.counts.epics > 0) return null
      return gap({
        id: 'E1',
        title: 'initiative declares no epics',
        severity: 'low',
        subject: initiative.slug,
        subjectKind: 'initiative',
        evidence: 'the initiative folder exists and its ticket store lists no epics.',
        action: ask(
          `Initiative ${initiative.slug} has no epics in its ticket store. Either it has not been sliced `
          + `yet, or it is finished and can be archived.`,
        ),
      })
    }

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





    /** How many reads the scan keeps in flight; the same figure the shell used. */
    const READ_CONCURRENCY = 8

    /** The folder-name prefix every v7 initiative carries. */
    const INITIATIVE_PREFIX = 'initiative-'

    /**
     * Run `mapper` over `items` with at most `limit` in flight, preserving order.
     *
     * @param {Array<*>} items - the work items.
     * @param {number} limit - how many may run at once.
     * @param {function(*, number): Promise<*>} mapper - the async work.
     * @returns {Promise<Array<*>>} the results, in input order.
     */
    async function mapLimit(items, limit, mapper) {
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
    function join(dir, name) {
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

      // Every markdown file in the folder: the store tells leaves from plans by
      // their frontmatter, and a file name is not a reliable signal for that. A
      // `*-plan.md` whose type is not a leaf type and which names no ticket is
      // neither, and reading only the plans would hide that instead of reporting it.
      const names = listing
        .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
        .map((entry) => entry.name)
        .sort()

      // A file the directory listing named and the reader could not open is a real
      // problem -- it exists and its state is hidden -- so this read is recorded.
      const files = await mapLimit(names, READ_CONCURRENCY, async (name) => {
        const path = join(join(folder, 'tickets'), name)
        const text = await tryRead(io, path, signal)
        if (text === null) {
          unreadable.push({ path, error: 'listed but unreadable' })
          return null
        }
        return { path, text }
      })

      return { ...row, folder, ticket, storyIndex, files: files.filter(Boolean) }
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
    async function scanProject(io, signal) {
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

    // --- Styles ------------------------------------------------------------

    const CSS = `
.bmad-sb-root{display:flex;flex-direction:column;height:100%;min-height:0;font-size:12px;line-height:1.45;color:var(--dsw-alias-label-primary)}
.bmad-sb-head{flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.bmad-sb-titlerow{display:flex;align-items:center;gap:8px}
.bmad-sb-title{font-size:13px;font-weight:600;white-space:nowrap}
.bmad-sb-project{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px}
.bmad-sb-iconbtn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:12px;line-height:1}
.bmad-sb-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.bmad-sb-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.bmad-sb-sub{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.bmad-sb-num{font-variant-numeric:tabular-nums}
/* The refresh cue: quiet, in the row that already reports the reading's age. */
.bmad-sb-refreshing{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font-weight:600}
.bmad-sb-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;overflow:hidden;align-self:flex-start}
.bmad-sb-seg>button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;padding:3px 10px;cursor:pointer}
.bmad-sb-seg>button[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.bmad-sb-seg>button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.bmad-sb-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:8px 10px 18px}
.bmad-sb-lane{margin-bottom:10px}
.bmad-sb-lanehead{display:flex;align-items:center;gap:7px;width:100%;padding:5px 6px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.bmad-sb-lanehead:hover{background:var(--dsw-alias-bg-layer-2)}
.bmad-sb-lanehead:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.bmad-sb-dot{flex:0 0 auto;width:7px;height:7px;border-radius:50%}
.bmad-sb-lanelabel{flex:1 1 auto;font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.bmad-sb-count{flex:0 0 auto;border-radius:999px;padding:0 7px;font-size:10px;line-height:15px;font-weight:700;font-variant-numeric:tabular-nums}
.bmad-sb-chev{flex:0 0 auto;width:9px;font-size:9px;color:var(--dsw-alias-label-secondary)}
.bmad-sb-cards{display:flex;flex-direction:column;gap:5px;padding:4px 0 0 2px}
.bmad-sb-card{display:flex;flex-direction:column;gap:3px;width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left}
button.bmad-sb-card{cursor:pointer}
button.bmad-sb-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
button.bmad-sb-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.bmad-sb-cardtop{display:flex;align-items:center;gap:6px}
.bmad-sb-id{font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.bmad-sb-tag{display:inline-flex;align-items:center;flex:0 0 auto;border-radius:999px;padding:0 7px;font-size:9px;line-height:15px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.bmad-sb-tag--source{margin-left:auto;letter-spacing:.04em;text-transform:uppercase}
.bmad-sb-tag[data-tone="neutral"]{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}
.bmad-sb-tag[data-tone="success"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary)}
.bmad-sb-tag[data-tone="info"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-state-business-primary)}
/* A finding's tag, not a story's: solid where it matters, tinted where it does not. */
.bmad-sb-tag[data-tone="error"]{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground);letter-spacing:.04em}
.bmad-sb-tag[data-tone="warning"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 22%,transparent);color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 78%,var(--dsw-alias-label-primary))}
.bmad-sb-cardtitle{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-size:12px}
.bmad-sb-cardnote{font-size:10px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.bmad-sb-epicsec{margin-bottom:8px;padding:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.bmad-sb-epichead{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.bmad-sb-epichead .bmad-sb-lanehead{width:auto;padding:2px 4px}
.bmad-sb-epicname{font-size:12px;font-weight:600;text-transform:capitalize}
.bmad-sb-note{padding:14px 4px;color:var(--dsw-alias-label-secondary);font-size:12px}
.bmad-sb-error{padding:12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bmad-sb-empty{padding:12px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bmad-sb-emptytitle{font-weight:600}
.bmad-sb-btn{appearance:none;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;padding:4px 10px;cursor:pointer}
.bmad-sb-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.bmad-sb-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.bmad-sb-cardfoot .bmad-sb-btn{align-self:flex-start;border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}
.bmad-sb-cardfoot .bmad-sb-btn:hover{background:var(--dsw-alias-button-primary-hover)}
/* While the write is in flight the button stays put and reads as working. */
.bmad-sb-btn[data-state="busy"]{opacity:.72;cursor:progress}
.bmad-sb-copywrap{display:inline-flex;flex-direction:row-reverse;align-items:center;gap:6px;min-width:0}
.bmad-sb-spinner{flex:0 0 auto;width:9px;height:9px;margin-left:6px;border-radius:50%;
border:1.5px solid color-mix(in srgb,currentColor 35%,transparent);border-top-color:currentColor;
animation:bmad-sb-spin 620ms linear infinite}
@keyframes bmad-sb-spin{to{transform:rotate(360deg)}}
/* The outcome, beside the control rather than in place of its label. */
.bmad-sb-tip{display:inline-flex;align-items:center;border-radius:999px;padding:0 8px;font-size:9px;
line-height:16px;font-weight:700;white-space:nowrap;animation:bmad-sb-tip-in 140ms ease-out}
.bmad-sb-tip[data-kind="copied"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary)}
.bmad-sb-tip[data-kind="failed"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent);color:var(--dsw-alias-state-error-primary)}
@keyframes bmad-sb-tip-in{from{opacity:0;transform:translateX(-3px)}to{opacity:1;transform:none}}
.bmad-sb-sectitle{display:flex;align-items:center;gap:6px;margin:14px 0 6px;font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}

.bmad-sb-metrics{display:flex;flex-direction:column;gap:5px;padding:0 12px 8px}
.bmad-sb-metric{display:flex;flex-direction:column;gap:3px;font-size:11px;line-height:1.2}
.bmad-sb-metricrow{display:flex;align-items:center;gap:7px}
.bmad-sb-metriclabel{flex:0 0 78px;color:var(--dsw-alias-label-secondary);text-transform:lowercase}
.bmad-sb-metrictrack{flex:1 1 auto;display:flex;min-width:0;height:8px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.bmad-sb-metricfill{display:block;height:100%}
.bmad-sb-metricfill[data-tone="success"]{background:var(--dsw-alias-state-success-primary)}
.bmad-sb-metricfill[data-tone="info"]{background:var(--dsw-alias-state-business-primary)}
/* The unknown cell is encoded three ways at once -- outline, unfilled body and a
   label -- because every neutral tone is already spoken for: grey means backlog
   on this board, and the track itself is already empty. A solid fill would
   collide with one of them under some theme; an outline plus a count cannot. */
.bmad-sb-metricunknown{display:block;height:100%;box-sizing:border-box;background:transparent;border:1px dashed var(--dsw-alias-label-secondary);border-radius:2px}
.bmad-sb-metricnum{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.bmad-sb-metricpct{flex:0 0 34px;text-align:right;font-variant-numeric:tabular-nums}
.bmad-sb-metricwarn{color:var(--dsw-alias-state-warn-primary)}
.bmad-sb-metricnote{flex:0 0 auto;color:var(--dsw-alias-label-secondary)}
/* The bar's own row, then anything the bar cannot draw. */
.bmad-sb-metricfoot{display:flex;align-items:center;gap:6px;padding-left:2px}
/* In the metric the button leads, so the bubble must not reverse there. */
.bmad-sb-metricfoot .bmad-sb-copywrap{flex-direction:row}
/* In the metric the button leads, so the bubble must not reverse there. */
.bmad-sb-metricfoot .bmad-sb-copywrap{flex-direction:row}
.bmad-sb-badge{display:inline-flex;align-items:center;border-radius:999px;padding:0 8px;font-size:9px;line-height:16px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
/* A warning tint was too quiet for a second-class requirement set: the badge
   reports a hole in the measurement, not a caveat on one. */
.bmad-sb-badge--error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.bmad-sb-badge--warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.bmad-sb-summary{display:flex;flex-wrap:wrap;gap:4px 10px;padding:0 12px 8px;font-size:10px;color:var(--dsw-alias-label-secondary)}
.bmad-sb-summary--done{color:var(--dsw-alias-state-success-primary);font-weight:600}
.bmad-sb-summary--unknown{color:var(--dsw-alias-state-warn-primary);font-weight:600}
.bmad-sb-req{display:grid;grid-template-columns:14px 46px 1fr;gap:2px 7px;align-items:baseline;padding:4px 2px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.bmad-sb-req:last-child{border-bottom:0}
.bmad-sb-reqmark{font-size:11px;line-height:1.2;text-align:center}
.bmad-sb-req[data-state="done"] .bmad-sb-reqmark{color:var(--dsw-alias-state-success-primary)}
.bmad-sb-req[data-state="partial"] .bmad-sb-reqmark{color:var(--dsw-alias-state-business-primary)}
.bmad-sb-req[data-state="todo"] .bmad-sb-reqmark{color:var(--dsw-alias-label-secondary)}
/* Nothing to read a state from: hollow, never a tick and never a cross. */
.bmad-sb-req[data-state="unknown"] .bmad-sb-reqmark{color:var(--dsw-alias-state-warn-primary)}
.bmad-sb-reqid{font-size:9px;font-weight:700;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.bmad-sb-reqname{font-size:11px;line-height:1.35;color:var(--dsw-alias-label-primary)}
.bmad-sb-reqnote{grid-column:3;font-size:9px;color:var(--dsw-alias-label-secondary);opacity:.8}
.bmad-sb-next{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;padding:0 12px 9px;font-size:11px}
.bmad-sb-nextlabel{color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em;font-size:10px}
.bmad-sb-nextskill{font-weight:600;color:var(--dsw-alias-state-business-primary)}
.bmad-sb-nextkey{color:var(--dsw-alias-label-primary)}
.bmad-sb-nextreason{color:var(--dsw-alias-label-secondary)}
.bmad-sb-next .bmad-sb-btn{align-self:flex-start;border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}
.bmad-sb-next .bmad-sb-btn:hover{background:var(--dsw-alias-button-primary-hover)}
.bmad-sb-next[data-kind="done"]{color:var(--dsw-alias-state-success-primary)}
/* The action sits away from the reading, and against the card's right edge. */
.bmad-sb-cardfoot{display:flex;justify-content:flex-end;margin-top:5px}
/* Unverifiable must not read as a finding, nor as clean: same card, dashed edge. */
/* Unverifiable must not read as a finding, nor as clean: same lane, dashed cards. */
.bmad-sb-lane--unverifiable .bmad-sb-card{border-style:dashed}
.bmad-sb-unver .bmad-sb-card{border-style:dashed}

/* --- Motion ---------------------------------------------------------------
   Two animations only, both short and both reducible to nothing. Height goes
   through grid-template-rows so a lane animates to a content height nobody has
   measured; visibility flips after the collapse, so a shut lane holds nothing
   focusable while staying mounted for the transition. */
.bmad-sb-fold{overflow:hidden;transition:height 180ms cubic-bezier(.2,.7,.3,1)}
.bmad-sb-fold[data-collapsed="true"]{visibility:hidden;transition:height 180ms cubic-bezier(.2,.7,.3,1),visibility 0s linear 180ms}
.bmad-sb-foldinner{min-height:0}
.bmad-sb-view{animation:bmad-sb-view-in 170ms cubic-bezier(.2,.7,.3,1)}
@keyframes bmad-sb-view-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.bmad-sb-seg>button{transition:background-color 140ms ease,color 140ms ease}
.bmad-sb-lanehead{transition:background-color 120ms ease}
.bmad-sb-chev{transition:transform 180ms cubic-bezier(.2,.7,.3,1);transform-origin:50% 50%}
.bmad-sb-lanehead[aria-expanded="true"] .bmad-sb-chev{transform:rotate(90deg)}
@media (prefers-reduced-motion:reduce){
  .bmad-sb-fold,.bmad-sb-fold[data-collapsed="true"]{transition:none}
  .bmad-sb-view{animation:none}
  .bmad-sb-seg>button,.bmad-sb-lanehead,.bmad-sb-chev{transition:none}
  .bmad-sb-tip{animation:none}
  /* The spinner stops turning but still marks the button as working. */
  .bmad-sb-spinner{animation:none;border-top-color:currentColor}
}
`;

    // --- Leaf components ---------------------------------------------------

    /**
     * Guide artwork for the sprint board entry: a three-lane board holding an
     * uneven card in each lane. Drawn on the shared 36px canvas in the product's
     * fixed artwork palette -- artwork is the one place a literal colour is
     * correct, and the glyph is decorative, so it is hidden from assistive
     * technology and the guide supplies its own layout class.
     * @param props - square edge in px, and the layout class the guide passes.
     * @returns the ornamental SVG.
     */
    function GuideArtworkSprintBoard({ size = 36, className }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          className,
          'aria-hidden': 'true',
          viewBox: '0 0 36 36',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
        },
        h('path', {
          d: 'M10.5 9H25.5C26.8807 9 28 10.1193 28 11.5V24.5C28 25.8807 26.8807 27 25.5 27H10.5C9.11929 27 8 25.8807 8 24.5V11.5C8 10.1193 9.11929 9 10.5 9ZM14.6667 9V27M21.3333 9V27',
          stroke: '#A797FC',
          strokeWidth: '2',
        }),
        h('path', {
          d: 'M9.83 12.5H12.83V17H9.83ZM16.5 12.5H19.5V19H16.5ZM23.17 12.5H26.17V16H23.17Z',
          fill: '#8B7BF7',
        }),
      );
    }

    /**
     * One story, action, or deferred card. A card with no file to open renders
     * as a plain box instead of a button, so it never lies about being clickable.
     * @param props - the card's data, its open action, and an optional link chip.
     * @returns the card element.
     */
    function Card({ id, tag, tagTone, storyTag, title, note, footer, onOpen, openLabel }) {
      const body = [
        h(
          'span',
          { className: 'bmad-sb-cardtop', key: 'top' },
          id === '' ? null : h('span', { className: 'bmad-sb-id' }, id),
          storyTag === undefined
            ? null
            : h(
                'span',
                {
                  className: 'bmad-sb-tag',
                  'data-tone': storyTag.tone,
                  title: storyTag.title,
                },
                storyTag.label,
              ),
          tag === ''
            ? null
            : h(
                'span',
                {
                  className: 'bmad-sb-tag bmad-sb-tag--source',
                  'data-tone': tagTone ?? 'neutral',
                },
                tag,
              ),
        ),
        h('span', { className: 'bmad-sb-cardtitle', key: 'title' }, title),
        note === '' || note === undefined
          ? null
          : h('span', { className: 'bmad-sb-cardnote', key: 'note' }, note),
        footer === undefined ? null : h('span', { className: 'bmad-sb-cardfoot', key: 'foot' }, footer),
      ];

      if (typeof onOpen !== 'function') {
        return h('div', { className: 'bmad-sb-card' }, body);
      }
      return h(
        'button',
        {
          type: 'button',
          className: 'bmad-sb-card',
          onClick: onOpen,
          title: openLabel,
        },
        body,
      );
    }

    /**
     * A lane header that folds its cards.
     * @param props - lane identity, colour token, count, and fold state.
     * @returns the header button.
     */
    function LaneHeader({ label, token, count, countTitle, collapsed, onToggle }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'bmad-sb-lanehead',
          'aria-expanded': !collapsed,
          onClick: onToggle,
        },
        h('span', {
          className: 'bmad-sb-dot',
          style: { background: `var(${token})` },
          'aria-hidden': true,
        }),
        h('span', { className: 'bmad-sb-lanelabel' }, label),
        // The count wears the lane's own colour, so the header reads as one
        // thing: a green 12 beside Done, an amber 5 beside Gaps. The tint is
        // mixed from the token rather than declared, so a theme that redefines
        // the token moves the pill with it.
        h(
          'span',
          {
            className: 'bmad-sb-count',
            title: countTitle,
            style: {
              color: `var(${token})`,
              background: `color-mix(in srgb, var(${token}) 12%, transparent)`,
            },
          },
          String(count),
        ),
        h(
          'span',
          { className: 'bmad-sb-chev', 'aria-hidden': true },
          collapsed ? CHEVRON_CLOSED : CHEVRON_OPEN,
        ),
      );
    }
    function BoardShell({ header, body }) {
      return h(
        'div',
        { className: 'bmad-sb-root' },
        h('style', null, CSS),
        header,
        body,
      );
    }

    /**
     * The header a board that has not loaded yet can draw.
     * @param props - the copy.
     * @returns the header element.
     */
    function TitleOnlyHeader({ t }) {
      return h(
        'header',
        { className: 'bmad-sb-head' },
        h(
          'div',
          { className: 'bmad-sb-titlerow' },
          h('span', { className: 'bmad-sb-title' }, t('title')),
        ),
      );
    }

    /**
     * The four views this one tab switches between.
     *
     * Status answers what is where, Epics answers how far each slice has come,
     * Tickets answers what one ticket is, and Initiatives answers which project
     * is on screen. They are readings of the same scan, so they are views of one
     * tab rather than tabs of their own.
     */
    const VIEWS = ['status', 'epic', 'tickets', 'initiatives'];

    /**
     * The dictionary key for each view's segment label. Kept as a map rather
     * than built from the id, because the id is an internal name while the key
     * is prose that translators own.
     */
    const VIEW_LABELS = {
      status: 'viewStatus',
      epic: 'viewEpic',
      tickets: 'viewTickets',
      initiatives: 'viewInitiatives',
    };

    /**
     * The header of a loaded board: the initiative, how much of it is settled,
     * and the view toggle.
     * @param props - the selected initiative, the current view, and the controls.
     * @returns the header element.
     */
    function BoardHeader({ t, initiative, view, onView, onRefresh, refreshing }) {
      return h(
        'header',
        { className: 'bmad-sb-head' },
        h(
          'div',
          { className: 'bmad-sb-titlerow' },
          h('span', { className: 'bmad-sb-title' }, t('title')),
          h(
            'span',
            { className: 'bmad-sb-project', title: initiative.dir },
            initiative.title,
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'bmad-sb-iconbtn',
              onClick: onRefresh,
              title: t('refresh'),
              'aria-label': t('refresh'),
            },
            '\u21BB',
          ),
        ),
        refreshing === true
          ? h(
              'div',
              { className: 'bmad-sb-sub' },
              h(
                'span',
                { className: 'bmad-sb-refreshing', role: 'status' },
                h('span', { className: 'bmad-sb-spinner', 'aria-hidden': true }),
                t('refreshing'),
              ),
            )
          : null,
        h(
          'div',
          { className: 'bmad-sb-metrics' },
          h(Bar, {
            t,
            label: t('barTickets'),
            done: initiative.counts.settled,
            total: initiative.counts.tickets,
            unknown: initiative.counts.unknown,
            // An initiative with no tickets has no denominator, and an empty
            // track would read as "clean" about a measurement nobody made.
            noData: initiative.counts.tickets === 0,
            tone: 'success',
          }),
        ),
        h(
          'div',
          { className: 'bmad-sb-seg', role: 'group', 'aria-label': t('viewLabel') },
          VIEWS.map((id) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                'aria-pressed': view === id,
                onClick: () => onView(id),
              },
              t(VIEW_LABELS[id]),
            ),
          ),
        ),
      );
    }

    /**
     * What a board that could not read its files shows instead. This is a real
     * failure -- the file was found and then would not read -- so it reports the
     * reason rather than pretending the workspace is empty.
     * @param props - the failure text and the retry action.
     * @returns the error element.
     */
    function LoadFailure({ t, message, onRetry }) {
      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-error', role: 'alert' },
          h('span', null, t('loadFailed')),
          h('span', { className: 'bmad-sb-cardnote' }, message),
          h(
            'button',
            { type: 'button', className: 'bmad-sb-btn', onClick: onRetry },
            t('retry'),
          ),
        ),
      );
    }

    /**
     * What the board shows when there is no v7 project to draw: an older
     * project, no project at all, or an output folder holding no initiative.
     * None of these is a read failure, so each one names its own case and what
     * to do about it instead of offering an empty board.
     * @param props - the detected case and the retry action.
     * @returns the notice element.
     */
    function VersionNotice({ t, version, onRetry }) {
      const title =
        version === 'v6'
          ? t('v6.title')
          : version === 'empty'
            ? t('noInitiatives.title')
            : t('noBmad.title');
      const body =
        version === 'v6'
          ? t('v6.body')
          : version === 'empty'
            ? t('noInitiatives.body')
            : t('noBmad.body');
      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-empty', role: 'status' },
          h('span', { className: 'bmad-sb-emptytitle' }, title),
          h('span', { className: 'bmad-sb-cardnote' }, body),
          h(
            'button',
            { type: 'button', className: 'bmad-sb-btn', onClick: onRetry },
            t('retry'),
          ),
        ),
      );
    }

    /**
     * Build a card's open action.
     * @param actions - the tab's own navigation actions.
     * @param fileAddress - the injected workspace-path to address builder.
     * @param path - the file to open, or null when the card has none.
     * @returns the click handler, or nothing for a card with no file.
     */

    function openHandler(actions, fileAddress, path) {
      if (path === null || path === undefined) return;
      return () => actions.openResource(fileAddress(path));
    }

    /**
     * Whether a fold is closed: the reader's own last choice, or the default the
     * board would show before they touch it. Holding overrides rather than a
     * closed set lets a later read change a default -- an epic that becomes done
     * folds itself -- while every fold the reader has touched keeps their choice.
     * @param folded - the override map for one view.
     * @param key - the lane or epic key.
     * @param fallback - the state before the reader touches this key.
     * @returns true when the body is hidden.
     */
    function isFolded(folded, key, fallback) {
      return folded.has(key) ? folded.get(key) : fallback;
    }

    /**
     * Build a fold toggle for one key.
     * @param setter - the state setter holding that view's override map.
     * @param key - the lane or epic to flip.
     * @param fallback - the state the key shows before it is overridden.
     * @returns the click handler.
     */
    function foldHandler(setter, key, fallback) {
      return () => {
        setter((previous) => {
          const next = new Map(previous);
          next.set(key, !isFolded(previous, key, fallback));
          return next;
        });
      };
    }
    function failureSnapshot(error) {
      return {
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }

    /**
     * Read the sprint files once per revision, cancelling on unmount or when the
     * tab occurrence ends. The readers are bound once per occurrence, so the
     * revision counter and the tab's own lifetime are the only inputs that
     * re-run the read.
     * @param props - the injected readers and the tab's lifetime signal.
     * @returns the load snapshot: loading, ready with a model, or failed.
     */
    /**
     * One sparse bar. The denominator is the whole set, and an unverifiable part
     * is drawn as an outlined, unfilled cell inside the track rather than by
     * shrinking the total -- a denominator that shrinks when the board cannot see
     * is a board that improves its score by going blind.
     *
     * The unknown cell is encoded three ways at once (outline, fill, label)
     * because every neutral tone is already taken for something else: grey means
     * backlog here, and the track is already empty.
     * @param props - the bar's label, its counts, and the copy.
     * @returns the bar row.
     */
    function Bar({ t, label, done, total, unknown = 0, noData = false, badge = '', tone }) {
      // A bar with a badge is a block: the row, then the foot beneath it.
      const known = Math.max(0, total - unknown);
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const segments = [];
      if (done > 0) {
        segments.push(
          h('span', {
            key: 'done',
            className: 'bmad-sb-metricfill',
            'data-tone': tone,
            style: { width: `${(done / Math.max(total, 1)) * 100}%` },
          }),
        );
      }
      if (unknown > 0) {
        segments.push(
          h('span', {
            key: 'unknown',
            className: 'bmad-sb-metricunknown',
            style: { width: `${(unknown / Math.max(total, 1)) * 100}%` },
            title: t('unknownHint', { count: unknown }),
          }),
        );
      }
      // With no denominator there is nothing to draw, and drawing an empty
      // track would say "clean" about a measurement nobody made.
      if (noData) {
        return h(
          'div',
          { className: 'bmad-sb-metric' },
          h(
            'div',
            { className: 'bmad-sb-metricrow' },
            h('span', { className: 'bmad-sb-metriclabel' }, label),
            h('span', {
              className: 'bmad-sb-metricunknown',
              style: { flex: '1 1 auto' },
              role: 'img',
              'aria-label': t('barNoData', { label }),
            }),
            h('span', { className: 'bmad-sb-metricwarn' }, t('cannotMeasure')),
          ),
        );
      }

      return h(
        'div',
        { className: 'bmad-sb-metric' },
        h(
          'div',
          { className: 'bmad-sb-metricrow' },
          h('span', { className: 'bmad-sb-metriclabel' }, label),
          h(
            'span',
            {
              className: 'bmad-sb-metrictrack',
              role: 'img',
              'aria-label':
                unknown > 0
                  ? t('barLabelUnknown', { label, done, total, unknown })
                  : t('barLabel', { label, done, total }),
            },
            segments,
          ),
          h(
            'span',
            { className: 'bmad-sb-metricnum' },
            `${done} / ${total}`,
            unknown > 0 ? h('span', { className: 'bmad-sb-metricwarn' }, ` +${unknown}?`) : null,
          ),
          h('span', { className: 'bmad-sb-metricwarn bmad-sb-metricpct' }, `${pct}%`),
          known === 0 && total > 0
            ? h('span', { className: 'bmad-sb-metricwarn' }, t('nothingVerifiable'))
            : null,
        ),
        // The mapped count is a fraction of the inventory. It goes on its own row
        // as a badge rather than trailing the numbers as a note: at 23 of 40 it
        // is the larger half of the picture, and the bar alone cannot show it.
        badge === ''
          ? null
          : h(
              'div',
              { className: 'bmad-sb-metricfoot' },
              // No action here: the card in the Could-not-check lane carries the
              // same one, and a second button beside the bar asks the same
              // question twice on one screen.
              h('span', { className: 'bmad-sb-badge bmad-sb-badge--error' }, badge),
            ),
      );
    }
    function Fold({ collapsed, children }) {
      const inner = React.useRef(null);
      const [contentHeight, setContentHeight] = React.useState(0);

      React.useEffect(() => {
        const node = inner.current;
        if (node === null) return undefined;
        const measure = () => setContentHeight(node.scrollHeight);
        measure();
        if (typeof ResizeObserver !== 'function') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
      }, []);

      return h(
        'div',
        {
          className: 'bmad-sb-fold',
          'data-collapsed': String(collapsed),
          style: { height: collapsed ? '0px' : `${contentHeight}px` },
        },
        h('div', { className: 'bmad-sb-foldinner', ref: inner }, children),
      );
    }

    /**
     * Severity -> the tag tone that carries it.
     *
     * A finding is not a status, so it does not wear a status tag's quiet tint.
     * `high` and `critical` take the error colour filled solid: a done story
     * owing patches is a contradiction, and a pale pill in a muted theme reads as
     * decoration. `medium` stays a warning tint, and `low` stays neutral, so the
     * three levels are distinguishable at a glance rather than by reading.
     *
     * @param severity - the finding's severity.
     * @returns a tag tone.
     */
    const severityTone = (severity) =>
      severity === 'critical' || severity === 'high'
        ? 'error'
        : severity === 'medium'
          ? 'warning'
          : 'neutral';

    /**
     * One lane of cards. `StatusLane` and `EpisodeSection` predate this shape;
     * a lane is a `section` carrying `bmad-sb-lane`, a `LaneHeader`, and the
     * cards below it when it is open.
     *
     * The gaps are lanes for the same reason they are `Card`s: a gap and a story
     * are two readings of one board, and a second component drifts from the first
     * the moment either changes.
     * @param props - the label, the dot's token, the cards, and the fold state.
     * @returns the lane.
     */
    function CardLane({ label, token, cards, collapsed, onToggle, modifier, note, empty, count, countTitle }) {
      return h(
        'section',
        {
          className: modifier === undefined ? 'bmad-sb-lane' : `bmad-sb-lane ${modifier}`,
          'aria-label': label,
        },
        h(LaneHeader, {
          label,
          token,
          // A lane usually counts what it holds. Retro action items are the
          // exception: the number that matters is how many are still open
          // against how many are settled, so the badge carries both.
          count: count === undefined ? cards.length : count,
          countTitle,
          collapsed,
          onToggle,
        }),
        h(
          Fold,
          { collapsed },
          cards.length === 0 && empty !== undefined
            ? h('div', { className: 'bmad-sb-note' }, empty)
            : h('div', { className: 'bmad-sb-cards' }, cards),
        ),
        collapsed === true || note === undefined || note === ''
          ? null
          : h('div', { className: 'bmad-sb-note' }, note),
      );
    }

    /** The gap cards: the finding, its evidence, and the action in the footer. */
    const gapCards = (t, gaps) =>
      gaps.map((gap) =>
        h(Card, {
          key: `${gap.id}:${gap.subject}`,
          id: gap.id,
          tag: gap.title,
          tagTone: severityTone(gap.severity),
          title: gap.subject,
          note: gap.evidence,
          footer: h(CopyButton, {
            t,
            label: gap.action.label,
            value: gap.action.payload,
          }),
        }),
      );

    /**
     * What the board could not check. The same lane and the same cards, dashed,
     * because this must never be mistaken for a finding nor for a clean result.
     */
    const unverifiableCards = (t, unverifiable) =>
      unverifiable.map((item) =>
        h(Card, {
          key: `${item.id}:${item.subject}`,
          id: item.id,
          tag: item.title,
          tagTone: 'warning',
          title: item.subject,
          note: item.evidence,
          footer: h(CopyButton, {
            t,
            label: t('askAnAgent'),
            value: item.action.payload,
          }),
        }),
      );

    /**
     * Copy text, and report whether it worked.
     *
     * `navigator.clipboard.writeText` returns a promise, so a refusal is a
     * rejection rather than a throw -- wrapping the call in try/catch catches
     * nothing and the copy fails in silence. It is refused whenever the document
     * is not focused, which is common enough to matter. The fallback path uses a
     * throwaway textarea and `execCommand`, which is deprecated but still the
     * only route when the async API is blocked.
     *
     * @param value - the text to place on the clipboard.
     * @param report - called with true when the copy landed, false when it did not.
     */
    function copyText(value, report) {
      const done = (ok) => {
        try {
          report(ok);
        } catch {
          /* a reporter that throws is not a copy failure */
        }
      };

      const fallback = () => {
        try {
          const scratch = document.createElement('textarea');
          scratch.value = value;
          scratch.setAttribute('readonly', '');
          scratch.style.position = 'fixed';
          scratch.style.top = '-1000px';
          scratch.style.opacity = '0';
          document.body.appendChild(scratch);
          scratch.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(scratch);
          return ok;
        } catch {
          return false;
        }
      };

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(value).then(
          () => done(true),
          () => done(fallback()),
        );
        return;
      }
      done(fallback());
    }

    /**
     * A button that copies its payload and says so.
     *
     * Every action this board offers is a string, so a copy with no visible
     * outcome is indistinguishable from a broken button -- which is exactly what
     * it was. The label carries the result for a moment, then returns.
     * @param props - the label, the payload, and the action kind.
     * @returns the copy button.
     */
    function CopyButton({ t, label, value }) {
      const [busy, setBusy] = React.useState(false);
      const [notice, setNotice] = React.useState(null);

      return h(
        'span',
        { className: 'bmad-sb-copywrap' },
        h(
          'button',
          {
            type: 'button',
            className: 'bmad-sb-btn',
            // The label never changes. It used to be replaced by "Copied" and
            // back, which resized the button twice and read as the control
            // vanishing rather than reporting; the result belongs beside it.
            'data-state': busy ? 'busy' : 'idle',
            'aria-busy': busy ? 'true' : undefined,
            disabled: busy,
            // Every action here is the same act -- copy a prompt -- so the
            // visible text says that once instead of nine different sentences
            // that all did the same thing. What this particular one asks stays
            // available two ways: on hover, and as the accessible name, so a
            // screen reader does not hear nine identical buttons.
            'aria-label': label,
            title: value,
            onClick: (event) => {
              // A card that can be opened is itself a button, and this one sits
              // inside it. Without this the click copies *and* opens the
              // document, so the action did two things and only one was asked.
              event.stopPropagation();
              if (busy) return;
              setBusy(true);
              setNotice(null);
              copyText(value, (ok) => {
                setBusy(false);
                setNotice(ok ? 'copied' : 'failed');
                window.setTimeout(() => setNotice(null), 2000);
              });
            },
          },
          t('askAgentPill'),
          busy ? h('span', { className: 'bmad-sb-spinner', 'aria-hidden': true }) : null,
        ),
        // `status` so the outcome is announced as well as shown.
        notice === null
          ? null
          : h(
              'span',
              { className: 'bmad-sb-tip', 'data-kind': notice, role: 'status' },
              notice === 'copied' ? t('copied') : t('copyFailed'),
            ),
      );
    }

    /**
     * The last good reading per Session, kept for the life of the page.
     *
     * A refresh re-reads around thirty files. Without this, every remount -- a
     * tab switch, a second look at the same board -- pays that cost again and
     * shows a spinner while it does, even though the answer rarely changed.
     */
    const SNAPSHOT_CACHE = new Map();

    /**
     * Read a whole workspace file, page by page.
     *
     * The Remote read returns one page and says whether it reached the end. A
     * ticket index or plan longer than one page would otherwise be silently
     * truncated, and the board would report the unseen tail as absent.
     *
     * @param face - the `workspaceFiles` Remote namespace.
     * @param sessionId - the Session whose workspace resolves the path.
     * @param path - the workspace-relative path.
     * @param signal - cancellation.
     * @returns {Promise<string>} the whole text.
     */
    async function readWholeFile(face, sessionId, path, signal) {
      const parts = [];
      let offset = 1;
      for (;;) {
        const result = await face.read(sessionId, path, { offset }, signal);
        if (!result.ok) throw result.error;
        const page = result.value;
        parts.push(page.text);
        if (page.eof) return parts.join('\n');
        offset += Math.max(page.lines, 1);
      }
    }

    /**
     * Read the BMAD project once per revision, cancelling on unmount or when the
     * tab occurrence ends. The readers are bound once per occurrence, so the
     * revision counter and the tab's own lifetime are the only inputs that
     * re-run the scan.
     * @param props - the injected readers and the tab's lifetime signal.
     * @returns the load snapshot: loading, ready with a scan, or failed.
     */
    function useSprintSnapshot({ io, sessionId, tabSignal, revision }) {
      // Start from what we already know, already marked as being refreshed.
      const [snapshot, setSnapshot] = React.useState(() => {
        const cached = SNAPSHOT_CACHE.get(sessionId);
        return cached === undefined ? { phase: 'loading' } : { ...cached, refreshing: true };
      });

      React.useEffect(() => {
        const controller = new AbortController();
        const onTabGone = () => controller.abort();
        tabSignal.addEventListener('abort', onTabGone);
        let live = true;

        const cached = SNAPSHOT_CACHE.get(sessionId);
        // With something to show, show it and say it is being refreshed. With
        // nothing, the spinner is the only honest thing on screen.
        setSnapshot(cached === undefined ? { phase: 'loading' } : { ...cached, refreshing: true });

        scanProject(io, controller.signal).then(
          (board) => {
            if (!live) return;
            const next = { phase: 'ready', board, readAt: Date.now(), refreshing: false };
            SNAPSHOT_CACHE.set(sessionId, next);
            setSnapshot(next);
          },
          (error) => {
            if (!live) return;
            const previous = SNAPSHOT_CACHE.get(sessionId);
            // A refresh that fails keeps the last good reading and says so. A
            // blank board would be a worse lie than a dated one.
            setSnapshot(
              previous === undefined
                ? failureSnapshot(error)
                : { ...previous, refreshing: false, refreshFailed: true },
            );
          },
        );

        return () => {
          live = false;
          tabSignal.removeEventListener('abort', onTabGone);
          controller.abort();
        };
      }, [revision, tabSignal, io, sessionId]);

      return snapshot;
    }

    // --- Views -------------------------------------------------------------

    /**
     * A v7 status mapped to the theme token that carries its marker colour.
     *
     * The words are `STATUS_ORDER` plus the unknown lane: grey while nothing is
     * moving, blue while it is, amber while someone is reviewing, solid error red
     * when blocked, green once settled. The mapping lives in the shell because a
     * theme token may not enter the core.
     * @param status - a ticket or container status, or null when none is declared.
     * @returns a theme token name.
     */
    function statusToken(status) {
      if (status === 'blocked') return '--dsw-alias-state-error-primary';
      if (status === 'in-progress' || status === 'built') {
        return '--dsw-alias-state-business-primary';
      }
      if (status === 'review') return WARN_TOKEN;
      if (status === 'done') return '--dsw-alias-state-success-primary';
      if (status === null) return WARN_TOKEN;
      return IDLE_TOKEN;
    }

    /**
     * The tag tone a status wears on a card. A tag is quieter than a lane dot,
     * so settled work is tinted rather than filled.
     * @param status - a ticket status, or null when none is declared.
     * @returns a tag tone.
     */
    function statusTone(status) {
      if (status === 'done') return 'success';
      if (status === 'blocked') return 'error';
      if (status === 'review') return 'warning';
      if (status === 'in-progress' || status === 'built') return 'info';
      if (status === null) return 'warning';
      return 'neutral';
    }

    /**
     * The displayed name of a status, including the unknown lane.
     *
     * A status word the dictionary does not know is shown as the word itself.
     * Translating it is impossible, and folding it into a generic label would
     * lose exactly the finding the detector reports.
     * @param t - the bound dictionary.
     * @param status - a status, or null when none is declared.
     * @returns the label.
     */
    function statusLabel(t, status) {
      if (status === null) return t('status.unknown');
      const key = `status.${status}`;
      const label = t(key);
      return label === key ? status : label;
    }

    /**
     * One ticket as a card: its reference, title, status, and -- where the list
     * is not already inside an epic -- the epic it belongs to.
     * @param props - the ticket, the opener, and whether to name its epic.
     * @returns the card element.
     */
    function TicketCard({ t, ticket, makeOpener, showEpic }) {
      return h(Card, {
        id: ticket.ref,
        title: ticket.title,
        storyTag: {
          // A ticket with no plan has no state at all; saying "unknown" beside
          // tickets that do declare one would blur the two cases together.
          label: ticket.status === null ? t('noPlan') : statusLabel(t, ticket.status),
          tone: statusTone(ticket.status),
          title: t('ticketStatus'),
        },
        note: showEpic === true ? ticket.epicTitle : '',
        onOpen: makeOpener(ticket.plan === null ? null : ticket.plan.path),
        openLabel: t('openPlan'),
      });
    }

    /**
     * View 1: the initiative's status lanes, then what the detectors say is
     * wrong or unknowable.
     *
     * The findings stay below the work rather than inside it: a gap is not a
     * status, and an unverifiable check is not a gap. A ticket with no plan sits
     * in its own lane because "not started" and "cannot tell" are different
     * claims.
     * @param props - the initiative, the unreadable count, folds, and the opener.
     * @returns the status view.
     */
    function StatusView({ t, initiative, unreadable, folded, onFlip, makeOpener }) {
      const lanes = statusLanes(initiative).map(({ status, tickets }) => {
        const laneKey = `status:${status ?? 'unknown'}`;
        return h(CardLane, {
          key: laneKey,
          label: statusLabel(t, status),
          token: statusToken(status),
          cards: tickets.map((ticket) =>
            h(TicketCard, { key: ticket.ref, t, ticket, makeOpener, showEpic: true })),
          collapsed: isFolded(folded, laneKey, false),
          onToggle: foldHandler(onFlip, laneKey, false),
        });
      });

      const detected = detectInitiative(initiative);
      const empty = detectEmptyInitiative(initiative);
      const gaps = empty === null ? detected.gaps : [empty, ...detected.gaps];
      const findings = [
        gaps.length === 0
          ? null
          : h(CardLane, {
              key: 'gaps',
              label: t('gapsLabel'),
              token: WARN_TOKEN,
              cards: gapCards(t, gaps),
              collapsed: isFolded(folded, 'gaps', false),
              onToggle: foldHandler(onFlip, 'gaps', false),
            }),
        detected.unverifiable.length === 0
          ? null
          : h(CardLane, {
              key: 'unverifiable',
              label: t('unverLabel'),
              token: IDLE_TOKEN,
              modifier: 'bmad-sb-lane--unverifiable',
              cards: unverifiableCards(t, detected.unverifiable),
              collapsed: isFolded(folded, 'unverifiable', false),
              onToggle: foldHandler(onFlip, 'unverifiable', false),
            }),
      ].filter(Boolean);

      return h(
        'div',
        null,
        lanes.length === 0 ? h('div', { className: 'bmad-sb-note' }, t('noTickets')) : lanes,
        unreadable > 0
          ? h(
              'div',
              { className: 'bmad-sb-note' },
              t('unreadableNote', { count: unreadable }),
            )
          : null,
        findings,
      );
    }

    /**
     * View 2: one foldable section per epic.
     *
     * The count is settled over total, and the progress tooltip carries how many
     * tickets have no plan -- those are counted in neither half, so a bare
     * ratio would overstate what the epic has done.
     * @param props - the initiative, folds, and the opener.
     * @returns the epic view.
     */
    function EpicView({ t, initiative, folded, onFlip, makeOpener }) {
      if (initiative.epics.length === 0) {
        return h('div', { className: 'bmad-sb-note' }, t('noEpics'));
      }
      return h(
        'div',
        null,
        initiative.epics.map((epic) => {
          const settled = epic.tickets.filter(
            (ticket) => ticket.status !== null && SETTLED.has(ticket.status),
          ).length;
          const unknown = epic.tickets.filter((ticket) => ticket.status === null).length;
          const foldKey = `epic:${initiative.slug}:${epic.slug}`;
          const collapsed = isFolded(folded, foldKey, false);
          const cards = epic.tickets.map((ticket) =>
            h(TicketCard, {
              key: ticket.ref,
              t,
              ticket,
              makeOpener,
              showEpic: false,
            }));
          return h(
            'section',
            { className: 'bmad-sb-epicsec', key: foldKey },
            h(
              'div',
              { className: 'bmad-sb-epichead' },
              h(LaneHeader, {
                label: epic.title,
                token: statusToken(epic.status),
                count: `${settled}/${epic.tickets.length}`,
                countTitle: t('epicProgress', {
                  done: settled,
                  total: epic.tickets.length,
                  unknown,
                }),
                collapsed,
                onToggle: foldHandler(onFlip, foldKey, false),
              }),
              h(
                'span',
                {
                  className: 'bmad-sb-tag bmad-sb-tag--source',
                  'data-tone': statusTone(epic.status),
                },
                statusLabel(t, epic.status),
              ),
            ),
            h(
              Fold,
              { collapsed },
              cards.length === 0
                ? h('div', { className: 'bmad-sb-note' }, t('noTickets'))
                : h('div', { className: 'bmad-sb-cards' }, cards),
            ),
          );
        }),
      );
    }

    /**
     * View 3: every ticket in the initiative, grouped by status.
     *
     * The epic title rides on each card because this is the view where a ticket
     * is read on its own rather than inside the section that contains it.
     * @param props - the initiative, folds, and the opener.
     * @returns the ticket view.
     */
    function TicketsView({ t, initiative, folded, onFlip, makeOpener }) {
      const lanes = statusLanes(initiative);
      if (lanes.length === 0) {
        return h('div', { className: 'bmad-sb-note' }, t('noTickets'));
      }
      return h(
        'div',
        null,
        lanes.map(({ status, tickets }) => {
          const laneKey = `tickets:${status ?? 'unknown'}`;
          return h(CardLane, {
            key: laneKey,
            label: statusLabel(t, status),
            token: statusToken(status),
            cards: tickets.map((ticket) =>
              h(TicketCard, { key: ticket.ref, t, ticket, makeOpener, showEpic: true })),
            // Settled work is still shown, but a finished initiative should open on
            // what is left rather than on the lane that holds everything else.
            collapsed: isFolded(folded, laneKey, SETTLED.has(status)),
            onToggle: foldHandler(onFlip, laneKey, SETTLED.has(status)),
          });
        }),
      );
    }

    /**
     * View 4: one card per initiative, with the one BMAD itself considers active
     * marked apart from the one this tab happens to show.
     *
     * Choosing a card only changes local state. `active_initiative` belongs to
     * the project's config, and a read-only board must not rewrite it to record
     * which card someone clicked.
     * @param props - every initiative, the active and shown slugs, and the picker.
     * @returns the initiatives view.
     */
    function InitiativesView({ t, initiatives, activeSlug, selectedSlug, onSelect, folded, onFlip }) {
      const asCard = (initiative) => {
        const active = initiative.slug === activeSlug;
        const selected = selectedSlug !== null && initiative.slug === selectedSlug;
        const marks = [
          active ? t('activeBadge') : '',
          selected ? t('selectedBadge') : '',
        ].filter(Boolean);
        const counts = t('initiativeCounts', {
          epics: initiative.counts.epics,
          tickets: initiative.counts.tickets,
        });
        return h(Card, {
          key: initiative.slug,
          id: humanise(initiative.slug),
          title: initiative.title,
          storyTag: {
            label: statusLabel(t, initiative.status),
            tone: statusTone(initiative.status),
            title: t('initiativeStatus'),
          },
          // An initiative whose store lists no epics has never had work in it,
          // whatever its status field says. Saying so is the whole point of the
          // board: the number and the word disagree, and the reader sees both.
          note: [
            counts,
            initiative.counts.epics === 0 ? t('initiativeEmpty') : '',
            initiative.unreadable > 0
              ? t('initiativeUnreadable', { count: initiative.unreadable })
              : '',
          ].filter(Boolean).join(' -- '),
          footer: marks.length === 0 ? undefined : marks.join(' | '),
          onOpen: () => onSelect(initiative.slug),
          openLabel: t('selectInitiative'),
        });
      };

      // A settled initiative keeps its folder and its tickets, and hiding them
      // would be the board deciding what the reader may see. They collect under
      // one fold instead, so the list stays about work that is still open
      // without pretending the finished work is not there.
      const open = initiatives.filter((i) => !SETTLED.has(i.status));
      const settled = initiatives.filter((i) => SETTLED.has(i.status));

      return h(
        'div',
        null,
        h('div', { className: 'bmad-sb-cards' }, open.map(asCard)),
        settled.length === 0
          ? null
          : h(CardLane, {
              label: t('settledInitiatives'),
              token: IDLE_TOKEN,
              cards: settled.map(asCard),
              count: String(settled.length),
              collapsed: isFolded(folded, 'initiatives:settled', true),
              onToggle: foldHandler(onFlip, 'initiatives:settled', true),
            }),
      );
    }

    /**
     * The board body: scans the BMAD project, then renders the chosen view.
     * @param props - framework-bound tab identity, `t`, and the injected readers.
     * @returns the tab's content.
     */
    function SprintBoard({
      t,
      useTabInfo,
      sessionId,
      readWorkspaceFile,
      listWorkspaceDir,
      statWorkspacePath,
      fileAddress,
    }) {
      const tab = useTabInfo();
      const actions = tab.tab.actions;

      const [revision, setRevision] = React.useState(0);
      // Null means "not chosen yet", so the default can depend on the scan:
      // Initiatives when no active initiative is named, Status otherwise.
      const [view, setView] = React.useState(null);
      const [pickedSlug, setPickedSlug] = React.useState(null);
      const [folded, setFolded] = React.useState(() => new Map());

      // One stable face for the scanner, so the read effect keys on the Session
      // rather than on a fresh object each render.
      const io = React.useMemo(
        () => ({
          read: readWorkspaceFile,
          list: listWorkspaceDir,
          stat: statWorkspacePath,
        }),
        [readWorkspaceFile, listWorkspaceDir, statWorkspacePath],
      );

      const snapshot = useSprintSnapshot({
        io,
        sessionId,
        tabSignal: tab.tab.signal,
        revision,
      });

      const refresh = () => setRevision((value) => value + 1);

      if (snapshot.phase !== 'ready') {
        return h(BoardShell, {
          header: h(TitleOnlyHeader, { t }),
          body:
            snapshot.phase === 'loading'
              ? h('div', { className: 'bmad-sb-note', role: 'status' }, t('loading'))
              : h(LoadFailure, {
                  t,
                  message: snapshot.message,
                  onRetry: refresh,
                }),
        });
      }

      const board = snapshot.board;
      if (board.version !== 'v7') {
        return h(BoardShell, {
          header: h(TitleOnlyHeader, { t }),
          body: h(VersionNotice, {
            t,
            version: board.version,
            onRetry: refresh,
          }),
        });
      }
      if (board.initiatives.length === 0) {
        return h(BoardShell, {
          header: h(TitleOnlyHeader, { t }),
          body: h(VersionNotice, { t, version: 'empty', onRetry: refresh }),
        });
      }

      const active =
        board.initiatives.find(
          (initiative) => initiative.slug === board.config.activeInitiative,
        ) ?? null;
      const picked =
        pickedSlug === null
          ? null
          : board.initiatives.find((initiative) => initiative.slug === pickedSlug) ?? null;
      // Status, Epics and Tickets need one initiative; before anything is
      // picked they show the active one, or the first when no active is named.
      const firstOpen = board.initiatives.find((i) => !SETTLED.has(i.status)) ?? null;
      const selected = picked ?? active ?? firstOpen ?? board.initiatives[0];
      const shown = view ?? (active === null ? 'initiatives' : 'status');
      const makeOpener = (path) => openHandler(actions, fileAddress, path);
      const pick = (slug) => {
        setPickedSlug(slug);
        setView('status');
      };
      const unreadable = board.unreadable.length + (selected.unreadable ?? 0);

      const body =
        shown === 'initiatives'
          ? h(InitiativesView, {
              t,
              initiatives: board.initiatives,
              activeSlug: board.config.activeInitiative,
              selectedSlug: picked === null ? null : picked.slug,
              onSelect: pick,
            folded,
            onFlip: setFolded,
            })
          : shown === 'epic'
            ? h(EpicView, {
                t,
                initiative: selected,
                folded,
                onFlip: setFolded,
                makeOpener,
              })
            : shown === 'tickets'
              ? h(TicketsView, {
                  t,
                  initiative: selected,
                  folded,
                  onFlip: setFolded,
                  makeOpener,
                })
              : h(StatusView, {
                  t,
                  initiative: selected,
                  unreadable,
                  folded,
                  onFlip: setFolded,
                  makeOpener,
                });

      return h(BoardShell, {
        header: h(BoardHeader, {
          t,
          initiative: selected,
          view: shown,
          onView: setView,
          onRefresh: refresh,
          refreshing: snapshot.refreshing === true,
        }),
        body: h(
          'div',
          { className: 'bmad-sb-scroll' },
          // Keyed on the reading: switching view or initiative remounts the
          // list, which replays the settle animation instead of swapping content.
          h('div', { className: 'bmad-sb-view', key: `${shown}:${selected.slug}` }, body),
        ),
      });
    }

    // --- Dictionaries ------------------------------------------------------

    const en = {
      'refreshing': 'refreshing...',
      'viewLabel': 'Group the board by',
      'viewStatus': 'Status',
      'viewEpic': 'Epics',
      'viewTickets': 'Tickets',
      'viewInitiatives': 'Initiatives',
      'title': 'BMAD v7 board',
      'guide.title': 'Sprint board',
      'guide.description': 'BMAD v7 initiatives, epics and tickets as a board',
      'refresh': 'Re-read the BMAD files',
      'retry': 'Retry',
      'loading': 'Reading the BMAD project...',
      'loadFailed': 'Could not read the BMAD project.',
      'v6.title': 'This board reads BMAD v7',
      'v6.body': 'This workspace looks like a BMAD v6 project. This version does not read it -- install dsh-plugin-bmad-sprint-board@1.0.0 for the v6 board.',
      'noBmad.title': 'No BMAD project in this workspace',
      'noBmad.body': 'The board looks for _bmad/config.toml and the output folder it declares.',
      'noInitiatives.title': 'No initiatives found',
      'noInitiatives.body': 'The configured output folder holds no initiative-* folder yet.',
      'noTickets': 'No tickets in this view.',
      'noEpics': 'This initiative declares no epics.',
      'unreadableNote': '{count} file(s) could not be read; the board may be incomplete.',
      'status.blocked': 'Blocked',
      'status.backlog': 'Not started',
      'status.in-progress': 'In progress',
      'status.review': 'In review',
      'status.built': 'Built',
      'status.draft': 'Draft',
      'status.done': 'Done',
      'status.dropped': 'Dropped',
      'status.unknown': 'Unknown',
      'noPlan': 'No plan',
      'ticketStatus': 'Ticket status',
      'openPlan': 'Open the plan file',
      'epicProgress': '{done} of {total} tickets settled, {unknown} with no plan',
      'initiativeStatus': 'Initiative status',
      'initiativeCounts': '{epics} epics, {tickets} tickets',
      'initiativeUnreadable': '{count} unreadable file(s)',
      'activeBadge': 'active initiative',
      'selectedBadge': 'shown here',
      'selectInitiative': 'Show this initiative on the board',
      'settledInitiatives': 'settled initiatives',
      'initiativeEmpty': 'no epics, so never started',
      'gapsLabel': 'Gaps',
      'unverLabel': 'Could not check',
      'askAnAgent': 'Ask an agent',
      'askAgentPill': 'Ask agent - prompt',
      'copied': 'Copied',
      'copyFailed': 'Copy failed -- select and copy manually',
      'barNoData': '{label}: no data',
      'cannotMeasure': 'cannot measure',
      'barTickets': 'tickets',
      'barLabel': '{label}: {done} of {total} complete',
      'barLabelUnknown': '{label}: {done} of {total} complete, {unknown} could not be verified',
      'unknownHint': '{count} could not be verified',
      'nothingVerifiable': 'nothing verifiable',
      'nextLabel': 'Next',
      'allDone': 'Every ticket is done.',
      'noSpec': 'No plan file yet',
      'openSpec': 'Open the spec file',
      'deferredCount': '{count} deferred',
      'shortcut.noSession': 'Open a Session to show the BMAD board',
    };

    const zh = {
      'refreshing': '\u6b63\u5728\u5237\u65b0...',
      'viewLabel': '\u770b\u677f\u5206\u7ec4\u65b9\u5f0f',
      'viewStatus': '\u72b6\u6001',
      'viewEpic': '\u53f2\u8bd7',
      'viewTickets': '\u5de5\u5355',
      'viewInitiatives': '\u5021\u8bae',
      'title': 'BMAD v7 \u770b\u677f',
      'guide.title': '\u51b2\u523a\u770b\u677f',
      'guide.description': '\u4ee5\u770b\u677f\u5f62\u5f0f\u5c55\u793a BMAD v7 \u7684\u5021\u8bae\u3001\u53f2\u8bd7\u4e0e\u5de5\u5355',
      'refresh': '\u91cd\u65b0\u8bfb\u53d6 BMAD \u6587\u4ef6',
      'retry': '\u91cd\u8bd5',
      'loading': '\u6b63\u5728\u8bfb\u53d6 BMAD \u9879\u76ee...',
      'loadFailed': '\u65e0\u6cd5\u8bfb\u53d6 BMAD \u9879\u76ee\u3002',
      'v6.title': '\u6b64\u770b\u677f\u4ec5\u652f\u6301 BMAD v7',
      'v6.body': '\u6b64\u5de5\u4f5c\u533a\u770b\u8d77\u6765\u662f BMAD v6 \u9879\u76ee\uff0c\u672c\u7248\u672c\u65e0\u6cd5\u8bfb\u53d6\u3002\u8bf7\u5b89\u88c5 dsh-plugin-bmad-sprint-board@1.0.0 \u4ee5\u4f7f\u7528 v6 \u770b\u677f\u3002',
      'noBmad.title': '\u6b64\u5de5\u4f5c\u533a\u4e2d\u6ca1\u6709 BMAD \u9879\u76ee',
      'noBmad.body': '\u770b\u677f\u4f1a\u67e5\u627e _bmad/config.toml \u53ca\u5176\u58f0\u660e\u7684\u8f93\u51fa\u76ee\u5f55\u3002',
      'noInitiatives.title': '\u672a\u627e\u5230\u4efb\u4f55\u5021\u8bae',
      'noInitiatives.body': '\u914d\u7f6e\u7684\u8f93\u51fa\u76ee\u5f55\u4e2d\u5c1a\u65e0 initiative-* \u76ee\u5f55\u3002',
      'noTickets': '\u6b64\u89c6\u56fe\u4e2d\u6ca1\u6709\u5de5\u5355\u3002',
      'noEpics': '\u6b64\u5021\u8bae\u5c1a\u672a\u58f0\u660e\u4efb\u4f55\u53f2\u8bd7\u3002',
      'unreadableNote': '\u6709 {count} \u4e2a\u6587\u4ef6\u65e0\u6cd5\u8bfb\u53d6\uff0c\u770b\u677f\u53ef\u80fd\u4e0d\u5b8c\u6574\u3002',
      'status.blocked': '\u53d7\u963b',
      'status.backlog': '\u5c1a\u672a\u5f00\u59cb',
      'status.in-progress': '\u8fdb\u884c\u4e2d',
      'status.review': '\u5ba1\u67e5\u4e2d',
      'status.built': '\u5df2\u6784\u5efa',
      'status.draft': '\u8349\u7a3f',
      'status.done': '\u5df2\u5b8c\u6210',
      'status.dropped': '\u5df2\u653e\u5f03',
      'status.unknown': '\u672a\u77e5',
      'noPlan': '\u65e0\u8ba1\u5212',
      'ticketStatus': '\u5de5\u5355\u72b6\u6001',
      'openPlan': '\u6253\u5f00\u8ba1\u5212\u6587\u4ef6',
      'epicProgress': '{total} \u4e2a\u5de5\u5355\u4e2d {done} \u4e2a\u5df2\u7ed3\u6e05\uff0c{unknown} \u4e2a\u6ca1\u6709\u8ba1\u5212',
      'initiativeStatus': '\u5021\u8bae\u72b6\u6001',
      'initiativeCounts': '{epics} \u4e2a\u53f2\u8bd7\uff0c{tickets} \u4e2a\u5de5\u5355',
      'initiativeUnreadable': '{count} \u4e2a\u6587\u4ef6\u65e0\u6cd5\u8bfb\u53d6',
      'activeBadge': '\u5f53\u524d\u6d3b\u8dc3\u5021\u8bae',
      'selectedBadge': '\u5f53\u524d\u663e\u793a',
      'selectInitiative': '\u5728\u770b\u677f\u4e2d\u663e\u793a\u6b64\u5021\u8bae',
      'settledInitiatives': '\u5df2\u7ed3\u675f\u7684\u5021\u8bae',
      'initiativeEmpty': '\u65e0\u4efb\u52a1\u5305\uff0c\u5c1a\u672a\u5f00\u59cb',
      'gapsLabel': '\u5dee\u8ddd',
      'unverLabel': '\u65e0\u6cd5\u68c0\u67e5',
      'askAnAgent': '\u8be2\u95ee\u667a\u80fd\u4f53',
      'askAgentPill': '\u8be2\u95ee\u667a\u80fd\u4f53 - \u63d0\u793a\u8bcd',
      'copied': '\u5df2\u590d\u5236',
      'copyFailed': '\u590d\u5236\u5931\u8d25 -- \u8bf7\u624b\u52a8\u9009\u62e9\u5e76\u590d\u5236',
      'barNoData': '{label}\uff1a\u65e0\u6570\u636e',
      'cannotMeasure': '\u65e0\u6cd5\u6d4b\u91cf',
      'barTickets': '\u5de5\u5355',
      'barLabel': '{label}\uff1a{total} \u4e2d\u7684 {done} \u5df2\u5b8c\u6210',
      'barLabelUnknown': '{label}\uff1a{total} \u4e2d\u7684 {done} \u5df2\u5b8c\u6210\uff0c{unknown} \u9879\u65e0\u6cd5\u6838\u5b9e',
      'unknownHint': '{count} \u9879\u65e0\u6cd5\u6838\u5b9e',
      'nothingVerifiable': '\u65e0\u53ef\u6838\u5b9e\u9879',
      'nextLabel': '\u4e0b\u4e00\u6b65',
      'allDone': '\u6240\u6709\u5de5\u5355\u5747\u5df2\u5b8c\u6210\u3002',
      'noSpec': '\u5c1a\u65e0\u8ba1\u5212\u6587\u4ef6',
      'openSpec': '\u6253\u5f00\u89c4\u683c\u6587\u4ef6',
      'deferredCount': '\u5ef6\u671f {count} \u9879',
      'shortcut.noSession': '\u9700\u8981\u6253\u5f00\u4e00\u4e2a\u4f1a\u8bdd\u624d\u80fd\u663e\u793a BMAD \u770b\u677f',
    };

    return {
      // `remote.workspaceFiles` is its own inject key: the Remote face guards
      // each namespace, so naming only `remote` leaves the property unreachable.
      // `shortcuts` is deliberately absent: the keybinding is an optional extra,
      // so it is requested through `ctx.inject` and the tab still works without.
      inject: [
        'slots',
        'locale',
        'sidebarRightTabs',
        'sidebarRight',
        'remote',
        'remote.workspaceFiles',
      ],

      /**
       * Register the tab type, its guide entry, its body, and its shortcut.
       * @param ctx - Client root context.
       */
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { en, zh }),
          'bmad-sprint-board: dictionaries',
        );

        const t = ctx.locale.bind(NS);

        ctx.inject(['shortcuts'], (ctx) => {
          ctx.effect(
            () =>
              ctx.shortcuts.register({
                id: BOARD_COMMAND,
                label: () => t('guide.title'),
                aliases: [
                  'sprint board',
                  'bmad sprint',
                  'sprint',
                  'board',
                  'kanban',
                ],
                defaults: {
                  // Same family as the shipped tab commands (Files is primary+P,
                  // Browser primary+T): one primary chord on the desktop, and a
                  // browser-safe primary+alt chord on the web, where a bare
                  // primary+letter is off limits. `S` for sprint: every other
                  // letter in this shape is taken or reserved, and the Registry
                  // refuses a default that collides on any declared profile.
                  'desktop:macos': { code: 'KeyS', modifiers: ['primary'] },
                  'desktop:windows': { code: 'KeyS', modifiers: ['primary'] },
                  'desktop:linux': { code: 'KeyS', modifiers: ['primary'] },
                  'web:macos': { code: 'KeyS', modifiers: ['primary', 'alt'] },
                  'web:windows': {
                    code: 'KeyS',
                    modifiers: ['primary', 'alt'],
                  },
                },
                // Reachable while typing, like every other sidebar tab command.
                regions: ['page', 'editable', 'terminal'],
                modals: [],
                resolve: ({ target }) => {
                  const pane = ctx.sidebarRight.commandTarget(target);
                  if (pane === undefined) {
                    return { status: 'blocked', reason: t('shortcut.noSession') };
                  }
                  return {
                    status: 'handled',
                    run: () => ctx.sidebarRight.openTabFromTarget(TAB_KIND, pane),
                  };
                },
              }),
            'bmad-sprint-board: shortcut',
          );
        });

        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: PLUGIN_ID,
              kind: TAB_KIND,
              priority: 'extension',
              title: () => t('title'),
              guide: [
                {
                  id: 'board',
                  order: 30,
                  title: () => t('guide.title'),
                  description: () => t('guide.description'),
                  icon: GuideArtworkSprintBoard,
                  // Shows the resolved keycap on the guide capsule.
                  commandId: BOARD_COMMAND,
                },
              ],
            }),
          'bmad-sprint-board: tab type',
        );

        // The tab body reads through these bindings rather than the Remote face
        // directly, so the scanner never has to know about Sessions or remote
        // result envelopes and the same readers work for any workspace face.
        const paneInject = (sessionId) => ({
          sessionId,
          readWorkspaceFile: (path, signal) =>
            readWholeFile(ctx.remote.workspaceFiles, sessionId, path, signal),
          listWorkspaceDir: async (path, signal) => {
            const result = await ctx.remote.workspaceFiles.list(
              sessionId,
              path,
              signal,
            );
            if (!result.ok) throw result.error;
            return result.value.entries;
          },
          // Existence probes during the scan: a missing path is an answer, not a
          // failure, so this reports the miss instead of throwing.
          statWorkspacePath: async (path, signal) => {
            try {
              const result = await ctx.remote.workspaceFiles.stat(
                sessionId,
                path,
                signal,
              );
              return result.ok
                ? { ok: true }
                : { ok: false, code: result.error.code };
            } catch (error) {
              return { ok: false, code: String(error) };
            }
          },
          fileAddress: (path) => sessionFileAddress(sessionId, path),
        });

        for (const [key, Component] of [
          [PLUGIN_ID, SprintBoard],
        ]) {
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register(
              { name: 'sidebar.right.pane.tab', key, locale: NS, inject: paneInject },
              Component,
            ),
          );
        }

      },
    };
  },
});
