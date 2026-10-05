# BMAD Sprint Board

A DSH Harness plugin that renders the project's BMAD sprint status as a board in
the Session's right Sidebar — the same column that already holds Chat, Guide,
Files and Terminal.

## What it adds

- **One tab type** (`bmad-sprint-board`) in the right Sidebar, opened from a
  **"Sprint board"** entry on the Guide page.
- **One guide entry** so the board is discoverable without a shortcut, carrying
  its own **glyph** (`GuideArtworkSprintBoard`) so it sits beside Files,
  Terminal and Browser instead of falling back to the guide's cube placeholder.

The board is **read-only**. It never writes to the sprint files.

## The four views

One tab, four readings of the same artefacts, switched in the header:

| View | What it shows |
|---|---|
| **Status** | One lane per story status, with the gaps board below |
| **Epic** | One section per epic, with the gaps board below |
| **Requirements** | Every declared requirement by class: functional, acceptance, architecture, non-functional, additional, UX |
| **Specs** | The spec files no story in the sprint file claims |

Each requirement row carries the strongest state its evidence supports, and
there are four rather than two:

| Mark | State | Meaning |
|---|---|---|
| `✓` | done | verifiable, and verified |
| `◑` | partial | some covering epic is finished |
| `✗` | not started | verifiable, and nothing has begun |
| `○` | no evidence | nothing can say either way |

`○` is the point of the view. A requirement with no coverage map and no story
citing it is not "not done" — the board cannot tell, and says so rather than
guessing.

Requirements and specs were separate sidebar tabs until they became views here:
three entries in the launcher for one board, and three separate reads of the
same files.

## Keyboard shortcut

`bmad.sprint-board`, label "Sprint board", aliases *sprint board*, *bmad sprint*,
*sprint*, *board*, *kanban*. It resolves through the right Sidebar's captured
command target, so it opens the board in the pane the user is already in, and
reports a blocked reason instead of failing when no Session is on screen. It is
registered in the `page`, `editable`, and `terminal` regions, so it works while
the composer has focus, like every other sidebar tab command.

| Profile | Default |
|---|---|
| `desktop:macos` / `windows` / `linux` | `primary+S` |
| `web:macos` / `web:windows` | `primary+alt+S` |
| `web:linux` | *(none — see below)* |

`S` for sprint. The Registry validates every declared default against every
profile and **throws** on a collision, so the choice is not free: `K` is taken by
*Search sessions*, `B` by both sidebar toggles, `P` by Files, `T` by Browser, `O`
by Add workspace, and `primary` + `C`/`V`/`X`/`Z`/`Y`/`Q`/`H`/`A` are reserved.

**`web:linux` has no default on purpose.** For a Linux browser the Harness admits
only three combinations product-wide (`primary+/`, `primary+shift+,`,
`primary+shift+.`), so there is no sane chord left to claim; every shipped tab
command omits `web:linux` for the same reason. The command is still registered
there, so it appears in the shortcut list and can be bound by hand.

On the Guide capsule the entry shows its resolved keycap automatically, because
the guide entry carries `commandId`. Where no binding resolves, the capsule
simply renders without one.

## What it renders

Read from the file-system tracking system the BMAD sprint-planning skill writes.

| Section | Source |
|---|---|
| Overall progress (`10 of 15 stories done`, stacked bar, percent) | `development_status` story keys |
| **Status** view — one lane per story status, in board order (`in-progress` → `review` → `done` → `ready-for-dev` → `backlog`), each with a count and a fold | `development_status` |
| **Epic** view — one section per epic with its own status, retrospective status and `done/total` bar | `epic-<n>`, `epic-<n>-retrospective` |
| **Retro action items** — the open items, plus a completed count | `action_items` |
| **Deferred work** | `deferred-work.md` |

### Fold defaults

Folds are held as an **override map**, not a set of closed keys: a key's state is
the reader's own last choice if they have touched it, and otherwise the default
the board derives from the model.

| Lane or section | Starts |
|---|---|
| Status lane `done` | folded — the longest lane |
| Epic whose status is `done` | folded — its stories are the least likely to need listing |
| Everything else | open |

Because the default is computed per read rather than seeded once, an epic that
becomes `done` folds itself on the next read, while an epic the reader has opened
by hand stays open. A refresh therefore never undoes a choice, and never strands
a section in a state the model no longer justifies.

