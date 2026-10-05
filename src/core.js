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
 * @module dsh-plugin-bmad-sprint-board/core
 */

/** Names a BMAD sprint-tracking file goes by, in preference order. */
export const SPRINT_FILENAMES = ['sprint-status.yaml', 'sprint-status.yml'];

/**
 * Directories a BMAD install keeps its tracking file in, relative to the
 * workspace root, probed before any scan. The first is the conventional
 * layout; the rest cover a reconfigured output folder, so the common case
 * costs a couple of stats rather than a walk. The empty string is the root.
 */
export const SPRINT_CANDIDATES = [
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
export const SCAN_SKIP = new Set([
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
export const SCAN_MAX_DEPTH = 4;

/** Hard ceiling on the directory listings one scan may issue. */
export const SCAN_MAX_DIRS = 400;

/** Resolved tracking-file locations, per Session, so a refresh need not rescan. */
const locatedSprint = new Map();

/**
 * Join a workspace-relative directory and a child name.
 * @param dir - the directory, or the empty string for the workspace root.
 * @param name - the child's basename.
 * @returns the workspace-relative path.
 */
export function under(dir, name) {
  return dir === '' ? name : `${dir}/${name}`;
}

/**
 * The directory part of a workspace-relative path.
 * @param path - a workspace-relative path.
 * @returns the directory, or the empty string for a root-level file.
 */
export function dirOf(path) {
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
export async function fileExists(stat, path, signal) {
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
export async function probeCandidates({ stat }, signal) {
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
export async function scanForSprint({ list }, signal) {
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
export async function locateSprintPath(readers, sessionId, signal) {
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
export const STATUS_ORDER = [
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
export const STATUS_TONE = {
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
export function toneOf(status) {
  return STATUS_TONE[status] ?? 'neutral';
}

/** The colour an epic with no recognised status falls back to. */

/** The marker a fold header uses while its body is open and closed. */

/** How many lines one `workspaceFiles.read` page asks for. */
export const PAGE_LINES = 2000;

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
export async function readWholeFile(face, sessionId, path, signal) {
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
export function quotesOpen(value) {
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
export function unquote(value) {
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
export const TOP_LEVEL = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;
/** `  key: value` under `development_status`. */
export const STATUS_ENTRY = /^\s+([^\s:#][^:]*):[ \t]*(.*)$/;
/** `  - key: value` opening one `action_items` element. */
export const ACTION_START = /^\s*-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/;
/** `  key: value` continuing the current `action_items` element. */
export const ACTION_FIELD = /^\s+([A-Za-z_][\w-]*):[ \t]*(.*)$/;
/** Any line that is indented, so it belongs to the block above it. */
export const INDENTED = /^\s/;

/**
 * Whether a document line carries no content.
 * @param line - one raw line.
 * @returns true when the reader should skip it.
 */
export function isSkippable(line) {
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
export function readStatusMap(lines, start, into) {
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
export function consumeActionLine(state, line, into) {
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
export function readActionItems(lines, start, into) {
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
export function normalizeAction(raw) {
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
export function parseSprintStatus(text) {
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
export const LEDGER_HEADING = /^##[ \t]+(.+?)[ \t]*$/;
/** `**Source:** value` and its two siblings. */
export const LEDGER_LABEL = /^\*\*(Source|File|Description):\*\*[ \t]*(.*)$/;
/** A bullet block's own `- key:` line, or an indented `key:` sibling. */
export const LEDGER_FIELD = /^(?:-[ \t]+|[ \t]+)([A-Za-z_]+):[ \t]*(.*)$/;
/** The `D<n>` number a legacy heading carries. */
export const LEDGER_ID = /^(D\d+)\s*:/;

/**
 * Start one empty ledger entry.
 * @param heading - the entry's `## ` heading text, when it had one.
 * @returns a blank entry.
 */
export function blankLedgerEntry(heading) {
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
export function closesLedgerEntry(entry) {
  return entry.bullet || entry.spec !== '' || entry.description !== '';
}

/**
 * Apply one bullet-block field to its entry.
 * @param entry - the entry being read.
 * @param key - the field name.
 * @param value - the raw field value.
 */
export function applyLedgerField(entry, key, value) {
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
export function consumeLedgerLine(current, line) {
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
export function parseDeferredWork(text) {
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
export function humanize(slug) {
  return String(slug)
    .split('-')
    .filter((word) => word !== '')
    .map((word) =>
      /^\d+$/.test(word) ? word : word[0].toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/** An epic rollup key. */
export const EPIC_KEY = /^epic-(\d+)$/;
/** An epic retrospective key. */
export const RETRO_KEY = /^epic-(\d+)-retrospective$/;
/** A story key, `<epic>-<index>-<truncated slug>`. */
export const STORY_KEY = /^(\d+)-(\d+)-(.+)$/;

/**
 * Split the `development_status` map into its three kinds of row.
 * @param status - the key -> status map.
 * @returns the epic rollups, the stories, and epic number -> retrospective status.
 */
export function classifyStatus(status) {
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
export function specSlugsOf(entries) {
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
export function bestSpecSlug(slugs, key) {
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
export function linkStoriesToSpecs(stories, entries, storyDir) {
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
export function summarizeEpics(epics, stories, retrospectives) {
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
export function countByStatus(stories) {
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
export function linkDeferredToStories(deferred, stories) {
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
export function buildModel(sprintText, deferredText, entries, sprintPath) {
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
