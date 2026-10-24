# BMAD Sprint Board

A [DSH Harness](https://github.com/deepseek-ai/dsh) plugin that reads a
[BMAD](https://github.com/bmad-code-org/BMAD-METHOD) **v7** project and shows it
in the Session sidebar: every initiative, what is being worked on, and what the
ticket store disagrees with the tickets on disk.

**Read-only.** It never writes to your ticket store. Every action it offers is a
string you copy.

```
Requirements │ BMAD Sprint board │ Chat
-------------------------------------------
Status   Epic   Tickets   Initiatives

tools  done    4 epics   16 tickets      <- initiative, active when set

GAPS (2)
  L1  plans not linked in the ticket store        high
      16 plan files match a ticket by name, but no entry
      declares them with a ticket key             [Ask agent · prompt]
  C1  epic settled with open tickets              high
      epic-tools-landing says done, 2 tickets open

BLOCKED (1)  IN PROGRESS (2)  DONE (13)  UNKNOWN (29)
```

## What you get

### Four views, one tab

| View | Shows |
|---|---|
| **Status** | One foldable lane per ticket state, with a gaps board beneath it |
| **Epic** | One section per epic: its status, its tickets, and its progress |
| **Tickets** | Every ticket in the initiative, grouped by state, across all epics |
| **Initiatives** | Every initiative with its status and counts, marking the active one |

Selecting an initiative in **Initiatives** loads it into the other three views.
The selection is local: nothing is written back, so looking at another initiative
cannot change which one BMAD considers active.

### BMAD v7 only

This is version 2. Version 1 read BMAD v6 -- `sprint-status.yaml`, `epics.md`,
`spec-*.md` -- and none of those exist in a v7 project. The two are different
data models, not different formatting, so the plugin is released in two versions:

| BMAD | Install |
|---|---|
| **v7** | `dsh-plugin-bmad-sprint-board` (this one, 2.x) |
| v6 | `dsh-plugin-bmad-sprint-board@1.0.0` |

Opened on a v6 project, 2.x says so and points at 1.0.0 rather than rendering an
empty board.

### The gaps board

The board is a **check on** the ticket store, not a mirror of it.

| Detector | Fires when |
|---|---|
| **L1** plans not linked | plan files match tickets by name, but no entry declares them with a `ticket` key |
| **L2** tickets with no plan | an index entry has no plan file, so its state is unknown |
| **L3** plans no ticket claims | a plan file corresponds to no index entry |
| **L4** unrecognised status | a ticket carries a status word this board does not know |
| **C1** epic settled with open tickets | an epic says `done` while tickets inside it are not |
| **C2** initiative settled with open tickets | an initiative says `done` while tickets inside it are not |
| **E1** initiative declares no epics | the folder exists and its store lists no epics |

**L1 is the one that matters on a migrated project.** BMAD's own `tickets.py`
links a plan to its entry through the plan's `ticket` key. A plan without one is
invisible to the tooling, which then reports the ticket as unstarted however
finished the plan is — so every number the tooling prints is wrong while every
file on disk looks correct.

**Unverifiable is a state, never a silence.** A ticket with no plan has an
*unknown* state, not a default one; it is counted in its own lane and reported,
never folded into "not started". A status word the board does not recognise is
shown but never counted as settled, because guessing that an unfamiliar word
means finished is how a board starts lying.

### How it reads a v7 project

It resolves the same two keys the official tooling does, by merging the same
three files lowest priority first:

```
_bmad/config.toml                 [core] output_folder
_bmad/custom/config.toml          team overrides
_bmad/custom/config.user.toml     [core] active_initiative
```

which is what `_bmad/scripts/resolve_config.py` does. The board agrees with that
script rather than assuming a layout.

## Install

From npm, into the `web` profile:

```sh
dsh plugin --profile web add dsh-plugin-bmad-sprint-board
```

Or from the repository, and from a local clone:

```sh
dsh plugin --profile web add github:vitaliy-bobrov/dsh-plugin-bmad-sprint-board
dsh plugin --profile web add /path/to/bmad-sprint-board-bundle
```

Substitute your own profile name for `web`. Nothing needs building, the package
has no dependencies, and it runs no install scripts. Reload the page afterwards:
the Client half registers on the next load, and the Host half contributes nothing
to register.

The same three, through the agent's tool rather than the CLI:

```
plugin_manager({ action: "install_bundle",
                 target: "dsh-plugin-bmad-sprint-board" })
```

### Peer dependency

The manifest declares one peer, and the range is not the obvious one:

```json
"peerDependencies": { "@deepseek-ai/dsh": "^0.2.0-0" }
```

A plain `^0.2.0` is **rejected**. The compatibility check compares the range
against the running version with prereleases included, and against a runtime such
as `0.2.0-rc.2` a bare `^0.2.0` does not match — so the install is refused before
pnpm runs. `^0.2.0-0` resolves to `>=0.2.0-0 <0.3.0-0`: prereleases of 0.2.0,
every later 0.2.x, and nothing beyond.

### Category

**UI & Experience.** It adds a sidebar tab and reads. It contributes no tool, no
model and no service, and it writes nothing.

## Extending

The plugin is two layers, and only the second knows about DSH:

| What | Where |
|---|---|
| Parsers | `src/toml.js`, `src/frontmatter.js` — the two readers BMAD's files need |
| The project model | `src/config.js`, `src/store.js`, `src/model.js`, `src/scan.js` — pure, no DSH, no DOM |
| The checks | `src/detect.js` |
| How it renders | `src/shell-*.js` — CSS, components, slot registration |

Adding a **view** is one entry in the view list in `src/shell-post.js` plus a body
function; the switcher, the fold state and the snapshot are already shared.

Adding a **detector** is a function returning gaps shaped
`{ id, title, severity, subject, evidence, action }` and one push in
`detectInitiative()`. `src/model.test.js` shows the shape: each detector is
tested against a fixture that should fire it *and* a clean fixture beside it,
because a detector nobody has checked can stay quiet is one nobody has checked.

```bash
node build.mjs          # reassemble client.js from src/
node build.mjs --check  # fail if client.js and src/ have drifted apart
node --test src/*.test.js
```

`client.js` is committed on purpose: an install from a registry or a git URL does
no build, so the assembled bundle has to be present. Edit `src/`, rebuild, and
`--check` will tell you if you forget.

## More

- [Implementation notes](https://github.com/vitaliy-bobrov/dsh-plugin-bmad-sprint-board/blob/main/docs/implementation.md)
  — the parsing, the linking rules and the bundle layout. None of it is needed to
  install or use the plugin.

## Licence

MIT — see [LICENSE](LICENSE).