### Lane order

Lanes are ordered for reading the board top-down rather than by workflow: what is
being worked on, then what is waiting on review, then what is finished, then the
not-yet-started stories. A lane appears only while a story is in that status, so
an empty block costs nothing.

### The header bar

The header bar is stacked rather than a single fill, so work in flight is visible
without reading the lanes. Left to right: **done** (green), then **in review**
(orange), then **in progress** (blue), with the remaining track showing what has
not started. Segment widths are each status's share of all stories, and the
segments reuse the lane markers' tokens so the bar and the board agree. A status
with no stories contributes no segment.

The bar is `role="img"` carrying the whole breakdown as its label — "10 of 15
done, 1 in review, 0 in progress" — so the numbers never depend on telling three
colours apart. It is not `aria-hidden`, precisely because it now carries counts
the visible text does not.

### Marker colours

Each lane header, and each epic header in the Epic view, carries a dot coloured
by status, read along the story's life and taken from one family of `state-*`
aliases:

| Status | Token | Light | Dark |
|---|---|---|---|
| `backlog` | `--dsw-alias-state-idle-primary` | `#d4d4d4` grey | `#545557` grey |
| `ready-for-dev` | `--dsw-alias-label-secondary` | `#61666b` neutral | `#cfd3d6` neutral |
| `in-progress` | `--dsw-alias-state-business-primary` | `#4176e6` blue | `#7aaaff` blue |
| `review` | `--dsw-alias-state-warn-primary` | `#f59e0b` orange | `#f59e0b` orange |
| `done` | `--dsw-alias-state-success-primary` | `#22c55e` green | `#22c55e` green |

The blue is deliberately **not** `--dsw-alias-brand-primary`. Despite the name,
that token is the primary *ink* — `#0f1115` in light, `#f9fafb` in dark — i.e.
what a solid primary button fills with, so on a 7px dot it reads as no colour at
all. `--dsw-alias-state-business-primary` is the theme's actual blue in both
themes. The design system also carries the same blue under
`--dsw-alias-brand-primary-new-colorprimary-new-color`, but that name is
malformed in the generated theme, so it is not safe to depend on.

### Cards link to their file

A story card opens its spec file in the Sidebar's document preview. Story keys in
`sprint-status.yaml` are *truncated* prefixes of the spec-file slug, so the board
lists `story_location` and resolves each key to the shortest `spec-*.md` slug that
starts with it. A story with no spec file yet renders as a plain, non-interactive
card marked "No spec file yet".

Retro action items link to their `ref`; deferred entries link to their
`source_spec` (or to `deferred-work.md` itself when the ledger says
`source_spec: none`).

### Deferred work links to its story

A deferred entry's `source_spec` is the *same workspace path* a story card opens,
so when it names a story's spec the board draws the relation in both directions:

- the deferred card carries a `↳ <epic>.<index>` chip, whose tooltip reads
  "Deferred from story 3.2";
- that story's card, in either view, carries a "3 deferred" line under its title.

The link is matched on the resolved path, not on prose, so it is exact. An entry
that names a freeform spec — one with no `<epic>-<index>-` prefix, such as
`spec-enable-biome-react-domain.md` — belongs to no story and simply shows no
chip. Nothing is inferred from the entry's title or evidence text.

## The gaps board

The board is a **check on** the tracking file, not a mirror of it. Alongside the
lanes it shows:

- **Two sparse bars, side by side.** `stories 12/15` and `requirements 11/17` —
  never a toggle, because the distance between them is the finding. Requirements
  come from the FR Coverage Map and count as delivered only when *every* epic
  carrying them is done.
- **One next action**, rendered from BMAD's own six-rule ladder rather than
  invented. One answer with its reason: a board that offers three has not answered.
- **Gaps**, each with its evidence and an action that is a string you copy — a
  command when the board knows what to do, a prompt when it only knows what to
  ask.

| Detector | Fires when |
|---|---|
| **B1 done but owing** | a story is `done` while deferred entries still name its spec |
| **B3 review patches never applied** | a story is `done` with unticked `[Review][Patch]` items |

**Unverifiable is a state, never a silence.** A check that cannot be evaluated
reports itself — an outlined, unfilled cell in the bar plus an entry with a prompt
— and the bar's denominator never shrinks, so the board cannot improve its score by
going blind.

### Where the paths come from

