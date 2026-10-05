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
 * @module @local/dsh-plugin-bmad-sprint-board/client
 */


/**
 * BMAD Sprint Board -- the Client half of the bundle.
 *
 * Contributes one page-type tab to the Session's right Sidebar (the column that
 * already holds Chat, Guide, Files and Terminal) and one guide entry that opens
 * it. The board is strictly read-only: it reads three workspace files through
 * the Host `workspaceFiles` Remote face and never writes to them.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/client
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-plugin-bmad-sprint-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'bmadSprintBoard';
    /** This implementation's identity: the tab type id and the body's cell key. */
    const PLUGIN_ID = '@local/dsh-plugin-bmad-sprint-board';
    /** Page kind the guide entry opens. */
    const TAB_KIND = 'bmad-sprint-board';
    /** Command id of the keybinding that opens the board. */
    /**
     * How many file reads the loader keeps in flight.
     *
     * The reads are round-trips to the Host's workspace face. All of them at
     * once would be quickest and would also hand the far side thirty
     * simultaneous requests for a board that refreshes on a click; eight keeps
     * the wait short without turning a refresh into a burst.
     */
    const READ_CONCURRENCY = 8;

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
    const STATUS_TOKEN = {
    backlog: '--dsw-alias-state-idle-primary',
    'ready-for-dev': '--dsw-alias-label-secondary',
    'in-progress': '--dsw-alias-state-business-primary',
    review: '--dsw-alias-state-warn-primary',
    done: '--dsw-alias-state-success-primary',
    };
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
     * BMAD Sprint Board -- the host-independent core.
     *
     * Pure functions over text: discover the tracking file, parse it and the
     * deferred ledger, build the model, and (from v1) evaluate detectors against it.
     *
     * This module must never reference DSH, Cordis, React, or the DOM. Anything
     * that needs a host arrives as an injected reader; anything that needs a theme
     * arrives as a palette. That constraint is what lets the same core back a
     * second shell, and it is asserted by src/boundary.test.js.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/core
     */

    /** Names a BMAD sprint-tracking file goes by, in preference order. */
    const SPRINT_FILENAMES = ['sprint-status.yaml', 'sprint-status.yml'];

    /**
     * Directories a BMAD install keeps its tracking file in, relative to the
     * workspace root, probed before any scan. The first is the conventional
     * layout; the rest cover a reconfigured output folder, so the common case
     * costs a couple of stats rather than a walk. The empty string is the root.
     */
    const SPRINT_CANDIDATES = [
      '_bmad-output/implementation-artifacts',
      '_bmad-output',
      '_bmad/implementation-artifacts',
      '_bmad',
      'docs',
      'bmad',
      '.bmad',
      '',
    ];

    /** Directory names a scan never descends into: build output and vendored trees. */
    const SCAN_SKIP = new Set([
      '.cache',
      '.git',
      '.next',
      '.nuxt',
      '.output',
      '.pnpm-store',
      '.react-router',
      '.svelte-kit',
      '.tmp',
      '.tox',
      '.venv',
      '.yarn',
      '__pycache__',
      'build',
      'coverage',
      'dist',
      'node_modules',
      'out',
      'playwright-report',
      'target',
      'test-results',
      'tmp',
      'vendor',
      'venv',
    ]);

    /** How deep a scan descends below the workspace root. */
    const SCAN_MAX_DEPTH = 4;

    /** Hard ceiling on the directory listings one scan may issue. */
    const SCAN_MAX_DIRS = 400;

    /** Resolved tracking-file locations, per Session, so a refresh need not rescan. */
    const locatedSprint = new Map();

    /**
     * Join a workspace-relative directory and a child name.
     * @param dir - the directory, or the empty string for the workspace root.
     * @param name - the child's basename.
     * @returns the workspace-relative path.
     */
    function under(dir, name) {
      return dir === '' ? name : `${dir}/${name}`;
    }

    /**
     * The directory part of a workspace-relative path.
     * @param path - a workspace-relative path.
     * @returns the directory, or the empty string for a root-level file.
     */
    function dirOf(path) {
      const at = path.lastIndexOf('/');
      return at === -1 ? '' : path.slice(0, at);
    }

    /**
     * Whether a workspace-relative path names a readable regular file.
     * @param stat - the injected workspace stat reader.
     * @param path - the workspace-relative path to test.
     * @param signal - caller cancellation.
     * @returns true when the file is there.
     */
    async function fileExists(stat, path, signal) {
      try {
        return (await stat(path, signal)).ok;
      } catch {
        return false;
      }
    }

    /**
     * Probe the conventional BMAD locations, most likely first.
     * @param readers - the injected workspace readers.
     * @param signal - caller cancellation.
     * @returns the tracking file's path, or null when no candidate is there.
     */
    async function probeCandidates({ stat }, signal) {
      for (const dir of SPRINT_CANDIDATES) {
        for (const name of SPRINT_FILENAMES) {
          const path = under(dir, name);
          if (await fileExists(stat, path, signal)) return path;
        }
      }
      return null;
    }

    /**
     * Walk the workspace breadth-first for a tracking file, because a project may
     * keep BMAD output anywhere. The walk is bounded three ways -- depth, a
     * directory budget, and a skip list for build and vendored trees -- so a large
     * or unfamiliar workspace still settles instead of walking forever.
     * @param readers - the injected workspace readers.
     * @param signal - caller cancellation.
     * @returns the tracking file's path, or null when the workspace has none.
     */
    async function scanForSprint({ list }, signal) {
      const queue = [{ dir: '', depth: 0 }];
      let visited = 0;

      while (queue.length > 0 && visited < SCAN_MAX_DIRS) {
        const { dir, depth } = queue.shift();
        visited += 1;

        let listing;
        try {
          listing = await list(dir, signal);
        } catch {
          continue;
        }

        for (const name of SPRINT_FILENAMES) {
          if (
            listing.some((entry) => entry.type === 'file' && entry.name === name)
          ) {
            return under(dir, name);
          }
        }
        if (depth >= SCAN_MAX_DEPTH) continue;

        for (const entry of listing) {
          if (entry.type !== 'directory' || SCAN_SKIP.has(entry.name)) continue;
          queue.push({ dir: under(dir, entry.name), depth: depth + 1 });
        }
      }

      return null;
    }

    /**
     * Locate the tracking file in the Session's selected workspace: the cached
     * answer while it still holds, then the conventional locations, then a
     * bounded scan.
     * @param readers - the injected workspace readers.
     * @param sessionId - the Session whose workspace to search.
     * @param signal - caller cancellation.
     * @returns the tracking file's path, or null when the workspace has none.
     */
    async function locateSprintPath(readers, sessionId, signal) {
      const cached = locatedSprint.get(sessionId);
      if (
        cached !== undefined &&
        (await fileExists(readers.stat, cached, signal))
      ) {
        return cached;
      }

      const found =
        (await probeCandidates(readers, signal)) ??
        (await scanForSprint(readers, signal));

      if (found === null) locatedSprint.delete(sessionId);
      else locatedSprint.set(sessionId, found);
      return found;
    }


    /**
     * Story lanes, in the order the board draws them: what is being worked on
     * first, then what is waiting on review, then what is finished, and the
     * not-yet-started stories last. A lane still only appears when a story is
     * actually in that status, so an empty block costs nothing.
     */
    const STATUS_ORDER = [
      'in-progress',
      'review',
      'done',
      'ready-for-dev',
      'backlog',
    ];


    /**
     * Status -> the badge tone that reads it, drawn from the host's own tag
     * palette: green for finished, amber for something wanting attention, blue
     * for work in flight, and the neutral platform fill for a plain fact. The
     * action and retrospective statuses live here too, so one lookup covers
     * every badge the board draws.
     */
    const STATUS_TONE = {
      backlog: 'neutral',
      'ready-for-dev': 'neutral',
      'in-progress': 'info',
      review: 'warning',
      done: 'success',
      open: 'warning',
      optional: 'neutral',
    };

    /**
     * The tone for a status, defaulting to the neutral fill.
     * @param status - a story, action, or retrospective status.
     * @returns the tag tone.
     */
    function toneOf(status) {
      return STATUS_TONE[status] ?? 'neutral';
    }

    /** The colour an epic with no recognised status falls back to. */

    /** The marker a fold header uses while its body is open and closed. */

    /** How many lines one `workspaceFiles.read` page asks for. */
    const PAGE_LINES = 2000;

    // --- File addressing ---------------------------------------------------

    /** Scheme and type prefix of every file address the Sidebar resolves. */



    // --- Reading -----------------------------------------------------------

    /**
     * Read a whole text file, one page at a time, following `eof`.
     * @param face - the `remote.workspaceFiles` namespace.
     * @param sessionId - scope id the Host resolves the workspace from.
     * @param path - workspace-relative or absolute path.
     * @param signal - caller cancellation.
     * @returns the file's complete text.
     */
    async function readWholeFile(face, sessionId, path, signal) {
      const pages = [];
      let offset = 1;
      for (let guard = 0; guard < 40; guard += 1) {
        const result = await face.read(
          sessionId,
          path,
          { offset, limit: PAGE_LINES },
          signal,
        );
        if (!result.ok) throw result.error;
        const page = result.value;
        if (page.lines > 0 && page.text !== '') pages.push(page.text);
        if (page.eof || page.lines <= 0) break;
        offset += page.lines;
      }
      return pages.join('\n');
    }

    // --- Parsing -----------------------------------------------------------

    /**
     * Whether a scalar's quoting is still open, so the next line continues it.
     * @param value - the raw accumulated value.
     * @returns true while an odd number of double quotes has been seen.
     */
    function quotesOpen(value) {
      let count = 0;
      for (let index = 0; index < value.length; index += 1) {
        if (value[index] === '"') count += 1;
      }
      return count % 2 === 1;
    }

    /**
     * Strip one layer of matching quotes and surrounding space.
     * @param value - a raw scalar.
     * @returns the scalar's text.
     */
    function unquote(value) {
      const trimmed = String(value ?? '').trim();
      if (trimmed.length >= 2) {
        const first = trimmed[0];
        const last = trimmed[trimmed.length - 1];
        if (
          (first === '"' && last === '"') ||
          (first === "'" && last === "'")
        ) {
          return trimmed.slice(1, -1);
        }
      }
      return trimmed;
    }

    /** `key: value` at column zero: one document-level entry. */
    const TOP_LEVEL = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;
    /** `  key: value` under `development_status`. */
    const STATUS_ENTRY = /^\s+([^\s:#][^:]*):[ \t]*(.*)$/;
    /** `  - key: value` opening one `action_items` element. */
    const ACTION_START = /^\s*-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/;
    /** `  key: value` continuing the current `action_items` element. */
    const ACTION_FIELD = /^\s+([A-Za-z_][\w-]*):[ \t]*(.*)$/;
    /** Any line that is indented, so it belongs to the block above it. */
    const INDENTED = /^\s/;

    /**
     * Whether a document line carries no content.
     * @param line - one raw line.
     * @returns true when the reader should skip it.
     */
    function isSkippable(line) {
      const trimmed = line.trim();
      return trimmed === '' || trimmed.startsWith('#');
    }

    /**
     * Read the `development_status` map body, a flat run of indented entries.
     * @param lines - the document's lines.
     * @param start - index of the first body line.
     * @param into - the map to fill.
     * @returns the index just past the block.
     */
    function readStatusMap(lines, start, into) {
      let index = start;
      while (index < lines.length) {
        const line = lines[index];
        if (isSkippable(line)) {
          index += 1;
          continue;
        }
        if (!INDENTED.test(line)) break;
        const entry = STATUS_ENTRY.exec(line);
        if (entry !== null) into[entry[1].trim()] = unquote(entry[2]);
        index += 1;
      }
      return index;
    }

    /**
     * Fold one `action_items` line into the element being read. A quoted value
     * that has not closed yet keeps absorbing the lines under it.
     * @param state - the reader's cursor, current element, and open field.
     * @param line - the line to consume.
     * @param into - the list that completed elements are pushed to.
     */
    function consumeActionLine(state, line, into) {
      const { item, field } = state;
      if (item !== null && field !== null && quotesOpen(item[field])) {
        item[field] = `${item[field]} ${line.trim()}`.trim();
        return;
      }

      const start = ACTION_START.exec(line);
      if (start !== null) {
        if (item !== null) into.push(item);
        state.item = { [start[1]]: start[2].trim() };
        state.field = start[1];
        return;
      }

      const next = ACTION_FIELD.exec(line);
      if (next === null || item === null) return;
      item[next[1]] = next[2].trim();
      state.field = next[1];
    }

    /**
     * Read the `action_items` list body, whose string values fold across lines.
     * @param lines - the document's lines.
     * @param start - index of the first body line.
     * @param into - the list to fill.
     * @returns the index just past the block.
     */
    function readActionItems(lines, start, into) {
      const state = { index: start, item: null, field: null };
      while (state.index < lines.length) {
        const line = lines[state.index];
        if (line.trim() === '') {
          state.index += 1;
          continue;
        }
        if (!INDENTED.test(line)) break;
        consumeActionLine(state, line, into);
        state.index += 1;
      }
      if (state.item !== null) into.push(state.item);
      return state.index;
    }

    /**
     * Unquote one raw `action_items` element into the shape the board reads.
     * @param raw - the element's fields, still quoted as the file spells them.
     * @returns the normalized action item.
     */
    function normalizeAction(raw) {
      return {
        id: unquote(raw.id),
        epic: unquote(raw.epic),
        action: unquote(raw.action),
        owner: unquote(raw.owner),
        status: unquote(raw.status) || 'open',
        ref: unquote(raw.ref),
      };
    }

    /**
     * Read the tracked subset of `sprint-status.yaml`: the scalar header, the
     * flat `development_status` map, and the folded `action_items` list. This is
     * deliberately not a general YAML parser -- it accepts exactly the shape the
     * BMAD sprint-planning skill writes, and ignores anything else.
     * @param text - the file's text.
     * @returns the header scalars, status map, and action items.
     */
    function parseSprintStatus(text) {
      const lines = String(text).split(/\r?\n/);
      const meta = {};
      const status = {};
      const actions = [];
      let index = 0;

      while (index < lines.length) {
        const line = lines[index];
        if (isSkippable(line)) {
          index += 1;
          continue;
        }
        const top = TOP_LEVEL.exec(line);
        if (top === null) {
          index += 1;
          continue;
        }
        if (top[1] === 'development_status') {
          index = readStatusMap(lines, index + 1, status);
          continue;
        }
        if (top[1] === 'action_items') {
          index = readActionItems(lines, index + 1, actions);
          continue;
        }
        meta[top[1]] = unquote(top[2]);
        index += 1;
      }

      return { meta, status, actions: actions.map(normalizeAction) };
    }

    /** `## <heading>` opening one legacy ledger entry. */
    const LEDGER_HEADING = /^##[ \t]+(.+?)[ \t]*$/;
    /** `**Source:** value` and its two siblings. */
    const LEDGER_LABEL = /^\*\*(Source|File|Description):\*\*[ \t]*(.*)$/;
    /** A bullet block's own `- key:` line, or an indented `key:` sibling. */
    const LEDGER_FIELD = /^(?:-[ \t]+|[ \t]+)([A-Za-z_]+):[ \t]*(.*)$/;
    /** The `D<n>` number a legacy heading carries. */
    const LEDGER_ID = /^(D\d+)\s*:/;

    /**
     * Start one empty ledger entry.
     * @param heading - the entry's `## ` heading text, when it had one.
     * @returns a blank entry.
     */
    function blankLedgerEntry(heading) {
      const text = heading ?? '';
      const id = LEDGER_ID.exec(text);
      return {
        id: id === null ? '' : id[1],
        title: text.replace(/^D\d+\s*:[ \t]*/, '').trim(),
        source: '',
        file: '',
        description: '',
        spec: '',
        summary: '',
        evidence: '',
        bullet: false,
      };
    }

    /**
     * Whether a `source_spec` bullet opens a new entry rather than continuing
     * one: a bullet block is always an entry of its own, and a heading that
     * already carries its own metadata has been closed by the block above it.
     * @param entry - the entry being read.
     * @returns true when the block starts its own entry.
     */
    function closesLedgerEntry(entry) {
      return entry.bullet || entry.spec !== '' || entry.description !== '';
    }

    /**
     * Apply one bullet-block field to its entry.
     * @param entry - the entry being read.
     * @param key - the field name.
     * @param value - the raw field value.
     */
    function applyLedgerField(entry, key, value) {
      if (key === 'source_spec') {
        entry.bullet = true;
        const spec = value.replace(/`/g, '').trim();
        entry.spec = spec === 'none' ? '' : spec;
        return;
      }
      if (key === 'summary') {
        entry.summary = value.trim();
        if (entry.title === '') entry.title = entry.summary;
        return;
      }
      if (key === 'evidence') entry.evidence = value.trim();
    }

    /**
     * Consume one ledger line.
     * @param current - the entry being read.
     * @param line - the line to consume.
     * @returns the entry to carry forward, plus any entry this line closed.
     */
    function consumeLedgerLine(current, line) {
      const heading = LEDGER_HEADING.exec(line);
      if (heading !== null) {
        return { entry: blankLedgerEntry(heading[1]), closed: current };
      }

      const labelled = LEDGER_LABEL.exec(line);
      if (labelled !== null) {
        current[labelled[1].toLowerCase()] = labelled[2].trim();
        return { entry: current, closed: null };
      }

      const field = LEDGER_FIELD.exec(line);
      if (field === null) return { entry: current, closed: null };

      if (field[1] === 'source_spec' && closesLedgerEntry(current)) {
        const entry = blankLedgerEntry(null);
        applyLedgerField(entry, field[1], field[2]);
        return { entry, closed: current };
      }

      applyLedgerField(current, field[1], field[2]);
      return { entry: current, closed: null };
    }

    /**
     * Read `deferred-work.md`. The ledger mixes two shapes on purpose: the older
     * hand-written `## D<n>: <title>` block carrying `**Source:**`/`**File:**`/
     * `**Description:**` lines, and the shape the build workflow appends for a
     * newly split goal -- a bare `- source_spec:`/`summary:`/`evidence:` bullet
     * block that deliberately has no heading and numbers nothing. Each is one
     * entry, so a bullet block always opens a new one.
     * @param text - the file's text.
     * @returns the deferred entries, in file order.
     */
    function parseDeferredWork(text) {
      const items = [];
      let current = null;

      for (const line of String(text).split(/\r?\n/)) {
        if (current === null) {
          const heading = LEDGER_HEADING.exec(line);
          if (heading !== null) current = blankLedgerEntry(heading[1]);
          continue;
        }
        const step = consumeLedgerLine(current, line);
        if (step.closed !== null) items.push(step.closed);
        current = step.entry;
      }

      if (current !== null) items.push(current);
      return items.filter((item) => item.title !== '');
    }

    // --- Model -------------------------------------------------------------

    /**
     * Turn a story slug into display text.
     * @param slug - a kebab-case slug.
     * @returns the slug with dashes as spaces and words capitalised.
     */
    function humanize(slug) {
      return String(slug)
        .split('-')
        .filter((word) => word !== '')
        .map((word) =>
          /^\d+$/.test(word) ? word : word[0].toUpperCase() + word.slice(1),
        )
        .join(' ');
    }

    /** An epic rollup key. */
    const EPIC_KEY = /^epic-(\d+)$/;
    /** An epic retrospective key. */
    const RETRO_KEY = /^epic-(\d+)-retrospective$/;
    /** A story key, `<epic>-<index>-<truncated slug>`. */
    const STORY_KEY = /^(\d+)-(\d+)-(.+)$/;

    /**
     * Split the `development_status` map into its three kinds of row.
     * @param status - the key -> status map.
     * @returns the epic rollups, the stories, and epic number -> retrospective status.
     */
    function classifyStatus(status) {
      const epics = [];
      const stories = [];
      const retrospectives = new Map();

      for (const [key, value] of Object.entries(status)) {
        const epic = EPIC_KEY.exec(key);
        if (epic !== null) {
          epics.push({
            number: Number(epic[1]),
            key,
            status: value,
            retro: '',
            total: 0,
            done: 0,
          });
          continue;
        }
        const retro = RETRO_KEY.exec(key);
        if (retro !== null) {
          retrospectives.set(Number(retro[1]), value);
          continue;
        }
        const story = STORY_KEY.exec(key);
        if (story !== null) {
          stories.push({
            key,
            epic: Number(story[1]),
            index: Number(story[2]),
            slug: story[3],
            status: value,
            file: null,
            title: humanize(story[3]),
            deferred: 0,
          });
        }
      }

      return { epics, stories, retrospectives };
    }

    /**
     * The spec slugs a story-directory listing holds.
     * @param entries - the directory listing, if it was read.
     * @returns the names with the `spec-` prefix and `.md` suffix removed.
     */
    function specSlugsOf(entries) {
      return (entries ?? [])
        .filter(
          (entry) =>
            entry.type === 'file' &&
            entry.name.startsWith('spec-') &&
            entry.name.endsWith('.md'),
        )
        .map((entry) => entry.name.slice('spec-'.length, -'.md'.length));
    }

    /**
     * A story key is a truncated prefix of its spec file's slug, so the shortest
     * slug that starts with the key is that story's spec.
     * @param slugs - every spec slug in the directory.
     * @param key - the story's truncated key.
     * @returns the matching slug, or null when the story has no spec yet.
     */
    function bestSpecSlug(slugs, key) {
      const pick = (matches) => {
        let best = null;
        for (const slug of slugs) {
          if (!matches(slug)) continue;
          if (best === null || slug.length < best.length) best = slug;
        }
        return best;
      };
      // Literal prefix first, exactly as before.
      const literal = pick((slug) => slug === key || slug.startsWith(key));
      if (literal !== null) return literal;
      // Fallback for a truncated key. The tracking file caps a slug at 64
      // characters, and the cut can land inside a hyphenated token and drop the
      // separator: `...-resultsc` against the file's `...-results-card-...`. So
      // compare with the separators removed. Story 1-5 in the reference repo is
      // unresolvable without this -- its spec never linked.
      const wanted = normalizeSlug(key);
      return pick((slug) => normalizeSlug(slug).startsWith(wanted));
    }

    /** A slug reduced to letters and digits, for separator-insensitive matching. */
    function normalizeSlug(value) {
      return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    /**
     * Point every story at its spec file and give it a full display title.
     * @param stories - the story list, mutated in place.
     * @param entries - the story directory's listing.
     */
    function linkStoriesToSpecs(stories, entries, storyDir) {
      const slugs = specSlugsOf(entries);
      for (const story of stories) {
        const best = bestSpecSlug(slugs, story.key);
        if (best === null) continue;
        story.file = under(storyDir, `spec-${best}.md`);
        story.title = humanize(best.replace(/^\d+-\d+-/, ''));
      }
    }

    /**
     * Fill in each epic's retrospective status and story progress.
     * @param epics - the epic list, mutated in place.
     * @param stories - every story.
     * @param retrospectives - epic number -> retrospective status.
     */
    function summarizeEpics(epics, stories, retrospectives) {
      for (const epic of epics) {
        epic.retro = retrospectives.get(epic.number) ?? '';
        const own = stories.filter((story) => story.epic === epic.number);
        epic.total = own.length;
        epic.done = own.filter((story) => story.status === 'done').length;
        // The Status view badges each card with its epic, and colours that badge
        // by the epic's state, so every story carries its epic's status.
        for (const story of own) story.epicStatus = epic.status;
      }
    }

    /**
     * Count stories per status, keeping a slot for every known status.
     * @param stories - every story.
     * @returns status -> count.
     */
    function countByStatus(stories) {
      const counts = {};
      for (const name of STATUS_ORDER) counts[name] = 0;
      for (const story of stories) {
        counts[story.status] = (counts[story.status] ?? 0) + 1;
      }
      return counts;
    }

    /**
     * Connect each deferred entry to the story whose spec it names, and count the
     * entries hanging off each story. A ledger entry's `source_spec` is the same
     * workspace path a story card opens, so this link is exact rather than a
     * guess from prose. An entry naming a freeform spec -- one with no
     * `<epic>-<index>-` prefix -- belongs to no story and keeps a null link.
     * @param deferred - the deferred entries, annotated in place.
     * @param stories - every story, already linked to its spec file.
     */
    function linkDeferredToStories(deferred, stories) {
      const byFile = new Map();
      for (const story of stories) {
        if (story.file !== null) byFile.set(story.file, story);
      }
      for (const item of deferred) {
        const story = item.spec === '' ? undefined : byFile.get(item.spec);
        item.story = story ?? null;
        if (story !== undefined) story.deferred += 1;
      }
    }

    /**
     * Fold the parsed files into the board's model.
     * @param sprintText - `sprint-status.yaml` contents.
     * @param deferredText - `deferred-work.md` contents, or empty.
     * @param entries - the story directory's listing, or empty.
     * @returns the board model.
     */
    function buildModel(sprintText, deferredText, entries, sprintPath) {
      const sprint = parseSprintStatus(sprintText);
      const deferred = parseDeferredWork(deferredText);
      const { epics, stories, retrospectives } = classifyStatus(sprint.status);
      // The tracking file names the directory its spec files live in; only when
      // it is silent do we fall back to sitting beside the tracking file.
      const storyDir = (sprint.meta.story_location ?? '').trim() || dirOf(sprintPath);

      stories.sort(
        (left, right) => left.epic - right.epic || left.index - right.index,
      );
      linkStoriesToSpecs(stories, entries, storyDir);
      summarizeEpics(epics, stories, retrospectives);
      linkDeferredToStories(deferred, stories);

      const counts = countByStatus(stories);
      const openActions = sprint.actions.filter(
        (item) => item.status !== 'done',
      );

      return {
        project: sprint.meta.project ?? '',
        lastUpdated: sprint.meta.last_updated ?? '',
        epics,
        stories,
        counts,
        doneStories: counts.done ?? 0,
        totalStories: stories.length,
        openActions,
        doneActionCount: sprint.actions.length - openActions.length,
        deferred,
      };
    }

    /**
     * BMAD configuration -- where the modules say their artefacts live.
     *
     * BMAD lets a project move its output folders, so a board that assumes a layout
     * is wrong the moment someone changes one. `_bmad/config.toml` declares the real
     * paths per module, and that declaration is the primary mechanism: the
     * conventional-candidate probe and the bounded scan stay, but only as the
     * fallback for when config is absent or silent.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/config
     */

    /** The token BMAD writes where the project root belongs. */
    const PROJECT_ROOT = /\{project-root\}\/?/g

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
     * Parse the module sections of a `config.toml`.
     *
     * A deliberately small reader, not a TOML implementation: BMAD's config is flat
     * `[modules.<name>]` tables of string values, and a full parser would be a
     * dependency the bundle does not have. Anything it cannot understand it skips --
     * a path it fails to read becomes a missing declaration, never a wrong one.
     *
     * @param {string} text - the contents of `_bmad/config.toml`.
     * @returns {Map<string, Map<string, string>>} module name -> key -> value.
     */
    function parseBmadConfig(text) {
      const modules = new Map()
      let current = null

      for (const raw of String(text).split('\n')) {
        const line = raw.replace(/#.*$/, '').trim()
        if (line === '') continue

        const section = /^\[modules\.([A-Za-z0-9_-]+)\]$/.exec(line)
        if (section !== null) {
          current = new Map()
          modules.set(section[1], current)
          continue
        }
        if (/^\[/.test(line)) {
          current = null
          continue
        }
        if (current === null) continue

        const entry = /^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"$/.exec(line)
        if (entry !== null) current.set(entry[1], entry[2])
      }

      return modules
    }

    /**
     * The artefact locations the board reads, in the order it needs them.
     *
     * @param {Map<string, Map<string, string>>} modules - from {@link parseBmadConfig}.
     * @returns {{implementation: string|null, planning: string|null, knowledge: string|null}} workspace-relative paths, or null when undeclared.
     */
    function artifactPaths(modules) {
      const bmm = modules.get('bmm') ?? new Map()
      const pick = (key) => {
        const value = bmm.get(key)
        return value === undefined || value === '' ? null : resolveProjectPath(value)
      }
      return {
        implementation: pick('implementation_artifacts'),
        planning: pick('planning_artifacts'),
        knowledge: pick('project_knowledge'),
      }
    }

    /**
     * Detectors -- the gaps board's whole reason to exist.
     *
     * Every detector is a pure function over the model plus whatever file content
     * the shell has already read. Two rules hold throughout:
     *
     *   1. **Risks are derived.** Nothing here is written back, so nothing here can
     *      be silently overwritten by the framework's own writer.
     *   2. **Unverifiable is not clean.** A check that could not be evaluated
     *      returns an `unverifiable` entry rather than nothing, because a board
     *      showing nothing must never be confusable with a board that cannot see.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/detect
     */

    /** Severity vocabulary, borrowed from bmad-loop's deferred ledger. */
    const SEVERITY = ['critical', 'high', 'medium', 'low']

    /**
     * A gap: something the evidence contradicts.
     * @typedef {object} Gap
     * @property {string} id - detector id, e.g. `B1`
     * @property {string} title - what kind of problem this is
     * @property {string} severity - one of {@link SEVERITY}
     * @property {string} subject - the key the reader recognises, e.g. a story key
     * @property {string} subjectKind - `story` | `epic` | `requirement` | `area`
     * @property {string} evidence - what was observed, in one sentence
     * @property {object} action - what to do about it
     * @property {string} action.kind - `command` | `prompt` | `open`
     * @property {string} action.label - the button's words
     * @property {string} action.payload - the string to copy, or the path to open
     */

    /**
     * A check that could not be evaluated. Never rendered as clean.
     * @typedef {object} Unverifiable
     * @property {string} id - detector id
     * @property {string} subject - what could not be checked
     * @property {string} reason - why, naming the artefact that was missing or unreadable
     * @property {object} action - the prompt that would find out
     */

    const storyLabel = (story) => story.key

    /**
     * **B1 -- done but owing.** A story is `done` while deferred entries still name
     * its spec. Deferred work is, by definition, work that was *not* done, so the
     * tracking file asserts a completeness the evidence contradicts.
     *
     * Fires on real data: story 3-2 in the reference repo.
     *
     * @param {object} model - the model from `buildModel`.
     * A deferral that attributes to no story is *not* claimed here -- an unattributed
     * entry is the orphan-deferred detector's business, and guessing which story owns
     * it would be exactly the silent wrongness this board exists to catch.
     *
     * @returns {{gaps: Gap[], unverifiable: Unverifiable[]}}
     */
    function detectDoneButOwing(model) {
      const gaps = []
      const unverifiable = []

      for (const story of model.stories) {
        if (story.status !== 'done') continue
        // `linkDeferredToStories` attaches the story OBJECT, not its key
        const owed = (model.deferred ?? []).filter((item) => item.story?.key === story.key)
        if (owed.length === 0) continue

        gaps.push({
          id: 'B1',
          title: 'done but owing',
          severity: 'high',
          subject: story.key,
          subjectKind: 'story',
          evidence:
            `marked done, yet ${owed.length} deferred entr${owed.length === 1 ? 'y' : 'ies'} ` +
            `still name${owed.length === 1 ? 's' : ''} this story's spec`,
          action: {
            kind: 'command',
            label: 'Decide the deferrals',
            payload: `/bmad-correct-course -- story ${story.key} is done with ${owed.length} open deferral(s)`,
          },
        })
      }

      return { gaps, unverifiable }
    }

    /**
     * **B3 -- review patches never applied.** A story is `done` while unticked
     * `[Review][Patch]` checkboxes remain in its file. Those are findings a review
     * triaged into work and nobody did.
     *
     * This began as a loose proxy for "a stage was skipped" and inspection made it a
     * rule: story 1-5 in the reference repo carries exactly two, while story 3-2 has
     * 53 checkboxes and none unticked. So the tag is the signal -- not unticked boxes
     * in general, which would flag every optional task anyone ever skipped.
     *
     * @param {object} model - the model from `buildModel`.
     * @param {(path: string) => string|null|undefined} readStory - story-file text,
     *   `null` when the file is known unreadable, `undefined` when not fetched.
     * @returns {{gaps: Gap[], unverifiable: Unverifiable[]}}
     */
    function detectReviewPatches(model, readStory) {
      const gaps = []
      const unverifiable = []
      const PATTERN = /^\s*- \[ \]\s*\[Review\]\[Patch\]\s*(.*)$/

      for (const story of model.stories) {
        if (story.status !== 'done') continue
        if (story.file === null) {
          unverifiable.push({
            id: 'B3',
            subject: story.key,
            reason: 'no story file resolves for this key, so its review state cannot be read',
            action: {
              kind: 'prompt',
              label: 'Find the missing story file',
              payload:
                `/bmad-sprint-planning -- story ${story.key} is marked done but no story file resolves for it under the ` +
                'declared story_location. Find out whether the file was never created, was renamed, ' +
                'or lives elsewhere, and tell me which.',
            },
          })
          continue
        }

        const text = readStory(story.file)
        if (text === null || text === undefined) {
          unverifiable.push({
            id: 'B3',
            subject: story.key,
            reason: `${story.file} could not be read`,
            action: {
              kind: 'prompt',
              label: 'Investigate the unreadable story file',
              payload:
                `/bmad-sprint-planning -- I cannot read ${story.file} (story ${story.key}, marked done), so I cannot tell ` +
                'whether its review findings were applied. Find out why it is unreadable and what ' +
                'its review state actually is.',
            },
          })
          continue
        }

        const pending = text
          .split('\n')
          .map((line) => PATTERN.exec(line))
          .filter((m) => m !== null)
          .map((m) => m[1].replace(/\s*\[[^\]]*\]\s*$/, '').trim())

        if (pending.length === 0) continue

        gaps.push({
          id: 'B3',
          title: 'review patches never applied',
          severity: 'high',
          subject: story.key,
          subjectKind: 'story',
          // Phrased like B1's: what was observed, in one sentence, without naming a
          // single item out of several. A slice of the first one read as a truncation
          // mid-word and told the reader less than the count does.
          evidence:
            `marked done, yet ${pending.length} unticked entr` +
            `${pending.length === 1 ? 'y' : 'ies'} in the spec`,
          action: {
            kind: 'command',
            label: 'Apply or reject the patches',
            payload:
              `/bmad-code-review -- ${pending.length} [Review][Patch] item(s) triaged on ` +
              `${story.key} were never applied`,
          },
        })
      }

      return { gaps, unverifiable }
    }

    /**
     * Run every detector and merge the results, worst first.
     *
     * @param {object} model - the model from `buildModel`.
     * @param {object} [files] - content the shell has already read.
     * @param {(path: string) => string|null|undefined} [files.readStory] - story-file reader.
     * @returns {{gaps: Gap[], unverifiable: Unverifiable[]}}
     */
    function detect(model, files = {}) {
      const readStory = files.readStory ?? (() => undefined)

      const results = [detectDoneButOwing(model), detectReviewPatches(model, readStory)]

      const gaps = results.flatMap((r) => r.gaps)
      const unverifiable = results.flatMap((r) => r.unverifiable)
      const rank = (s) => SEVERITY.indexOf(s)

      gaps.sort((a, b) => rank(a.severity) - rank(b.severity) || a.subject.localeCompare(b.subject))
      return { gaps, unverifiable }
    }

    /**
     * Planning evidence: requirement coverage and the next-action ladder.
     *
     * Both read material BMAD already writes. The coverage map lives in
     * `planning-artifacts/epics.md`; the ladder is the framework's own six-rule
     * recommendation, rendered rather than reinvented -- `{skill, story_key, reason}`
     * is the canonical status view's fourth element, and inventing a rival opinion
     * about priority is exactly what the research said not to do.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/plan
     */

    /** Statuses in the order the framework ranks them, worst-first for action. */
    const LADDER = [
      {
        status: 'in-progress',
        skill: 'bmad-build',
        reason: 'it is in progress -- resume it',
        ask: 'Resume {}, which is in progress, and take it to review.',
      },
      {
        status: 'review',
        skill: 'bmad-code-review',
        reason: 'the implementation is complete and awaiting review',
        ask: 'Review {}, whose implementation is complete and waiting.',
      },
      {
        status: 'ready-for-dev',
        skill: 'bmad-build',
        reason: 'it is ready to start',
        ask: 'Start {}, which is ready for development.',
      },
      {
        status: 'backlog',
        skill: 'bmad-build',
        reason: 'it is the next unstarted story',
        ask: 'Start {}, the next unstarted story.',
      },
    ]

    /**
     * Parse the FR Coverage Map from an `epics.md`.
     *
     * The map is a bullet list, `- FRn (name): Epic 1, Epic 2 (Divider), ...`, and it
     * is genuinely many-to-many: three requirements in the reference repo cross all
     * four epics. The epic annotations inside parentheses are deliberately ignored --
     * only the epic *numbers* matter for coverage.
     *
     * @param {string} text - the contents of `epics.md`, or any text holding the map.
     * @returns {Map<string, {name: string, epics: number[]}>} keyed by `FRn`.
     */
    function parseFrCoverage(text) {
      const coverage = new Map()
      const heading = /^#{2,4}[ \t]*FR Coverage Map[ \t]*$/m.exec(text)
      if (heading === null) return coverage

      // the section runs to the next heading of the same or a higher level
      const rest = text.slice(heading.index + heading[0].length)
      const next = /^#{1,4}[ \t]+\S/m.exec(rest)
      const section = next === null ? rest : rest.slice(0, next.index)

      const LINE = /^[ \t]*[-*][ \t]+(FR\d+)[ \t]*\((.+)\)[ \t]*:[ \t]*(.+)$/gm
      for (const [, id, name, targets] of section.matchAll(LINE)) {
        const epics = [...targets.matchAll(/Epic[ \t]+(\d+)/gi)].map((m) => Number(m[1]))
        coverage.set(id, { name: name.trim(), epics: [...new Set(epics)].sort((a, b) => a - b) })
      }
      return coverage
    }

    /** The requirement classes BMAD inventories, and the prefix each uses. */
    const REQUIREMENT_CLASSES = [
      { code: 'FR', heading: 'Functional Requirements', label: 'functional' },
      { code: 'NFR', heading: 'NonFunctional Requirements', label: 'non-functional' },
      { code: 'AR', heading: 'Additional Requirements', label: 'additional' },
      { code: 'UX-DR', heading: 'UX Design Requirements', label: 'UX design' },
    ]

    /**
     * Every requirement the inventory declares, by class.
     *
     * `epics.md` inventories four classes and only functional requirements get a
     * coverage map. Reading just the map understates the project: on the reference
     * repository it reports 17 where the inventory holds 35, so the bar measures a
     * little over half the requirements and says nothing about the rest.
     *
     * The inventory form is `PREFIX<n>: Name -- description`, one per line, under a
     * `### <heading>` section.
     *
     * @param {string} text - the contents of `epics.md`.
     * @returns {Map<string, {id: string, name: string}[]>} keyed by class code.
     */
    function parseRequirementInventory(text) {
      const inventory = new Map()
      for (const { code, heading } of REQUIREMENT_CLASSES) {
        const start = new RegExp(`^#{2,4}[ \\t]*${heading}[ \\t]*$`, 'm').exec(text)
        if (start === null) {
          inventory.set(code, [])
          continue
        }
        const rest = text.slice(start.index + start[0].length)
        const next = /^#{1,4}[ \t]+\S/m.exec(rest)
        const section = next === null ? rest : rest.slice(0, next.index)

        const item = new RegExp(`^[ \\t]*(${code}\\d+)[ \\t]*:[ \\t]*(.+?)[ \\t]*$`, 'gm')
        inventory.set(
          code,
          [...section.matchAll(item)].map((m) => ({
            id: m[1],
            // Three classes separate a short name from the description with an
            // em dash; the functional list carries no separator at all, so the
            // first clause stands in and the UI truncates what is left.
            name: m[2].split(/\s+(?:--|\u2014)\s+/)[0].trim().slice(0, 120),
            // The whole statement, kept because the components a requirement is
            // about are as often named after the dash as before it -- reading only
            // the short name left four UX requirements looking undelivered.
            text: m[2].trim(),
          })),
        )
      }
      return inventory
    }

    /**
     * The requirement bar: how many requirements the epics have actually delivered.

     *
     * A requirement is **delivered** only when *every* epic that carries it is done.
     * That is the whole point of the second bar: the story count can read 80% while
     * most requirements sit half-built across unfinished epics.
     *
     * @param {Map<string, {name: string, epics: number[]}>} coverage - from {@link parseFrCoverage}.
     * @param {Array<{key: string, status: string}>} epics - the model's epics.
     * @returns {{total: number, delivered: number, partial: object[], unstarted: object[], unverifiable: string|null}}
     */
    function requirementBar(coverage, epics, inventory) {
      if (coverage.size === 0) {
        return {
          total: 0,
          delivered: 0,
          partial: [],
          unstarted: [],
          unverifiable: 'no FR Coverage Map found, so requirement delivery cannot be measured',
        }
      }

      const unowned = inventory === undefined ? { count: 0, byClass: [] } : unmappedRequirements(inventory, coverage)
      const declared = [...(inventory?.values() ?? [])].reduce((n, list) => n + list.length, 0)

      const state = new Map(epics.map((e) => [Number(e.key.replace('epic-', '')), e.status]))
      const partial = []
      const unstarted = []
      let delivered = 0

      for (const [id, { name, epics: carriers }] of coverage) {
        const known = carriers.filter((n) => state.has(n))
        if (known.length !== carriers.length || known.length === 0) {
          partial.push({ id, name, epics: carriers, done: [], unknown: true })
          continue
        }
        const done = known.filter((n) => state.get(n) === 'done')
        if (done.length === known.length) delivered += 1
        else if (done.length > 0) partial.push({ id, name, epics: known, done })
        else unstarted.push({ id, name, epics: known })
      }

      return {
        total: coverage.size,
        delivered,
        partial,
        unstarted,
        unverifiable: null,
        unmapped: unowned.count,
        unmappedByClass: unowned.byClass,
        declared: declared === 0 ? coverage.size : declared,
      }
    }

    /**
     * Requirements the inventory declares but no coverage map claims.
     *
     * These are the honest remainder: inventoried, unowned by any epic, and cited by
     * no story, so nothing can verify whether they were delivered. Reporting only
     * the mapped ones would put a number on the board that reads as complete.
     *
     * @param {Map<string, {id: string, name: string}[]>} inventory - from {@link parseRequirementInventory}.
     * @param {Map<string, {name: string, epics: number[]}>} coverage - from {@link parseFrCoverage}.
     * @returns {{count: number, byClass: {code: string, label: string, items: object[]}[]}}
     */
    function unmappedRequirements(inventory, coverage) {
      const byClass = []
      let count = 0
      for (const { code, label } of REQUIREMENT_CLASSES) {
        const items = (inventory.get(code) ?? []).filter((item) => !coverage.has(item.id))
        if (items.length === 0) continue
        byClass.push({ code, label, items })
        count += items.length
      }
      return { count, byClass }
    }

    const byPosition = (a, b) => a.epic - b.epic || a.index - b.index || a.key.localeCompare(b.key)

    /**
     * The next action, from the framework's own ladder.
     *
     * Returns exactly one answer with its reason. A board that offers three has not
     * answered, which is why this is a single recommendation and not a ranked list.
     *
     * @param {object} model - the model from `buildModel`.
     * @returns {{skill: string, key: string|null, label: string, reason: string}}
     */
    function nextAction(model) {
      const stories = [...model.stories].sort(byPosition)

      for (const rung of LADDER) {
        const match = stories.find((s) => s.status === rung.status)
        if (match !== undefined) {
          return {
            skill: rung.skill,
            key: match.key,
            label: match.title ?? match.key,
            reason: rung.reason,
            // The board cannot emit a runnable command: a skill is invoked through
            // `_bmad/scripts/render_skill.py`, which needs the absolute project root
            // and skill root, and the workspace face exposes neither. So this is a
            // request, and it says so rather than wearing a command's clothes.
            action: {
              kind: 'prompt',
              label: 'Ask an agent to run it',
              payload:
                `/${rung.skill} -- ${rung.ask.replace('{}', match.key)}\n\n` +
                `Story: ${match.key}\nStatus: ${match.status}\n` +
                `The sprint board reads this as the next action: ${rung.reason}.`,
            },
          }
        }
      }

      const openRetro = model.epics.find((e) => e.retro === 'optional')
      if (openRetro !== undefined) {
        return {
          skill: 'bmad-retrospective',
          key: openRetro.key,
          label: openRetro.key,
          reason: 'all stories are done and this retrospective is still open',
          action: {
            kind: 'prompt',
            label: 'Ask an agent to run it',
            payload:
              `/bmad-retrospective -- every story is done and ${openRetro.key} is still open.\n\n` +
              'Run the retrospective and record its verdict.',
          },
        }
      }

      return { skill: null, key: null, label: '', reason: 'every story is done', action: null }
    }

    /**
     * The two bars. Requirements never shrink their denominator when something
     * cannot be verified -- an unknown counts against the number, so a board cannot
     * improve its score by going blind.
     *
     * @param {object} model - the model from `buildModel`.
     * @param {object} requirements - the result of {@link requirementBar}.
     * @returns {{stories: object, requirements: object}}
     */
    function bars(model, requirements) {
      const total = model.stories.length
      const done = model.stories.filter((s) => s.status === 'done').length
      return {
        stories: { done, total, unverifiable: 0, percent: total === 0 ? 0 : Math.round((done / total) * 100) },
        requirements: {
          done: requirements.delivered,
          total: requirements.total,
          unverifiable: requirements.unverifiable === null ? 0 : requirements.total,
          // A missing measurement is not a zero. Without a coverage map the bar has
          // no denominator at all, and `0 / 0` would read as "nothing to do" rather
          // than "cannot measure" -- the one confusion this board must not permit.
          noData: requirements.unverifiable !== null,
          // declared but unowned: present so the bar cannot read as complete
          unmapped: requirements.unmapped ?? 0,
          declared: requirements.declared ?? 0,
          percent:
            requirements.total === 0
              ? 0
              : Math.round((requirements.delivered / requirements.total) * 100),
        },
      }
    }

    /**
     * UX evidence: whether the design artefacts and the UX requirements are tied to
     * anything that can verify them.
     *
     * UX is a core requirement class (11 `UX-DR` entries on the reference project),
     * and it produces its own artefacts under `planning-artifacts/ux-designs/`. Both
     * halves can come adrift: a design run nothing downstream claims is a document
     * nobody reads, and a UX requirement no artefact names is one nothing can close.
     * Neither shows up as a gap anywhere else, because the coverage map is
     * functional-only.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/ux
     */

    /** The directory UX runs live in, relative to the declared planning folder. */
    const UX_DIR = 'ux-designs'

    /**
     * The UX design runs present, from a listing of the `ux-designs` directory.
     *
     * A run is a directory; the loose files beside them belong to no run.
     *
     * @param {Array<{type: string, name: string}>} entries - the directory listing.
     * @returns {Array<{name: string, file: string}>} the runs, in name order.
     */
    function parseUxRuns(entries) {
      return (entries ?? [])
        .filter((entry) => entry.type === 'directory')
        .map((entry) => ({ name: entry.name, file: `${UX_DIR}/${entry.name}` }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    /**
     * Which runs the epics document names as an input.
     *
     * The check is deliberately narrow: `epics.md` is the document that turns design
     * into work, so a run it does not cite is a run the plan does not carry forward.
     * That is a weaker claim than "nothing cites it" and a checkable one, which
     * matters more.
     *
     * @param {Array<{name: string, file: string}>} runs - from {@link parseUxRuns}.
     * @param {string} epicsText - the contents of the epics document.
     * @returns {Array<{name: string, file: string, claimed: boolean}>} the runs, marked.
     */
    function linkUxRuns(runs, epicsText) {
      const text = epicsText ?? ''
      return runs.map((run) => ({ ...run, claimed: text.includes(run.name) }))
    }

    /**
     * **U1: a UX design run the plan does not carry.**
     *
     * Fires when the epics document names no such run. It is an orphan in the
     * ordinary sense: produced, and then not built on.
     *
     * @param {Array<{name: string, file: string}>} runs - from {@link parseUxRuns}.
     * @param {string} epicsText - the contents of the epics document.
     * @returns {{gaps: object[], unverifiable: object[]}}
     */
    function detectUxRuns(runs, epicsText) {
      const gaps = []
      const unverifiable = []

      if (runs.length === 0) {
        // No runs at all is only worth saying when the inventory asks for UX work.
        return { gaps, unverifiable }
      }
      if ((epicsText ?? '').trim() === '') {
        unverifiable.push({
          id: 'U1',
          subject: `${runs.length} UX design run${runs.length === 1 ? '' : 's'}`,
          reason: 'the epics document could not be read, so no run can be checked against the plan',
          action: {
            kind: 'prompt',
            label: 'Find the epics document',
            payload:
              '/bmad-correct-course -- the UX design runs exist but the epics document could not be read, so I cannot tell ' +
              'which of them the plan carries forward. Find out whether epics.md moved, and where.',
          },
        })
        return { gaps, unverifiable }
      }

      for (const run of linkUxRuns(runs, epicsText)) {
        if (run.claimed) continue
        gaps.push({
          id: 'U1',
          title: 'UX run not carried into the plan',
          severity: 'medium',
          subject: run.name,
          subjectKind: 'area',
          evidence: 'the epics document names no input from this UX design run',
          action: {
            kind: 'prompt',
            label: 'Ask whether it still applies',
            payload:
              `/bmad-correct-course -- the UX design run ${run.name} exists, and the epics document declares inputs from ` +
              'no part of it. Tell me whether its decisions are already covered elsewhere, whether ' +
              'it should feed the plan, or whether it is superseded and can be retired.',
          },
        })
      }

      return { gaps, unverifiable }
    }

    /**
     * Component identifiers a piece of prose names.
     *
     * A UX requirement describes components by name -- `ValueField`,
     * `SeriesRowControls` -- and story files name the same components because they
     * build them. That shared vocabulary is the only join between a design
     * requirement and the epic that delivers it: the ids are never cross-referenced.
     *
     * The shape matters. A capitalised word is usually just a sentence starting, so
     * the filter takes PascalCase with an internal capital: `ValueField` qualifies,
     * `Component` and `HTML` do not. Without it, "Error" links to nineteen stories
     * and every requirement appears covered.
     *
     * @param {string} text - prose to scan.
     * @returns {string[]} the identifiers, sorted.
     */
    function componentNames(text) {
      const words = String(text ?? '').match(/\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+\b/g) ?? []
      return [...new Set(words)].sort()
    }

    /**
     * Which stories and epics carry each UX requirement.
     *
     * The link is derived, never declared: a requirement names components, a story
     * names the same components, and the story knows its epic. It is a claim about
     * evidence, so the caller can see the components it rests on.
     *
     * @param {Map<string, {id: string, name: string}[]>} inventory - from `parseRequirementInventory`.
     * @param {Array<{key: string, epic: number, index: number, title: string, file: string|null}>} stories - the model's stories.
     * @param {Map<string, string>} storyText - story path to contents.
     * @returns {Map<string, {components: string[], stories: string[], epics: number[]}>} keyed by requirement id.
     */
    function linkUxToEpics(inventory, stories, storyText) {
      const links = new Map()
      const byFile = new Map(stories.map((story) => [story.file, story]))

      for (const item of inventory?.get('UX-DR') ?? []) {
        const components = componentNames(item.text ?? item.name)
        const hits = new Map()

        for (const [file, text] of storyText ?? []) {
          const story = byFile.get(file)
          if (story === undefined) continue
          for (const component of components) {
            if (!new RegExp(`\\b${component}\\b`).test(text)) continue
            if (!hits.has(story.key)) hits.set(story.key, { story, components: new Set() })
            hits.get(story.key).components.add(component)
          }
        }

        const matched = [...hits.values()]
        links.set(item.id, {
          components,
          stories: matched.map((hit) => hit.story.key),
          epics: [...new Set(matched.map((hit) => hit.story.epic))].sort((a, b) => a - b),
        })
      }

      return links
    }

    /**
     * **U2: a UX requirement nothing names.**
     *
     * Fires when no story file cites the requirement id. The reference project names
     * all 11 of its `UX-DR` entries exclusively in two retrospective documents, so
     * the work they describe is delivered without any story claiming it.
     *
     * @param {Map<string, {id: string, name: string}[]>} inventory - from `parseRequirementInventory`.
     * @param {string[]} storyTexts - the text of every story file the shell has read.
     * @returns {{gaps: object[], unverifiable: object[]}}
     */
    function detectUxRequirements(inventory, stories, storyText) {
      const items = inventory?.get('UX-DR') ?? []
      if (items.length === 0) return { gaps: [], unverifiable: [] }

      if ((storyText?.size ?? 0) === 0) {
        return {
          gaps: [],
          unverifiable: [
            {
              id: 'U2',
              subject: `${items.length} UX design requirements`,
              reason: 'no story file was readable, so none can be checked for the work it describes',
              action: {
                kind: 'prompt',
                label: 'Ask which stories carry the UX work',
                payload:
                  `/bmad-correct-course -- the inventory declares ${items.length} UX design requirements and I could read ` +
                  'no story file, so I cannot tell which of them any story carries. Find out which ' +
                  'stories carry this work.',
              },
            },
          ],
        }
      }

      const links = linkUxToEpics(inventory, stories, storyText)
      const unlinked = items.filter((item) => (links.get(item.id)?.epics.length ?? 0) === 0)
      if (unlinked.length === 0) return { gaps: [], unverifiable: [] }

      return {
        gaps: [
          {
            id: 'U2',
            title: 'UX requirement no epic delivers',
            severity: 'high',
            subject: `${unlinked.length} of ${items.length} UX design requirements`,
            subjectKind: 'requirement',
            evidence:
              'no story names the components ' +
              `${unlinked.map((item) => item.id).join(', ')} describe`,
            action: {
              kind: 'prompt',
              label: 'Ask where this UX work went',
              payload:
                `/bmad-correct-course -- ${unlinked.length} of ${items.length} UX design requirements name components that no ` +
                `story mentions: ${unlinked
                  .map((item) => `${item.id} (${componentNames(item.text ?? item.name).join(', ') || item.name})`)
                  .join('; ')}. Tell me for each whether the work shipped under another name, was ` +
                'dropped, or still needs an epic.',
            },
          },
        ],
        unverifiable: [],
      }
    }

    /**
     * The requirements view: every requirement the project declares, grouped by
     * class, each carrying the strongest state its evidence supports.
     *
     * Four classes are inventoried and only functional requirements get a coverage
     * map. That asymmetry is the point of this view: it does not pretend the other
     * three are unstarted, and it does not hide them. A requirement with no evidence
     * path reads as unverifiable, which is a different thing from not done.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/requirements
     */



    /** The states a requirement row can carry. */
    const REQ_STATE = {
      done: 'done',
      partial: 'partial',
      todo: 'todo',
      unknown: 'unknown',
    }

    /**
     * How many acceptance criteria a story file states.
     *
     * They are the bullets under `**Acceptance Criteria:**` inside
     * `## Tasks & Acceptance`. They carry no checkbox of their own -- verification
     * is by test, not by ticking -- so a story's own status is the only completion
     * signal that exists for them, and the view says so rather than inventing one.
     *
     * @param {string} text - a story file's contents.
     * @returns {number} the criteria stated, or 0 when the section is absent.
     */
    function countAcceptance(text) {
      if (typeof text !== 'string' || text === '') return 0

      // Walked line by line rather than matched. A regex terminator of
      // `(?=^## |$)` looks right and is not: under the `m` flag `$` matches at the
      // end of the heading's own line, so the section came out empty and every
      // story reported zero criteria.
      let inSection = false
      let inCriteria = false
      let count = 0

      for (const line of text.split('\n')) {
        if (/^##[ \t]/.test(line)) {
          inSection = /^##[ \t]+Tasks & Acceptance[ \t]*$/.test(line)
          inCriteria = false
          continue
        }
        if (!inSection) continue
        if (/^\*\*[^*]+\*\*[ \t]*$/.test(line)) {
          inCriteria = /^\*\*Acceptance Criteria:\*\*[ \t]*$/.test(line)
          continue
        }
        if (inCriteria && /^[ \t]*[-*][ \t]+\S/.test(line)) count += 1
      }

      return count
    }

    /**
     * Functional requirements, resolved through the coverage map and epic statuses.
     *
     * A requirement is done when every epic claiming it is done, not started when
     * none has begun, and partial in between -- the same reading the summary bar
     * uses, so the two can never disagree.
     *
     * @param {Map<string, {name: string, epics: number[]}>} coverage - from `parseFrCoverage`.
     * @param {Array<{key: string, status: string}>} epics - the model's epics.
     * @returns {Array<object>} rows.
     */
    function functionalRows(coverage, epics) {
      const status = new Map(epics.map((e) => [Number(String(e.key).replace('epic-', '')), e.status]))
      const rows = []
      for (const [id, entry] of coverage) {
        const states = entry.epics.map((n) => status.get(n) ?? 'backlog')
        const all = states.length > 0 && states.every((s) => s === 'done')
        const any = states.some((s) => s !== 'backlog')
        rows.push({
          id,
          name: entry.name,
          state: all ? REQ_STATE.done : any ? REQ_STATE.partial : REQ_STATE.todo,
          note: states.length === 0 ? 'no epic claims it' : `epic ${entry.epics.join(', ')}`,
        })
      }
      return rows
    }

    /**
     * Acceptance criteria, one row per story that states any.
     *
     * The row's state is the story's, because an individual criterion has no
     * completion marker. This is a proxy and the note names it as one.
     *
     * @param {Array<{key: string, title: string, status: string, file: string|null}>} stories - the model's stories.
     * @param {Map<string, string>} storyText - story path to contents.
     * @returns {Array<object>} rows, in board order.
     */
    function acceptanceRows(stories, storyText) {
      const rows = []
      for (const story of stories) {
        const text = story.file === null ? undefined : storyText.get(story.file)
        const count = countAcceptance(text ?? '')
        if (count === 0) continue
        rows.push({
          id: `${story.epic}.${story.index}`,
          name: story.title,
          state:
            story.status === 'done'
              ? REQ_STATE.done
              : story.status === 'backlog'
                ? REQ_STATE.todo
                : REQ_STATE.partial,
          note: `${count} criteria, state follows the story`,
        })
      }
      return rows
    }

    /**
     * Requirements from a class with no coverage map.
     *
     * No epic claims them, no story cites them, and no gate reports on them, so
     * there is nothing to read a state from. They are listed as unverifiable rather
     * than as outstanding work, because the board cannot tell the two apart and
     * saying "not done" would be a guess.
     *
     * @param {Array<{id: string, name: string}>} items - the inventory's entries.
     * @param {string} why - what is missing, short enough for a row.
     * @returns {Array<object>} rows.
     */
    function unverifiableRows(items, why) {
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        state: REQ_STATE.unknown,
        note: why,
      }))
    }

    /**
     * Every requirement, grouped into the lanes the view renders.
     *
     * @param {object} input - the parsed artefacts.
     * @param {string} input.epicsText - the epics document, for the inventory.
     * @param {Map<string, {name: string, epics: number[]}>} input.coverage - the FR coverage map.
     * @param {Array<object>} input.epics - the model's epics.
     * @param {Array<object>} input.stories - the model's stories.
     * @param {Map<string, string>} [input.storyText] - story path to contents.
     * @returns {{lanes: object[], totals: object}} the lanes and their totals.
     */
    function requirementsView(input) {
      // Declared before the lanes: three of them read an epic's status, and one
      // that sits above this line fails at render with a dead-zone error.
      const epicStatus = new Map(
        (input.epics ?? []).map((e) => [Number(String(e.key).replace('epic-', '')), e.status]),
      )

      const inventory = parseRequirementInventory(input.epicsText ?? '')
      const storyText = input.storyText ?? new Map()

      const functional = functionalRows(input.coverage ?? new Map(), input.epics ?? [])
      const acceptance = acceptanceRows(input.stories ?? [], storyText)

      const lanes = [
        { code: 'FR', label: 'functional', rows: functional, verifiable: true },
        { code: 'AC', label: 'acceptance', rows: acceptance, verifiable: true },
      ]

      // Architecture decisions are cited by id, so this lane reads like the
      // functional one: a decision is delivered when the epics citing it are.
      const decisions = input.decisions ?? new Map()
      if (decisions.size > 0) {
        lanes.push({
          code: 'AD',
          label: 'architecture',
          verifiable: true,
          rows: [...decisions.entries()].map(([id, link]) => {
            const states = link.epics.map((n) => epicStatus.get(n) ?? 'backlog')
            return {
              id,
              name: input.decisionTitles?.get(id) ?? '',
              state:
                link.epics.length === 0
                  ? REQ_STATE.unknown
                  : states.every((state) => state === 'done')
                    ? REQ_STATE.done
                    : states.some((state) => state !== 'backlog')
                      ? REQ_STATE.partial
                      : REQ_STATE.todo,
              note:
                link.epics.length === 0
                  ? 'no story cites it'
                  : `epic ${link.epics.join(', ')} across ${link.stories.length} stor${link.stories.length === 1 ? 'y' : 'ies'}`,
            }
          }),
        })
      }

      for (const { code, label } of REQUIREMENT_CLASSES) {
        if (code === 'FR') continue
        const items = inventory.get(code) ?? []
        if (items.length === 0) continue

        // UX is the one class with a join to the plan: a requirement names the
        // components it is about, and a story names them because it builds them. So
        // its rows read like functional ones instead of as a wall of unknowns.
        if (code === 'UX-DR') {
          const links = input.uxLinks ?? new Map()
          lanes.push({
            code,
            label,
            verifiable: true,
            rows: items.map((item) => {
              const link = links.get(item.id)
              const epics = link?.epics ?? []
              const states = epics.map((n) => epicStatus.get(n) ?? 'backlog')
              const done = states.length > 0 && states.every((state) => state === 'done')
              return {
                id: item.id,
                name: item.name,
                state:
                  epics.length === 0
                    ? REQ_STATE.unknown
                    : done
                      ? REQ_STATE.done
                      : states.some((state) => state !== 'backlog')
                        ? REQ_STATE.partial
                        : REQ_STATE.todo,
                note:
                  epics.length === 0
                    ? 'no story names the components it describes'
                    : `epic ${epics.join(', ')} via ${link.components.slice(0, 2).join(', ')}`,
              }
            }),
          })
          continue
        }

        lanes.push({
          code,
          label,
          rows: unverifiableRows(items, 'no coverage map, no story cites it'),
          verifiable: false,
        })
      }

      const count = (state) =>
        lanes.reduce((n, lane) => n + lane.rows.filter((row) => row.state === state).length, 0)
      const declared = lanes.reduce((n, lane) => n + lane.rows.length, 0)

      return {
        lanes,
        totals: {
          declared,
          done: count(REQ_STATE.done),
          partial: count(REQ_STATE.partial),
          todo: count(REQ_STATE.todo),
          unknown: count(REQ_STATE.unknown),
        },
      }
    }

    /**
     * What a spec file says about itself: its title, its tasks, and how many are
     * ticked.
     *
     * A standalone spec is one no tracking key claims, so the sprint file knows
     * nothing about it and the file is the only source. Its checkboxes are the only
     * progress signal that exists.
     *
     * @param {string} text - a spec file's contents.
     * @returns {{title: string, tasks: number, ticked: number, criteria: number}} the reading.
     */
    function parseSpecProgress(text) {
      const body = typeof text === 'string' ? text : ''
      const boxes = [...body.matchAll(/^[ \t]*- \[([ xX])\]/gm)]
      const title = /^#[ \t]+(.+?)[ \t]*$/m.exec(body)
      return {
        title: title === null ? '' : title[1].trim(),
        tasks: boxes.length,
        ticked: boxes.filter((match) => match[1].toLowerCase() === 'x').length,
        criteria: countAcceptance(body),
      }
    }

    /**
     * The standalone specs, split by whether anything is left to do.
     *
     * These are the specs no story in the sprint file claims: refactors, style
     * extractions, migrations. Most are finished, which is the point of showing
     * them together -- the interesting ones are the few still open, and a spec
     * written and never started is invisible everywhere else on the board because
     * no tracking key exists to hang it on.
     *
     * @param {Array<{file: string, text: string}>} specs - the unclaimed spec files.
     * @returns {{lanes: object[], totals: object}} the lanes and their counts.
     */
    function standaloneView(specs) {
      const rows = (specs ?? []).map((spec) => {
        const progress = parseSpecProgress(spec.text)
        const slug = spec.file.split('/').pop().replace(/^spec-/, '').replace(/\.md$/, '')
        const state =
          progress.tasks === 0
            ? REQ_STATE.unknown
            : progress.ticked === progress.tasks
              ? REQ_STATE.done
              : progress.ticked === 0
                ? REQ_STATE.todo
                : REQ_STATE.partial
        return {
          id: slug,
          name: progress.title === '' ? slug : progress.title,
          state,
          note: `${progress.ticked} of ${progress.tasks} tasks, ${progress.criteria} criteria`,
          file: spec.file,
        }
      })

      rows.sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id))
      const open = rows.filter((row) => row.state !== REQ_STATE.done)
      const finished = rows.filter((row) => row.state === REQ_STATE.done)

      const lanes = [
        { code: 'OPEN', label: 'still open', rows: open, verifiable: true },
        { code: 'DONE', label: 'finished', rows: finished, verifiable: true },
      ].filter((lane) => lane.rows.length > 0)

      return {
        lanes,
        totals: { declared: rows.length, open: open.length, done: finished.length },
      }
    }

    /**
     * Planning-artefact evidence: whether the architecture, brief and PRD are tied
     * to the work, and to what.
     *
     * The three carry different proofs, so they are read differently:
     *
     * - **Architecture decisions** are cited by id. Story files name `AD-3` when
     *   they implement it, which is an exact link and needs no guessing.
     * - **Brief and PRD** are upstream documents with no vocabulary of their own.
     *   The only link is the one the plan writes down, in the epics document's
     *   `inputDocuments`.
     *
     * The trap is that this repository runs more than one planning track. `prd.md`
     * is named by no part of the tools plan because it belongs to the i18n plan,
     * which is correct and would still look like an orphan to a naive check. So a
     * document is only reported when nothing in the plan carries it, and the finding
     * says which plan was asked.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/planning
     */

    /** A directory in the planning folder that holds dated artefacts. */
    const ARTEFACT_FAMILIES = ['architecture', 'briefs', 'ux-designs', 'research', 'epics-reviews']

    /**
     * The architecture decisions a spine declares.
     *
     * `### AD-3 - Shopify Metaobject CMS Backing`, with either a hyphen or an em
     * dash after the id.
     *
     * @param {string} text - the contents of an architecture spine.
     * @returns {Array<{id: string, title: string}>} the decisions, in document order.
     */
    function parseArchitectureDecisions(text) {
      const found = String(text ?? '').matchAll(/^#{2,4}[ \t]+(AD-\d+)[ \t]*[-:\u2014]+[ \t]*(.+?)[ \t]*$/gm)
      return [...found].map((match) => ({ id: match[1], title: match[2].trim() }))
    }

    /**
     * Which stories and epics cite each decision.
     *
     * A story names `AD-3` because it is implementing that decision, so this is a
     * declared link rather than an inferred one. A decision no story cites is
     * reported, but not as undelivered: `AD-10` names the tri-state parser contract
     * and story 1.3 is the tri-state parser, so the work can be plainly done while
     * the id goes unquoted. The board cannot tell those apart, and says so.
     *
     * @param {Array<{id: string, title: string}>} decisions - from {@link parseArchitectureDecisions}.
     * @param {Array<{key: string, epic: number, index: number}>} stories - the model's stories.
     * @param {Map<string, string>} storyText - story path to contents.
     * @returns {Map<string, {stories: string[], epics: number[]}>} keyed by decision id.
     */
    function linkDecisionsToEpics(decisions, stories, storyText) {
      const byFile = new Map(stories.map((story) => [story.file, story]))
      const links = new Map()

      for (const decision of decisions) {
        const hit = []
        for (const [file, text] of storyText ?? []) {
          const story = byFile.get(file)
          if (story === undefined) continue
          if (new RegExp(`\\b${decision.id}\\b`).test(text)) hit.push(story)
        }
        links.set(decision.id, {
          stories: hit.map((story) => story.key),
          epics: [...new Set(hit.map((story) => story.epic))].sort((a, b) => a - b),
        })
      }

      return links
    }

    /**
     * The documents the plan declares as its inputs.
     *
     * Read from the epics document's `inputDocuments` list, which is the only place
     * a brief or a PRD is tied to the work.
     *
     * @param {string} epicsText - the contents of the epics document.
     * @returns {string[]} the declared paths, as written, since a caller opens them.
     */
    function parseDeclaredInputs(epicsText) {
      const block = /^inputDocuments:[ \t]*\n((?:[ \t]*-[ \t]+.*\n)+)/m.exec(String(epicsText ?? ''))
      if (block === null) return []
      return [...block[1].matchAll(/^[ \t]*-[ \t]*['"]?(.+?)['"]?[ \t]*$/gm)]
        // The block runs to the closing `---`, which the list pattern also matches.
        .map((match) => match[1].trim())
        .filter((path) => path !== '' && !/^-+$/.test(path))
        .map((path) => path.replace(/^['"]|['"]$/g, ''))
    }

    /**
     * Artefact directories present in the planning folder.
     *
     * @param {Array<{type: string, name: string}>} entries - the planning listing.
     * @returns {string[]} the families present, in {@link ARTEFACT_FAMILIES} order.
     */
    function artefactFamilies(entries) {
      const dirs = new Set(
        (entries ?? []).filter((entry) => entry.type === 'directory').map((entry) => entry.name),
      )
      return ARTEFACT_FAMILIES.filter((family) => dirs.has(family))
    }

    /**
     * Document-shaped markers a reader can recognise as one artefact or another.
     *
     * @param {string} path - a declared input path.
     * @returns {string|null} the family it belongs to, or null.
     */
    function familyOf(path) {
      const text = String(path ?? '').toLowerCase()
      if (text.includes('architecture')) return 'architecture'
      if (text.includes('brief')) return 'briefs'
      if (text.includes('prd')) return 'prd'
      if (text.includes('ux-design')) return 'ux-designs'
      if (text.includes('research')) return 'research'
      return null
    }

    /**
     * The composed entry: read -> parse -> model -> detect -> gaps -> actions.
     *
     * Kept in its own module so the build can inline it: the shell needs the
     * function, not the module graph, and `build.mjs` strips the imports below
     * because every symbol is already in scope once the pieces are concatenated.
     *
     * @module @local/dsh-plugin-bmad-sprint-board/analyse
     */







    /**
     * Everything the board renders, from content the shell has already read.
     *
     * One entry point on purpose: the pieces have an order -- parse, model, detect,
     * measure -- and a shell that reassembles them itself will eventually get the
     * order wrong.
     *
     * @param {object} input - the workspace content.
     * @param {string} input.sprintText - the tracking file's text.
     * @param {string} [input.deferredText] - the deferred ledger's text.
     * @param {Array<{type: string, name: string}>} [input.entries] - the story directory listing.
     * @param {string} input.sprintPath - the tracking file's path, for relative resolution.
     * @param {string} [input.epicsText] - `planning-artifacts/epics.md`, for the coverage map.
     * @param {(path: string) => string|null|undefined} [input.readStory] - story-file reader.
     * @param {Array<{type: string, name: string}>} [input.uxRuns] - the `ux-designs` listing.
     * @param {string[]} [input.storyTexts] - the text of every story file read, for citation checks.
     * @param {string} [input.spineText] - the architecture spine, for its decisions.
     * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
     * @param {string} [input.spineText] - the architecture spine, for its decisions.
     * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
     * @param {Array<{type: string, name: string}>} [input.uxRuns] - the `ux-designs` listing.
     * @param {string[]} [input.storyTexts] - the text of every story file read, for citation checks.
     * @param {string} [input.spineText] - the architecture spine, for its decisions.
     * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
     * @param {string} [input.spineText] - the architecture spine, for its decisions.
     * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
     * @param {string} [input.spineText] - the architecture spine, for its decisions.
     * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
     * @param {Array<{file: string, text: string}>} [input.standalone] - specs no tracking key claims.
     * @returns {{model: object, gaps: object[], unverifiable: object[], bars: object, next: object, requirements: object}}
     */
    function analyse(input) {
      const model = buildModel(
        input.sprintText,
        input.deferredText ?? '',
        input.entries ?? [],
        input.sprintPath,
      )

      const { gaps, unverifiable } = detect(model, { readStory: input.readStory })
      // UX is a core requirement class and carries its own artefacts, so it gets its
      // own detectors: a design run the plan does not carry, and a UX requirement no
      // story names. Neither appears in the functional coverage map.
      const uxRuns = detectUxRuns(input.uxRuns ?? [], input.epicsText ?? '')
      // Keyed by story path, because the link runs component -> story -> epic and
      // the epic only exists on the story record.
      const storyFiles = new Map(
        (input.storyFiles ?? []).map((entry) => [entry.file, entry.text]),
      )
      const decisions = parseArchitectureDecisions(input.spineText ?? '')
      const decisionLinks = linkDecisionsToEpics(decisions, model.stories, storyFiles)
      const uxRequirements = detectUxRequirements(
        parseRequirementInventory(input.epicsText ?? ''),
        model.stories,
        storyFiles,
      )
      const coverage = parseFrCoverage(input.epicsText ?? '')
      const inventory = parseRequirementInventory(input.epicsText ?? '')
      const requirements = requirementBar(coverage, model.epics, inventory)

      // The inventory holds more than the coverage map claims. Those requirements
      // are declared and unowned, so nothing can say whether they were delivered --
      // which is an unverifiable, not a silence.
      const unowned = []
      if (requirements.unmapped > 0) {
        const classes = requirements.unmappedByClass
          .map((group) => `${group.code} (${group.items.length})`)
          .join(', ')
        // One action, offered twice: as the card in the unverifiable lane and as the
        // badge's button under the requirements bar. Two copies would drift.
        requirements.unmappedAction = {
          kind: 'prompt',
          label: 'Ask why they are unmapped',
          payload:
            `/bmad-correct-course -- ${classes} are declared in epics.md but appear in no coverage map and are cited by ` +
            'no story. Tell me whether each was delivered anyway, and whether the coverage map ' +
            'should be extended or the requirements retired.',
        }
        unowned.push({
          id: 'REQ',
          subject: `${requirements.unmapped} requirements have no coverage map`,
          reason:
            `The inventory declares ${requirements.declared} requirements; the coverage map ` +
            `claims ${requirements.total}. ${classes} are inventoried but mapped to no epic, ` +
            'and no story cites them, so their delivery cannot be measured.',
          action: requirements.unmappedAction,
        })
      }

      return {
        model,
        standalone: standaloneView(input.standalone ?? []),
        decisionTitles: new Map(decisions.map((decision) => [decision.id, decision.title])),
        declaredInputs: parseDeclaredInputs(input.epicsText ?? ''),
        artefactFamilies: artefactFamilies(input.planningEntries ?? []),
        requirementView: requirementsView({
          epicsText: input.epicsText ?? '',
          coverage,
          epics: model.epics,
          stories: model.stories,
          // Keyed by sprint path, the way the model records a story's file.
          storyText: storyFiles,
          decisions: decisionLinks,
          decisionTitles: new Map(decisions.map((decision) => [decision.id, decision.title])),
          uxLinks: linkUxToEpics(
            parseRequirementInventory(input.epicsText ?? ''),
            model.stories,
            storyFiles,
          ),
        }),
        gaps: [...gaps, ...uxRuns.gaps, ...uxRequirements.gaps],
        unverifiable: [...unverifiable, ...unowned, ...uxRuns.unverifiable, ...uxRequirements.unverifiable],
        requirements,
        bars: bars(model, requirements),
        next: nextAction(model),
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

    /**
     * One story card, in either view.
     * @param props - the story, the copy, and the file opener.
     * @returns the card element.
     */
    function StoryCard({ t, story, tag, makeOpener }) {
      let note = '';
      if (story.file === null) note = t('noSpec');
      else if (story.deferred > 0) note = t('deferredCount', { count: story.deferred });
      return h(Card, {
        id: `${story.epic}.${story.index}`,
        tag,
        title: story.title,
        note,
        onOpen: makeOpener(story.file),
        openLabel: t('openSpec'),
      });
    }

    // --- Frame components --------------------------------------------------

    /**
     * The tab's outer frame. The board owns the whole pane body, so the frame
     * also carries the component-local stylesheet.
     * @param props - the header element and the body element.
     * @returns the root element.
     */
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
     * The header of a loaded board: identity, progress, and the view toggle.
     * @param props - the model, its completion percentage, and the controls.
     * @returns the header element.
     */
    /**
     * The four views this one tab switches between.
     *
     * Requirements and specs used to be tabs of their own in the sidebar, which
     * meant three entries in the launcher for one board and three separate
     * snapshots of the same files. They are readings of the same artefacts, so
     * they are views of the same tab.
     */
    const VIEWS = [
      { id: 'status', label: 'viewStatus' },
      { id: 'epic', label: 'viewEpic' },
      { id: 'requirements', label: 'viewRequirements' },
      { id: 'specs', label: 'viewSpecs' },
    ];

    function BoardHeader({ t, model, bars, next, view, onView, onRefresh, refreshing }) {
      return h(
        'header',
        { className: 'bmad-sb-head' },
        h(
          'div',
          { className: 'bmad-sb-titlerow' },
          h('span', { className: 'bmad-sb-title' }, t('title')),
          h('span', { className: 'bmad-sb-project' }, model.project),
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
        model.lastUpdated === '' && refreshing !== true
          ? null
          : h(
              'div',
              { className: 'bmad-sb-sub' },
              model.lastUpdated === '' ? null : `${t('updated')} ${model.lastUpdated}`,
              // The reading on screen is the previous one while a refresh runs.
              // Saying so is the difference between stale and wrong.
              refreshing === true
                ? h(
                    'span',
                    { className: 'bmad-sb-refreshing', role: 'status' },
                    h('span', { className: 'bmad-sb-spinner', 'aria-hidden': true }),
                    t('refreshing'),
                  )
                : null,
            ),
        h(
          'div',
          { className: 'bmad-sb-metrics' },
          h(Bar, {
            t,
            label: t('barStories'),
            done: bars.stories.done,
            total: bars.stories.total,
            unknown: bars.stories.unverifiable,
            tone: 'success',
          }),
          h(Bar, {
            t,
            label: t('barRequirements'),
            done: bars.requirements.done,
            total: bars.requirements.total,
            unknown: bars.requirements.unverifiable,
            noData: bars.requirements.noData === true,
            badge:
              bars.requirements.unmapped > 0
                ? t('unmappedNote', {
                    count: bars.requirements.unmapped,
                    declared: bars.requirements.declared,
                  })
                : '',
            tone: 'info',
          }),
        ),
        h(NextLine, { t, next }),
        h(
          'div',
          {
            className: 'bmad-sb-seg',
            role: 'group',
            'aria-label': t('viewLabel'),
          },
          VIEWS.map((entry) =>
            h(
              'button',
              {
                key: entry.id,
                type: 'button',
                'aria-pressed': view === entry.id,
                onClick: () => onView(entry.id),
              },
              t(entry.label),
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
     * What a workspace with no sprint tracking file shows. Nothing went wrong,
     * so this explains what was looked for and where, instead of reporting a
     * failure the reader cannot act on.
     * @param props - the search shape and the retry action.
     * @returns the empty-state element.
     */
    function NoSprintFile({ t, searched, onRetry }) {
      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-empty', role: 'status' },
          h('span', { className: 'bmad-sb-emptytitle' }, t('noSprint.title')),
          h(
            'span',
            { className: 'bmad-sb-cardnote' },
            t('noSprint.body', { names: SPRINT_FILENAMES.join(', ') }),
          ),
          h(
            'span',
            { className: 'bmad-sb-cardnote' },
            t('noSprint.searched', {
              candidates: searched.candidates,
              depth: searched.depth,
            }),
          ),
          h(
            'button',
            { type: 'button', className: 'bmad-sb-btn', onClick: onRetry },
            t('noSprint.retry'),
          ),
        ),
      );
    }

    // --- Board views -------------------------------------------------------

    /**
     * One status lane in the Status view.
     * @param props - the status, its stories, fold state, and click behaviour.
     * @returns the lane section.
     */
    function StatusLane({ t, status, stories, collapsed, onToggle, makeOpener }) {
      return h(
        'section',
        { className: 'bmad-sb-lane', 'aria-label': t(`status.${status}`) },
        h(LaneHeader, {
          label: t(`status.${status}`),
          token: STATUS_TOKEN[status] ?? IDLE_TOKEN,
          count: stories.length,
          collapsed,
          onToggle,
        }),
        h(
          Fold,
          { collapsed },
          h(
            'div',
            { className: 'bmad-sb-cards' },
            stories.map((story) =>
              h(StoryCard, {
                key: story.key,
                t,
                story,
                // The status view names the epic, so the badge carries the
                // epic's own state; the epic view names the story's status.
                tag: `E${story.epic}`,
                tagTone: toneOf(story.epicStatus),
                makeOpener,
              }),
            ),
          ),
        ),
      );
    }

    /**
     * The Status view: one lane per status that has stories, in workflow order.
     * @param props - the model, the fold set, and the click behaviour.
     * @returns the lane sections.
     */
    function StatusLanes({ t, model, folded, onFlip, makeOpener, insertAfter, insert }) {
      const present = STATUS_ORDER.filter((status) =>
        model.stories.some((story) => story.status === status),
      );

      const lanes = present.map((status) => {
        const closedByDefault = status === 'done';
        return h(StatusLane, {
          key: status,
          t,
          status,
          stories: model.stories.filter((story) => story.status === status),
          collapsed: isFolded(folded, status, closedByDefault),
          onToggle: foldHandler(onFlip, status, closedByDefault),
          makeOpener,
        });
      });

      if (insert === undefined) return lanes;
      // What is finished is read before what is wrong with it, so the gaps sit
      // after the Done lane rather than above every lane. When nothing is done
      // yet there is no such lane, and the section closes the list instead.
      const at = present.indexOf(insertAfter);
      const cut = at === -1 ? lanes.length : at + 1;
      return [...lanes.slice(0, cut), insert, ...lanes.slice(cut)];
    }

    /**
     * One epic swimlane in the Epic view.
     * @param props - the epic, its stories, fold state, and click behaviour.
     * @returns the epic section.
     */
    function EpicSection({ t, epic, stories, collapsed, onToggle, makeOpener }) {
      const percent =
        epic.total === 0 ? 0 : Math.round((epic.done / epic.total) * 100);
      return h(
        'section',
        {
          className: 'bmad-sb-epicsec',
          'aria-label': `${t('epicLabel')} ${epic.number}`,
        },
        h(
          'div',
          { className: 'bmad-sb-epichead' },
          h(
            'button',
            {
              type: 'button',
              className: 'bmad-sb-lanehead',
              'aria-expanded': !collapsed,
              onClick: onToggle,
            },
            h('span', {
              className: 'bmad-sb-dot',
              style: {
                background: `var(${STATUS_TOKEN[epic.status] ?? IDLE_TOKEN})`,
              },
              'aria-hidden': true,
            }),
            h(
              'span',
              { className: 'bmad-sb-epicname' },
              `${t('epicLabel')} ${epic.number}`,
            ),
            h(
              'span',
              { className: 'bmad-sb-count' },
              `${epic.done}/${epic.total}`,
            ),
            h(
              'span',
              { className: 'bmad-sb-chev', 'aria-hidden': true },
              collapsed ? CHEVRON_CLOSED : CHEVRON_OPEN,
            ),
          ),
        ),
        h(
          'div',
          { className: 'bmad-sb-sub' },
          h('span', null, t(`status.${epic.status}`) || epic.status),
          epic.retro === ''
            ? null
            : h('span', null, `${t('retroLabel')}: ${epic.retro}`),
          h(
            'span',
            { className: 'bmad-sb-bar', 'aria-hidden': true },
            h('span', { style: { width: `${percent}%` } }),
          ),
        ),
        h(
          Fold,
          { collapsed },
          h(
            'div',
            { className: 'bmad-sb-cards' },
            stories.map((story) =>
              h(StoryCard, {
                key: story.key,
                t,
                story,
                tag: t(`status.${story.status}`) || story.status,
                tagTone: toneOf(story.status),
                makeOpener,
              }),
            ),
          ),
        ),
      );
    }

    /**
     * The Epic view: one swimlane per epic, with its own progress and retro state.
     * @param props - the model, the fold set, and the click behaviour.
     * @returns the epic sections.
     */
    function EpicSections({ t, model, folded, onFlip, makeOpener }) {
      return model.epics.map((epic) => {
        // A finished epic is the least likely to need its stories listed, so it
        // starts folded; an epic still in flight starts open.
        const closedByDefault = epic.status === 'done';
        return h(EpicSection, {
          key: epic.key,
          t,
          epic,
          stories: model.stories.filter((story) => story.epic === epic.number),
          collapsed: isFolded(folded, epic.number, closedByDefault),
          onToggle: foldHandler(onFlip, epic.number, closedByDefault),
          makeOpener,
        });
      });
    }

    /**
     * The retrospective action items: the open ones, then a completed count.
     * @param props - the model and the click behaviour.
     * @returns the section's elements.
     */
    function ActionLane({ t, model, makeOpener, collapsed, onToggle }) {
      const cards = model.openActions.map((item) =>
        h(Card, {
          key: item.id,
          id: '',
          tag: item.owner,
          // An open item wants attention; one being worked is simply in flight.
          tagTone: toneOf(item.status),
          title: item.action,
          note: item.status === 'in-progress' ? t('status.in-progress') : '',
          onOpen: makeOpener(item.ref === '' ? null : item.ref),
          openLabel: t('openRetro'),
          // A retrospective commitment is work somebody agreed to do, so it
          // carries the same kind of action the gaps do. It is a request rather
          // than a command: the board knows what was promised, not how to keep it.
          footer: h(CopyButton, {
            t,
            label:
              item.status === 'in-progress'
                ? t('finishActionItem')
                : t('takeActionItem'),
            value:
              `/bmad-build -- ${item.action}\n\n` +
              `Owner: ${item.owner === '' ? 'unassigned' : item.owner}\n` +
              `Status: ${item.status}\n` +
              (item.ref === '' ? '' : `Source: ${item.ref}\n`) +
              '\nThis is an open action item from a retrospective. Take it on, or tell me ' +
              'why it should be closed.',
          }),
        }),
      );
      // A lane, like every other list on the board: the count sits in the
      // header with the rest, and the settled total rides underneath.
      return h(CardLane, {
        label: t('actionsTitle'),
        token: cards.length === 0 ? IDLE_TOKEN : WARN_TOKEN,
        cards,
        collapsed,
        onToggle,
        empty: t('noOpenActions'),
        count: `${cards.length} / ${cards.length + model.doneActionCount}`,
        countTitle: t('actionsCount', {
          open: cards.length,
          done: model.doneActionCount,
        }),
        note: t('actionsDone', { count: model.doneActionCount }),
      });
    }

    /**
     * The deferred-work ledger. An entry with no `source_spec` opens the ledger
     * itself, wherever the workspace keeps it.
     * @param props - the model, the ledger's path, and the click behaviour.
     * @returns the section's elements.
     */
    function DeferredLane({ t, model, ledgerPath, makeOpener, collapsed, onToggle }) {
      const cards = model.deferred.map((item, index) =>
        h(Card, {
          key: item.id === '' ? `deferred-${index}` : item.id,
          id: item.id,
          // An entry that names a story's spec carries that story's board id,
          // so the chip matches the id on the story's own card.
          storyTag:
            item.story === null
              ? undefined
              : {
                  label: `\u21B3 ${item.story.epic}.${item.story.index}`,
                  title: t('deferredFrom', {
                    id: `${item.story.epic}.${item.story.index}`,
                  }),
                  // The reference takes the referenced story's own state, so the
                  // chip says at a glance what the entry hangs off.
                  tone: toneOf(item.story.status),
                },
          tag: item.source,
          tagTone: 'neutral',
          title: item.title,
          note: item.file === '' ? item.spec : item.file,
          onOpen: makeOpener(item.spec === '' ? ledgerPath : item.spec),
          openLabel: t('openSpec'),
          // A deferral is a decision somebody already made, so the board does not
          // assume it should be undone. It states what was shelved and asks.
          footer: h(CopyButton, {
            t,
            label: t('deferredAction'),
            // Ledger entries are sparse: some carry an id and a source, some
            // only a sentence. Every empty field is dropped rather than printed
            // as a blank, so the request reads the same either way.
            value: [
              `/bmad-build -- ${item.title}`,
              '',
              item.source === '' ? null : `Source: ${item.source}`,
              item.story === null
                ? null
                : `Deferred from: ${item.story.epic}.${item.story.index}`,
              item.spec === '' ? null : `Spec: ${item.spec}`,
              item.file === '' ? null : `Related file: ${item.file}`,
              '',
              'This was deferred deliberately. Tell me whether to pick it up now, keep it',
              'deferred, or drop it. If it should be picked up, implement it.',
            ]
              .filter((line) => line !== null)
              .join('\n')
              .replace(/\n{3,}/g, '\n\n'),
          }),
        }),
      );
      return h(CardLane, {
        label: t('deferredTitle'),
        // Deferred work is recorded and accepted, not urgent: the same neutral
        // the backlog wears, because neither is being worked right now.
        token: IDLE_TOKEN,
        cards,
        collapsed,
        onToggle,
        empty: t('noDeferred'),
      });
    }

    // --- Interaction helpers -----------------------------------------------

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

    /**
     * Find the tracking file in the Session's workspace and fold everything it
     * names into one model. The deferred ledger and the spec listing are
     * optional: a workspace without them still gets a board, just a thinner one.
     * A workspace with no tracking file at all is reported as missing rather
     * than as a failure, because nothing went wrong.
     * @param readers - the injected workspace readers.
     * @param sessionId - the Session whose workspace to read.
     * @param signal - cancellation for this read.
     * @returns the board model, or a missing marker naming what was searched.
     */
    /**
     * Run an async mapper over a list with a ceiling on how many run at once.
     *
     * The reads this board makes are round-trips to the Host's workspace face,
     * and they were issued one after another: thirty small files cost thirty
     * sequential waits. Firing all thirty at once would be faster still and
     * needlessly rude to the far side, so they go in waves.
     *
     * @param items - the list to map.
     * @param limit - how many run concurrently.
     * @param mapper - async function of one item.
     * @returns the results, in input order.
     */
    async function mapLimit(items, limit, mapper) {
      const results = new Array(items.length);
      let next = 0;
      const worker = async () => {
        while (next < items.length) {
          const index = next;
          next += 1;
          results[index] = await mapper(items[index], index);
        }
      };
      const workers = [];
      for (let i = 0; i < Math.min(limit, items.length); i += 1) workers.push(worker());
      await Promise.all(workers);
      return results;
    }

    async function loadBoardModel(
      { readWorkspaceFile, listWorkspaceDir, stat },
      sessionId,
      signal,
    ) {
      const readers = { stat, list: listWorkspaceDir };

      // BMAD declares where its modules write, and a project may move those
      // folders, so the declaration is read first. The candidate probe and the
      // bounded scan remain, but as the fallback for when config is absent.
      const configPath = await firstExistingFile(stat, ['_bmad/config.toml'], signal);
      const declarations =
        configPath === null
          ? { implementation: null, planning: null, knowledge: null }
          : artifactPaths(
              parseBmadConfig(await readWorkspaceFile(configPath, signal).catch(() => '')),
            );

      const sprintPath = await locateSprintPath(readers, sessionId, signal);
      if (sprintPath === null) {
        return {
          missing: true,
          searched: {
            candidates: SPRINT_CANDIDATES.length * SPRINT_FILENAMES.length,
            depth: SCAN_MAX_DEPTH,
          },
        };
      }

      const sprintText = await readWorkspaceFile(sprintPath, signal);
      const sprintDir = dirOf(sprintPath);
      const storyLocation = (parseSprintStatus(sprintText).meta.story_location ?? '').trim();
      const storyDir = storyLocation || sprintDir;

      // The ledger sits with the story files in every layout seen so far, and
      // beside the tracking file in the rest; probe both rather than guess.
      const deferredPath = await firstExistingFile(
        stat,
        [under(storyDir, 'deferred-work.md'), under(sprintDir, 'deferred-work.md')],
        signal,
      );
      // Nothing below depends on anything else below until the model is built,
      // so the ledger, the listing, the plan and the UX runs go out together.
      const [deferredText, entries, epicsRead, planningEntries, uxListing] = await Promise.all([
        deferredPath === null
          ? Promise.resolve('')
          : readWorkspaceFile(deferredPath, signal).catch(() => ''),
        listWorkspaceDir(storyDir, signal).catch(() => []),
        declarations.planning === null
          ? Promise.resolve({ path: null, text: '' })
          : firstExistingFile(stat, [under(declarations.planning, 'epics.md')], signal).then(
              (path) =>
                path === null
                  ? { path: null, text: '' }
                  : readWorkspaceFile(path, signal)
                      .catch(() => '')
                      .then((text) => ({ path, text })),
            ),
        declarations.planning === null
          ? Promise.resolve([])
          : listWorkspaceDir(declarations.planning, signal).catch(() => []),
        declarations.planning === null
          ? Promise.resolve([])
          : listWorkspaceDir(under(declarations.planning, UX_DIR), signal).catch(() => []),
      ]);

      const epicsPath = epicsRead.path;
      const epicsText = epicsRead.text;
      const uxRuns = parseUxRuns(uxListing);
      const model = buildModel(sprintText, deferredText, entries, sprintPath);

      // The spine is reached through the plan's own declaration rather than a
      // guessed path: whatever epics.md lists as an architecture input is what
      // gets read, and a project that lists none simply has no such lane.
      const declaredInputs = parseDeclaredInputs(epicsText);
      const spinePath =
        declaredInputs.find((path) => /architecture/i.test(path) && /\.md$/i.test(path)) ?? null;
      const spineText =
        spinePath === null ? '' : await readWorkspaceFile(spinePath, signal).catch(() => '');

      // The core cannot read files, so the shell reads every story file the
      // detectors may need and hands over the text. B3 only asks about finished
      // stories, but U2 asks whether any story cites a UX requirement, so all of
      // them are read.
      const storyText = new Map(
        await mapLimit(
          model.stories.filter((story) => story.file !== null),
          READ_CONCURRENCY,
          async (story) => {
            try {
              return [story.file, await readWorkspaceFile(story.file, signal)];
            } catch {
              return [story.file, null]; // present but unreadable, not absent
            }
          },
        ),
      );
      const readStory = (path) => (storyText.has(path) ? storyText.get(path) : undefined);

      // Specs no story claims. The sprint file is silent about them, so the
      // directory listing is the only place they exist, and the file itself is
      // the only place their progress does.
      const claimed = new Set(
        model.stories
          .map((story) => story.file)
          .filter((file) => typeof file === 'string')
          .map((file) => file.split('/').pop()),
      );
      const unclaimed = entries
        .filter(
          (entry) =>
            entry.type === 'file' && /^spec-.*\.md$/.test(entry.name) && !claimed.has(entry.name),
        )
        .map((entry) => (storyDir === '' ? entry.name : `${storyDir}/${entry.name}`));
      const standalone = await mapLimit(unclaimed, READ_CONCURRENCY, async (file) => ({
        file,
        text: await readWorkspaceFile(file, signal).catch(() => ''),
      }));

      return {
        analysis: analyse({
          sprintText,
          deferredText,
          entries,
          sprintPath,
          epicsText,
          uxRuns,
          spineText,
          standalone,
          planningEntries,
          storyTexts: [...storyText.values()].filter((t) => typeof t === 'string'),
          storyFiles: [...storyText.entries()].map(([file, text]) => ({ file, text })),
          readStory,
        }),
        deferredPath,
        coveragePath: epicsPath,
        declarations,
      };
    }

    /**
     * The first path in a list that names an existing file.
     * @param stat - the injected workspace stat reader.
     * @param paths - candidate workspace-relative paths, in preference order.
     * @param signal - caller cancellation.
     * @returns the first existing path, or null when none is there.
     */
    async function firstExistingFile(stat, paths, signal) {
      for (const path of paths) {
        if (await fileExists(stat, path, signal)) return path;
      }
      return null;
    }

    /**
     * The failure snapshot for one rejected read.
     * @param error - whatever the read threw.
     * @returns the error snapshot.
     */
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

    /**
     * The framework's own recommendation, rendered rather than reinvented. One
     * answer with its reason: a board that offers three has not answered.
     * @param props - the recommendation and the copy.
     * @returns the next-action line, or null when there is nothing to do.
     */
    function NextLine({ t, next }) {
      if (next === null || next.skill === null) {
        return h('div', { className: 'bmad-sb-next', 'data-kind': 'done' }, t('allDone'));
      }
      return h(
        'div',
        { className: 'bmad-sb-next', 'data-kind': 'action' },
        h('span', { className: 'bmad-sb-nextlabel' }, t('nextLabel')),
        h('span', { className: 'bmad-sb-nextskill' }, next.skill),
        h('span', { className: 'bmad-sb-nextkey' }, next.label || next.key),
        h('span', { className: 'bmad-sb-nextreason' }, next.reason),
        // The recommendation is the most actionable thing on the board, so it
        // carries an action too rather than sitting there as a sentence.
        next.action === null || next.action === undefined
          ? null
          : h(CopyButton, {
              t,
              label: next.action.label,
              value: next.action.payload,
            }),
      );
    }

    /**
     * The gaps, then the things the board could not check. Unverifiable is a
     * separate list on purpose: it must never be filtered, dimmed, or collapsed
     * into the clean state, because a board showing nothing looks identical to a
     * board that cannot see.
     * @param props - the gaps, the unverifiable entries, and the copy.
     * @returns the gaps section, or null when there is nothing to report.
     */
    /**
     * A lane's body, folded open or shut.
     *
     * The cards stay mounted while collapsed, because an animation needs
     * something to animate. Height is always an explicit pixel value, measured
     * from the content and re-measured when the content resizes. That keeps the
     * transition a plain CSS interpolation between two lengths.
     *
     * Two approaches were tried and rejected. `grid-template-rows: 0fr -> 1fr`
     * is the usual recipe and does not survive this page: the scroll ancestor
     * carries a definite height, and a `1fr` row whose item clips resolves to
     * zero, so the lane stayed shut however the attribute was set. Collapsing
     * from `auto` needs the height pinned for one frame first, and that frame
     * came from `requestAnimationFrame`, which never fires in a background tab.
     *
     * @param props - whether it is shut, and the cards.
     * @returns the folding body.
     */
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
          title: item.subject,
          note: item.reason,
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

    function useSprintSnapshot({
      readers,
      sessionId,
      tabSignal,
      revision,
    }) {
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

        loadBoardModel(readers, sessionId, controller.signal).then(
          (outcome) => {
            if (!live) return;
            if (outcome.missing === true) {
              SNAPSHOT_CACHE.delete(sessionId);
              setSnapshot({ phase: 'missing', searched: outcome.searched });
              return;
            }
            const next = {
              phase: 'ready',
              ...outcome.analysis,
              deferredPath: outcome.deferredPath,
              coveragePath: outcome.coveragePath,
              declarations: outcome.declarations,
              readAt: Date.now(),
              refreshing: false,
            };
            SNAPSHOT_CACHE.set(sessionId, next);
            setSnapshot(next);
          },
          (error) => {
            if (!live) return;
            const previous = SNAPSHOT_CACHE.get(sessionId);
            // A refresh that fails keeps the last good reading and says so. A
            // blank board would be a worse lie than a dated one, and a dated
            // one that does not admit it is dated is worse still.
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
      }, [revision, tabSignal, readers, sessionId]);

      return snapshot;
    }

    // --- The tab body ------------------------------------------------------

    /**
     * The board body: reads the three files, then renders the board.
     * @param props - framework-bound tab identity, `t`, and the injected readers.
     * @returns the tab's content.
     */
    /**
     * The colour a requirement lane's count wears, by what the lane contains.
     *
     * A lane of finished requirements is green, a lane with work left is blue,
     * one that has not started is neutral, and one with no evidence anywhere is
     * amber -- the same amber the summary gives its "no evidence" total, because
     * that is a finding rather than an absence.
     *
     * @param lane - the lane, with its rows and whether it is verifiable.
     * @returns a theme token name.
     */
    function requirementLaneToken(lane) {
      if (lane.verifiable !== true) return WARN_TOKEN;
      if (lane.rows.length === 0) return IDLE_TOKEN;
      const done = lane.rows.filter((row) => row.state === 'done').length;
      if (done === lane.rows.length) return '--dsw-alias-state-success-primary';
      return done === 0 ? IDLE_TOKEN : '--dsw-alias-state-business-primary';
    }

    /** One requirement row: a state mark, the id, the name, and the note. */
    function RequirementRow({ row }) {
      const mark =
        row.state === 'done'
          ? '\u2713'
          : row.state === 'partial'
            ? '\u25D1'
            : row.state === 'todo'
              ? '\u2717'
              : '\u25CB';
      return h(
        'div',
        { className: 'bmad-sb-req', 'data-state': row.state },
        h('span', { className: 'bmad-sb-reqmark', 'aria-hidden': true }, mark),
        h('span', { className: 'bmad-sb-reqid' }, row.id),
        h('span', { className: 'bmad-sb-reqname' }, row.name),
        h('span', { className: 'bmad-sb-reqnote' }, row.note),
      );
    }

    /** Guide artwork for the specs tab: loose pages, one of them marked. */
    /**
     * The standalone-specs tab: the specs no tracking key claims.
     *
     * They are side-work -- refactors, style extractions, migrations -- and the
     * sprint file is silent about them, so nothing else on the board can show
     * them. Most are finished; the ones that are not have no story to hang on
     * and would otherwise be invisible.
     *
     * @param props - the same injection the other panes receive.
     * @returns the specs pane.
     */
    /**
     * The standalone-specs view: the specs no tracking key claims.
     *
     * A body, like the requirements view, for the same reason.
     *
     * @param props - the built view, the fold set, and the click behaviour.
     * @returns the specs body.
     */
    function StandaloneView({ t, standalone, folded, onFlip }) {
      const view = standalone ?? { lanes: [], totals: {} };
      const totals = view.totals ?? {};

      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-view' },
          h(
            'div',
            { className: 'bmad-sb-summary' },
            h('span', null, t('specDeclared', { count: totals.declared ?? 0 })),
            h('span', { className: 'bmad-sb-summary--done' }, t('specDone', { count: totals.done ?? 0 })),
            h('span', { className: 'bmad-sb-summary--unknown' }, t('specOpen', { count: totals.open ?? 0 })),
          ),
          (view.lanes ?? []).map((lane) => {
            const collapsed = isFolded(folded, lane.code, false);
            return h(
              'section',
              { className: 'bmad-sb-lane', key: lane.code, 'aria-label': lane.label },
              h(LaneHeader, {
                label: `${lane.label} (${lane.rows.length})`,
                token: lane.code === 'OPEN' ? WARN_TOKEN : '--dsw-alias-state-success-primary',
                count: lane.rows.length,
                collapsed,
                onToggle: foldHandler(onFlip, lane.code, false),
              }),
              h(
                Fold,
                { collapsed },
                h(
                  'div',
                  { className: 'bmad-sb-cards' },
                  lane.rows.map((row) =>
                    h(Card, {
                      key: row.id,
                      id: '',
                      title: row.name,
                      note: row.note,
                      tag: lane.code === 'OPEN' ? t('specOpenTag') : t('specDoneTag'),
                      tagTone: lane.code === 'OPEN' ? 'warning' : 'neutral',
                      footer:
                        lane.code !== 'OPEN'
                          ? undefined
                          : h(CopyButton, {
                              t,
                              label: t('specPickUp'),
                              value:
                                `/bmad-build -- ${row.name}\n\nSpec: ${row.file}\n${row.note}\n\n` +
                                'No story in the sprint file claims this spec. Tell me whether ' +
                                'to pick it up, fold it into a story, or drop it.',
                            }),
                    }),
                  ),
                ),
              ),
            );
          }),
        ),
      );
    }

    /**
     * The requirements tab: every declared requirement, grouped by class.
     *
     * Four classes are inventoried and only functional requirements carry a
     * coverage map. The three without one are shown as unverifiable rather than
     * as outstanding work, because the board cannot tell those apart and
     * guessing "not done" is the failure this board exists to catch.
     *
     * @param props - the same injection the board pane receives.
     * @returns the requirements pane.
     */
    /**
     * The requirements view: every declared requirement, grouped by class.
     *
     * A body, not a pane: it shares the board's header, its snapshot and its
     * fold state, so it renders inside the one tab rather than as a second one.
     *
     * @param props - the built view, the fold set, and the click behaviour.
     * @returns the requirements body.
     */
    function RequirementsView({ t, requirementView, folded, onFlip }) {
      const view = requirementView ?? { lanes: [], totals: {} };
      const totals = view.totals ?? {};

      return h(
        'div',
        { className: 'bmad-sb-scroll' },
        h(
          'div',
          { className: 'bmad-sb-view' },
          h(
            'div',
            { className: 'bmad-sb-summary' },
            h('span', null, t('reqDeclared', { count: totals.declared ?? 0 })),
            h('span', { className: 'bmad-sb-summary--done' }, t('reqDone', { count: totals.done ?? 0 })),
            h('span', null, t('reqPartial', { count: totals.partial ?? 0 })),
            h('span', null, t('reqTodo', { count: totals.todo ?? 0 })),
            h('span', { className: 'bmad-sb-summary--unknown' }, t('reqUnknown', { count: totals.unknown ?? 0 })),
          ),
          view.lanes.map((lane) => {
            const collapsed = isFolded(folded, lane.code, false);
            return h(
              'section',
              { className: 'bmad-sb-lane', key: lane.code, 'aria-label': lane.label },
              h(LaneHeader, {
                label: `${lane.label} (${lane.rows.length})`,
                token: requirementLaneToken(lane),
                count: lane.rows.length,
                collapsed,
                onToggle: foldHandler(onFlip, lane.code, false),
              }),
              h(
                Fold,
                { collapsed },
                h(
                  'div',
                  { className: 'bmad-sb-cards' },
                  lane.rows.map((row) => h(RequirementRow, { key: row.id, row })),
                ),
              ),
            );
          }),
        ),
      );
    }

    /**
     * The board body: locates the tracking file in the workspace, then renders
     * the board it describes.
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
      const [view, setView] = React.useState('status');
      const [foldedStatus, setFoldedStatus] = React.useState(() => new Map());
      const [foldedEpic, setFoldedEpic] = React.useState(() => new Map());

      // One stable face for the loader, so the read effect keys on the Session
      // rather than on a fresh object each render.
      const readers = React.useMemo(
        () => ({
          readWorkspaceFile,
          listWorkspaceDir,
          stat: statWorkspacePath,
        }),
        [readWorkspaceFile, listWorkspaceDir, statWorkspacePath],
      );

      const snapshot = useSprintSnapshot({
        readers,
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
              ? h(
                  'div',
                  { className: 'bmad-sb-note', role: 'status' },
                  t('loading'),
                )
              : snapshot.phase === 'missing'
                ? h(NoSprintFile, {
                    t,
                    searched: snapshot.searched,
                    onRetry: refresh,
                  })
                : h(LoadFailure, {
                    t,
                    message: snapshot.message,
                    onRetry: refresh,
                  }),
        });
      }

      const model = snapshot.model;
      const { bars, next, gaps, unverifiable } = snapshot;
      const makeOpener = (path) => openHandler(actions, fileAddress, path);

      const gapLanes = [
        gaps.length === 0
          ? null
          : h(CardLane, {
              key: 'gaps',
              label: t('gapsLabel'),
              token: WARN_TOKEN,
              cards: gapCards(t, gaps),
              collapsed: isFolded(foldedStatus, 'gaps', false),
              onToggle: foldHandler(setFoldedStatus, 'gaps', false),
            }),
        unverifiable.length === 0
          ? null
          : h(CardLane, {
              key: 'unverifiable',
              label: t('unverLabel'),
              token: IDLE_TOKEN,
              modifier: 'bmad-sb-lane--unverifiable',
              cards: unverifiableCards(t, unverifiable),
              collapsed: isFolded(foldedStatus, 'unverifiable', false),
              onToggle: foldHandler(setFoldedStatus, 'unverifiable', false),
            }),
      ].filter(Boolean);
      // No wrapper: these are lanes, and they belong beside the status lanes
      // rather than nested one level inside a section of their own.
      const gapSection = gapLanes;
      const lanes =
        view === 'status'
          ? h(StatusLanes, {
              t,
              model,
              folded: foldedStatus,
              onFlip: setFoldedStatus,
              makeOpener,
              insertAfter: 'done',
              insert: gapSection,
            })
          : [
              h(EpicSections, {
                t,
                model,
                folded: foldedEpic,
                onFlip: setFoldedEpic,
                makeOpener,
              }),
              gapSection,
            ];


      // The two bars sit side by side and are never a toggle: 12 of 15 stories
      // against 11 of 17 requirements is a pair of numbers that disagree, and
      // the distance between them is the finding.
      return h(BoardShell, {
        header: h(BoardHeader, {
          t,
          model,
          bars,
          next,
          view,
          onView: setView,
          onRefresh: refresh,
          refreshing: snapshot.refreshing === true,
        }),
        body:
          view === 'requirements'
            ? h(RequirementsView, {
                t,
                requirementView: snapshot.requirementView,
                folded: foldedStatus,
                onFlip: setFoldedStatus,
              })
            : view === 'specs'
              ? h(StandaloneView, {
                  t,
                  standalone: snapshot.standalone,
                  folded: foldedStatus,
                  onFlip: setFoldedStatus,
                })
              : h(
          'div',
          { className: 'bmad-sb-scroll' },
          // Keyed on the view: switching remounts the list, which replays the
          // settle animation instead of swapping content abruptly.
          h('div', { className: 'bmad-sb-view', key: view }, lanes),
          h(ActionLane, {
            t,
            model,
            makeOpener,
            collapsed: isFolded(foldedStatus, 'actions', false),
            onToggle: foldHandler(setFoldedStatus, 'actions', false),
          }),
          h(DeferredLane, {
            t,
            model,
            // Null when the workspace keeps no ledger; the card then has
            // nothing to open and renders static rather than dead.
            ledgerPath: snapshot.deferredPath,
            makeOpener,
            collapsed: isFolded(foldedStatus, 'deferred', false),
            onToggle: foldHandler(setFoldedStatus, 'deferred', false),
          }),
                ),
      });
    }

    // --- Dictionaries ------------------------------------------------------

    const en = {
      refreshing: 'refreshing\u2026',
      viewRequirements: 'Requirements',
      viewSpecs: 'Specs',
      askAgentPill: 'Ask agent \u00b7 prompt',
      specTitle: 'Standalone specs',
      'specGuide.title': 'Standalone specs',
      'specGuide.description': 'Specs no story in the sprint file claims',
      specDeclared: '{count} specs',
      specDone: '{count} finished',
      specOpen: '{count} still open',
      specOpenTag: 'not in the sprint file',
      specDoneTag: 'unclaimed',
      specPickUp: 'Ask an agent to pick it up',
      unmappedNote: '{count} of {declared} unmapped',
      actionsCount: '{open} open, {done} completed',
      specTitle: 'Standalone specs',
      'specGuide.title': 'Standalone specs',
      'specGuide.description': 'Specs no story in the sprint file claims',
      specDeclared: '{count} specs',
      specDone: '{count} finished',
      specOpen: '{count} still open',
      specOpenTag: 'not in the sprint file',
      specDoneTag: 'unclaimed',
      specPickUp: 'Ask an agent to pick it up',
      deferredAction: 'Ask whether to pick it up',
      takeActionItem: 'Ask an agent to take it',
      finishActionItem: 'Ask an agent to finish it',
      reqTitle: 'Requirements',
      'reqGuide.title': 'Requirements',
      'reqGuide.description':
        'Every declared requirement, by class, with what the evidence supports',
      reqDeclared: '{count} declared',
      reqDone: '{count} done',
      reqPartial: '{count} partial',
      reqTodo: '{count} not started',
      reqUnknown: '{count} no evidence',
      unmappedNote: '{count} of {declared} unmapped',
      gapsLabel: 'Gaps',
      unverLabel: 'Could not check',
      copied: 'Copied',
      copyFailed: 'Copy failed -- select and copy manually',
      barNoData: '{label}: no data',
      cannotMeasure: 'cannot measure',
      barStories: 'stories',
      barRequirements: 'requirements',
      barLabel: '{label}: {done} of {total} complete',
      barLabelUnknown: '{label}: {done} of {total} complete, {unknown} could not be verified',
      unknownHint: '{count} could not be verified',
      nothingVerifiable: 'nothing verifiable',
      nextLabel: 'Next',
      allDone: 'Every story is done.',
      gapsTitle: 'Gaps ({count})',
      unverTitle: 'Could not check ({count})',
      askAnAgent: 'Ask an agent',
      title: 'BMAD Sprint board',
      'guide.title': 'Sprint board',
      'guide.description': 'BMAD sprint status as a board',
      refresh: 'Re-read the sprint files',
      retry: 'Retry',
      loading: 'Reading the sprint status\u2026',
      loadFailed: 'Could not read the sprint files.',
      'noSprint.title': 'No sprint tracking file in this workspace',
      'noSprint.body':
        'The board looks for {names} anywhere in the Session workspace, checking the usual BMAD locations first.',
      'noSprint.searched':
        'Nothing matched {candidates} conventional locations, nor a scan {depth} directories deep.',
      'noSprint.retry': 'Search again',
      updated: 'Updated',
      viewLabel: 'Group the board by',
      viewStatus: 'Status',
      viewEpic: 'Epic',
      epicLabel: 'Epic',
      retroLabel: 'Retro',
      openSpec: 'Open the spec file',
      openRetro: 'Open the retrospective',
      noSpec: 'No spec file yet',
      'status.backlog': 'Backlog',
      'status.ready-for-dev': 'Ready for dev',
      'status.in-progress': 'In progress',
      'status.review': 'In review',
      'status.done': 'Done',
      'status.optional': 'Optional',
      'status.open': 'Open',
      actionsTitle: 'Retro action items',
      actionsDone: '{count} completed',
      noOpenActions: 'No open action items.',
      deferredTitle: 'Deferred work',
      noDeferred: 'No deferred work recorded.',
      deferredCount: '{count} deferred',
      deferredFrom: 'Deferred from story {id}',
      'shortcut.noSession': 'Open a Session to show the sprint board',
    };

    const zh = {
      refreshing: '\u6B63\u5728\u5237\u65B0\u2026',
      viewRequirements: '\u9700\u6C42',
      viewSpecs: '\u89C4\u683C',
      askAgentPill: '\u8BE2\u95EE\u667A\u80FD\u4F53 \u00B7 \u63D0\u793A\u8BCD',
      specTitle: '\u72EC\u7ACB\u89C4\u683C',
      'specGuide.title': '\u72EC\u7ACB\u89C4\u683C',
      'specGuide.description': '\u51B2\u523A\u6587\u4EF6\u4E2D\u6CA1\u6709\u4EFB\u4F55\u6545\u4E8B\u58F0\u660E\u7684\u89C4\u683C',
      specDeclared: '\u5171 {count} \u4EFD',
      specDone: '{count} \u5DF2\u5B8C\u6210',
      specOpen: '{count} \u4ECD\u672A\u5B8C\u6210',
      specOpenTag: '\u4E0D\u5728\u51B2\u523A\u6587\u4EF6\u4E2D',
      specDoneTag: '\u65E0\u4EBA\u8BA4\u9886',
      specPickUp: '\u8BA9\u667A\u80FD\u4F53\u63A5\u624B',
      unmappedNote: '{declared} \u9879\u4E2D {count} \u9879\u672A\u6620\u5C04',
      actionsCount: '{open} \u9879\u5F85\u529E\uFF0C{done} \u9879\u5DF2\u5B8C\u6210',
      specTitle: '\u72EC\u7ACB\u89C4\u683C',
      'specGuide.title': '\u72EC\u7ACB\u89C4\u683C',
      'specGuide.description': '\u51B2\u523A\u6587\u4EF6\u4E2D\u6CA1\u6709\u4EFB\u4F55\u6545\u4E8B\u58F0\u660E\u7684\u89C4\u683C',
      specDeclared: '\u5171 {count} \u4EFD',
      specDone: '{count} \u5DF2\u5B8C\u6210',
      specOpen: '{count} \u4ECD\u672A\u5B8C\u6210',
      specOpenTag: '\u4E0D\u5728\u51B2\u523A\u6587\u4EF6\u4E2D',
      specDoneTag: '\u65E0\u4EBA\u8BA4\u9886',
      specPickUp: '\u8BA9\u667A\u80FD\u4F53\u63A5\u624B',
      deferredAction: '\u8BE2\u95EE\u662F\u5426\u63A5\u624B',
      takeActionItem: '\u8BA9\u667A\u80FD\u4F53\u63A5\u624B',
      finishActionItem: '\u8BA9\u667A\u80FD\u4F53\u5B8C\u6210',
      reqTitle: '\u9700\u6C42',
      'reqGuide.title': '\u9700\u6C42',
      'reqGuide.description':
        '\u6309\u7C7B\u522B\u5217\u51FA\u6BCF\u4E00\u9879\u58F0\u660E\u7684\u9700\u6C42\uFF0C\u4EE5\u53CA\u8BC1\u636E\u652F\u6301\u7684\u72B6\u6001',
      reqDeclared: '\u5171 {count} \u9879',
      reqDone: '{count} \u5DF2\u5B8C\u6210',
      reqPartial: '{count} \u90E8\u5206',
      reqTodo: '{count} \u672A\u5F00\u59CB',
      reqUnknown: '{count} \u65E0\u8BC1\u636E',
      unmappedNote: '{declared} \u9879\u4E2D {count} \u9879\u672A\u6620\u5C04',
      gapsLabel: '\u95EE\u9898',
      unverLabel: '\u65E0\u6CD5\u6838\u5B9E',
      copied: '\u5DF2\u590D\u5236',
      copyFailed: '\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u5E76\u590D\u5236',
      barNoData: '{label}\uff1a\u65e0\u6570\u636e',
      cannotMeasure: '\u65e0\u6cd5\u6d4b\u91cf',
      barStories: '\u6545\u4e8b',
      barRequirements: '\u9700\u6c42',
      barLabel: '{label}\uff1a{total} \u9879\u4e2d\u5b8c\u6210 {done} \u9879',
      barLabelUnknown:
        '{label}\uff1a{total} \u9879\u4e2d\u5b8c\u6210 {done} \u9879\uff0c{unknown} \u9879\u65e0\u6cd5\u6838\u5b9e',
      unknownHint: '{count} \u9879\u65e0\u6cd5\u6838\u5b9e',
      nothingVerifiable: '\u65e0\u53ef\u6838\u5b9e\u9879',
      nextLabel: '\u4e0b\u4e00\u6b65',
      allDone: '\u6240\u6709\u6545\u4e8b\u5df2\u5b8c\u6210\u3002',
      gapsTitle: '\u95ee\u9898\uff08{count}\uff09',
      unverTitle: '\u65e0\u6cd5\u6838\u5b9e\uff08{count}\uff09',
      askAnAgent: '\u8be2\u95ee\u667e\u80fd\u4f53',
      title: 'BMAD \u51B2\u523A\u770B\u677F',
      'guide.title': '\u51B2\u523A\u770B\u677F',
      'guide.description':
        '\u4EE5\u770B\u677F\u5F62\u5F0F\u5C55\u793A BMAD \u51B2\u523A\u72B6\u6001',
      refresh: '\u91CD\u65B0\u8BFB\u53D6\u51B2\u523A\u6587\u4EF6',
      retry: '\u91CD\u8BD5',
      loading: '\u6B63\u5728\u8BFB\u53D6\u51B2\u523A\u72B6\u6001\u2026',
      loadFailed: '\u65E0\u6CD5\u8BFB\u53D6\u51B2\u523A\u6587\u4EF6\u3002',
      'noSprint.title':
        '\u6B64\u5DE5\u4F5C\u533A\u4E2D\u6CA1\u6709\u51B2\u523A\u8DDF\u8E2A\u6587\u4EF6',
      'noSprint.body':
        '\u770B\u677F\u4F1A\u5728\u4F1A\u8BDD\u5DE5\u4F5C\u533A\u4E2D\u641C\u7D22 {names}\uFF0C\u5E76\u4F18\u5148\u68C0\u67E5\u5E38\u89C1\u7684 BMAD \u4F4D\u7F6E\u3002',
      'noSprint.searched':
        '\u5DF2\u68C0\u67E5 {candidates} \u4E2A\u5E38\u89C1\u4F4D\u7F6E\uFF0C\u5E76\u626B\u63CF\u5230 {depth} \u5C42\u6DF1\u5EA6\uFF0C\u5747\u672A\u547D\u4E2D\u3002',
      'noSprint.retry': '\u91CD\u65B0\u641C\u7D22',
      updated: '\u66F4\u65B0\u4E8E',
      viewLabel: '\u5206\u7EC4\u65B9\u5F0F',
      viewStatus: '\u72B6\u6001',
      viewEpic: '\u8BBE\u5B9A\u96C6',
      epicLabel: '\u8BBE\u5B9A\u96C6',
      retroLabel: '\u56DE\u987E',
      openSpec: '\u6253\u5F00\u89C4\u683C\u6587\u4EF6',
      openRetro: '\u6253\u5F00\u56DE\u987E\u6587\u4EF6',
      noSpec: '\u5C1A\u65E0\u89C4\u683C\u6587\u4EF6',
      'status.backlog': '\u5F85\u529E',
      'status.ready-for-dev': '\u53EF\u5F00\u53D1',
      'status.in-progress': '\u8FDB\u884C\u4E2D',
      'status.review': '\u5BA1\u67E5\u4E2D',
      'status.done': '\u5DF2\u5B8C\u6210',
      'status.optional': '\u53EF\u9009',
      'status.open': '\u5F85\u529E',
      actionsTitle: '\u56DE\u987E\u884C\u52A8\u9879',
      actionsDone: '\u5DF2\u5B8C\u6210 {count} \u9879',
      noOpenActions: '\u6CA1\u6709\u5F85\u529E\u884C\u52A8\u9879\u3002',
      deferredTitle: '\u5EF6\u671F\u5DE5\u4F5C',
      noDeferred: '\u6CA1\u6709\u8BB0\u5F55\u5EF6\u671F\u5DE5\u4F5C\u3002',
      deferredCount: '\u5EF6\u671F {count} \u9879',
      deferredFrom: '\u6765\u81EA\u6545\u4E8B {id} \u7684\u5EF6\u671F\u9879',
      'shortcut.noSession':
        '\u9700\u8981\u6253\u5F00\u4E00\u4E2A\u4F1A\u8BDD\u624D\u80FD\u663E\u793A\u51B2\u523A\u770B\u677F',
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

        // Both tabs read the same artefacts through the same readers, so the
        // injection is built once and registered under each tab's own key.
        const paneInject = (sessionId) => ({
          sessionId,
                sessionId,
                readWorkspaceFile: (path, signal) =>
                  readWholeFile(
                    ctx.remote.workspaceFiles,
                    sessionId,
                    path,
                    signal,
                  ),
                listWorkspaceDir: async (path, signal) => {
                  const result = await ctx.remote.workspaceFiles.list(
                    sessionId,
                    path,
                    signal,
                  );
                  if (!result.ok) throw result.error;
                  return result.value.entries;
                },
                // Existence probes during the scan: a missing path is an answer,
                // not a failure, so this reports the miss instead of throwing.
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