`_bmad/config.toml` declares them, because BMAD lets a project move its output
folders. `implementation_artifacts` and `planning_artifacts` are read from there;
the conventional-candidate probe and the bounded scan remain, but only as the
fallback for when config is absent.

## The core and the shell

The board's logic lives in a **host-independent core**; DSH is one shell around it.

```
src/core.js      parse + model + discovery     src/detect.js   the detectors
src/config.js    BMAD config + paths           src/plan.js     coverage, ladder, bars
src/analyse.js   the composed entry            src/shell-*.js  the DSH shell
```

Nothing in those core modules names DSH, Cordis, React or the DOM — asserted by
`src/boundary.test.js`, not trusted. The filesystem readers arrive as parameters,
so a second shell could supply different ones.

DSH serves a client bundle as one built file and its loader resolves only platform
seeds and registered factories, so the core is inlined rather than imported:

```
node build.mjs            write client.js
node build.mjs --check    fail if it is stale
node --test src/*.test.js run the suite
```

Zero dependencies — the bundle had none and a build step is not worth a package.

## Finding the files

**No path is hardcoded.** Everything resolves against the Session's *selected
workspace* through the Host `workspaceFiles` Remote face, so no Host half is
needed and no filesystem path escapes that workspace.

The tracking file is located in three steps, cheapest first:

1. **The cached answer**, revalidated with a `stat`. The location is remembered
   per Session, so opening the board again costs one probe.
2. **Conventional locations** — `_bmad-output/implementation-artifacts`,
   `_bmad-output`, `_bmad/implementation-artifacts`, `_bmad`, `docs`, `bmad`,
   `.bmad`, and the workspace root — each tried for `sprint-status.yaml` and
   `sprint-status.yml`. The usual layout is found here for the price of a few
   stats.
3. **A bounded workspace scan**, because a project may keep BMAD output
   anywhere. It is breadth-first, so the shallowest match wins, and bounded
   three ways so an unfamiliar workspace still settles: `SCAN_MAX_DEPTH` (4),
   `SCAN_MAX_DIRS` (400 listings), and a skip list for build and vendored trees
   (`node_modules`, `dist`, `.git`, `.cache`, …).

Everything else is then read *relative to where the file was found*, not from a
constant:

| File | Resolved from |
|---|---|
| spec files | the tracking file's own `story_location` field, falling back to the tracking file's directory |
| `deferred-work.md` | probed beside the story files, then beside the tracking file; absent means the lane reports no deferred work |
| the tracking file | the scan above |

That means a project that reconfigures its BMAD output folder, or keeps the
tracking file somewhere unusual, works without editing the plugin.

### When there is no tracking file

A workspace with no tracking file is reported as **missing, not failed** — the
board says so plainly, names the filenames it looked for, and states how many
conventional locations and how many directory levels it searched, with a
**Search again** button. Nothing went wrong, so it does not dress up an expected
state as an error.

A tracking file that *is* found and then fails to read is a different case and
keeps the error treatment, reporting the actual reason.

## Parsing

`sprint-status.yaml` is read with a small targeted parser, not a general YAML
parser — it accepts exactly the shape the BMAD sprint-planning skill writes
(scalar header, flat `development_status` map, folded `action_items` list) and
ignores anything else.

`deferred-work.md` intentionally mixes two ledger shapes, and the board reads
both as separate entries:

1. The older hand-written `## D<n>: <title>` block with `**Source:**` /
   `**File:**` / `**Description:**` lines.
2. The shape the build workflow appends for a newly split goal — a bare
   `- source_spec:` / `summary:` / `evidence:` block with **no heading**, which is
   what `bmad-build` step-01 prescribes. Its `summary` becomes the card title, and
   `source_spec: none` means the card links to the ledger itself.

## Styling

Every rule uses only `--dsw-alias-*` tokens and `--dsw-specific-sidebar-fill`, so
the board follows the host's light and dark themes with no literal colour of its
own. It imports no Harness Client package; the controls are plain elements styled
to match the host.

The one exception is the guide glyph, which follows the shipped artwork contract
(`IconProps`: `{ size = 36, className }`, a `36` viewBox, `aria-hidden`). Artwork
is the single place a literal colour is correct, and it is drawn in the product's
existing palette — `#A797FC` for the board frame and lanes, `#8B7BF7` for the
cards — so it needs no theme tokens and is left untinted by the guide.

## Layout

The tab body is a fixed-height flex column with its own scroller, so the header
(project, progress, view toggle) stays put while the board scrolls. Story cards
are stacked lanes rather than side-by-side columns, because the Sidebar is a
narrow column and horizontal kanban columns would be unreadable there; the
**Epic** toggle gives the swimlane view instead.

## Bundle layout

| File | Purpose |
|---|---|
| `package.json` | Bundle manifest: the patch, the `dsh.client` half, and the icon |
| `cordis.patch.yml` | Inserts the `bmad-sprint-board` row |
| `index.js` | Host half — intentionally empty |
| `client.js` | The whole feature: tab type, guide entry, parsers, board |
| `icon.svg` | The artwork the Settings → Plugins page shows for this bundle |
| `locale/en.json`, `locale/zh.json` | The title and description that page shows |

## Display metadata

The Plugins page reads a bundle's title, description, and icon through
`readPluginMeta` in `dsh-app-boot`. That reader resolves two **subpath exports**
of the package, and nothing else:

```
<package>/locale/<language>.json     the preferred, localized source
<package>/package.json               the fallback, plus `icon`
```

So an `exports` map that declares only `.` and `./client` makes a bundle
**invisible to the reader** — no manifest, therefore no title, description, or
icon, and the page falls back to the bare package name. The map must also carry:

```json
"./locale/*.json": "./locale/*.json",
"./package.json": "./package.json"
```

Each `locale/<language>.json` holds `{ "meta": { "title", "description" } }`, the
filename being the language id. Title and description resolve to a per-language
object for the Client to pick from; English falls back to the manifest's `name`
and `description`, and the title finally to the package specifier. `icon` is a
**relative path** to an SVG, PNG, JPEG, or WebP file inside the bundle, at most
256 KiB, served as a data URL — so the icon must not reference anything outside
the bundle.

`icon.svg` is a 36×36 gradient board: a violet-to-blue rounded rectangle carrying
three white pills of unequal length, one per kanban lane. It matches the shipped
plugin artwork's weight — a saturated gradient on chunky shapes, readable down to
36px — while staying a filled sibling of the outline board glyph the Guide entry
draws.

## Install

`install_bundle` takes four kinds of target. From a repository:

```
plugin_manager({ action: "install_bundle",
                 target: "github:vitaliy-bobrov/dsh-plugin-bmad-sprint-board" })
```

From a local clone — the form used while developing it:

```
plugin_manager({ action: "install_bundle",
                 target: "/path/to/bmad-sprint-board-bundle" })
```

A registry spec and a `.tgz` tarball work the same way. Nothing needs building:
`client.js` ships assembled, the package has no dependencies, and it runs no
install scripts.

### Peer dependency

The manifest declares one peer, and the range is not the obvious one:

```json
"peerDependencies": { "@deepseek-ai/dsh": "^0.2.0-0" }
```

A plain `^0.2.0` is **rejected**. The compatibility check compares the range
against the running version with prereleases included, and against a runtime
such as `0.2.0-rc.2` a bare `^0.2.0` does not match — so the install is refused
before pnpm runs. `^0.2.0-0` resolves to `>=0.2.0-0 <0.3.0-0`: prereleases of
0.2.0 and every later 0.2.x patch, and nothing beyond.

Installed as a `link:` dependency, this directory is the live source: edits to
`client.js` take effect on the next rebuild, which the watcher picks up.

If the bundle is moved again, re-run `install_bundle` from the new path: the
profile records an absolute link, and replacing a link that pointed elsewhere
reports `application: "restart-required"`. In practice the Client half
re-resolves on the next page reload and the Host half is a no-op, so nothing
needs restarting for this bundle — but the report is worth reading rather than
assuming.

## Location

This bundle lives **outside** the storefront repository, beside the other
out-of-tree bundles, so the repo carries no harness tooling:

```
/workspace/dsh-bundles/    every out-of-tree bundle: this one, github-mcp,
                           shopify-mcp, sidebar-browser, drunk-beaver-theme, …
```

**Resolve the path; do not recall it.** The profile states where it installed
from, and that is the only answer that cannot be stale:

```bash
grep bmad-sprint-board /root/.dsh/profiles/web/package.json
#   "@local/dsh-plugin-bmad-sprint-board": "link:/workspace/dsh-bundles/bmad-sprint-board-bundle"
```
