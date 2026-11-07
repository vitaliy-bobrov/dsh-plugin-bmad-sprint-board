# BMAD Sprint Board

A [DSH Harness](https://github.com/deepseek-ai/dsh) plugin that reads a
[BMAD](https://github.com/bmad-code-org/BMAD-METHOD) **v7** project and shows it
in the Session sidebar.

It answers two questions: **how healthy is the implementation**, and **what comes
next**. Not "are we on schedule" — the store holds no dates, and inventing them
would be the one thing this board refuses to do.

**Read-only.** It never writes to your ticket store. Every action it offers is a
string you copy.

```
Requirements │ BMAD Sprint board │ Chat
-------------------------------------------
Status  Requirements  Epic  Tickets  Initiatives

vip-reservations                              in progress -- 3 epics

NEXT   Plan the stories for "Account Reservations"   [Ask agent]

17  Unfinished        0  Does not add up
14 requirements: 9 covered, 5 partial, 0 uncovered

DONE (8)   DROPPED (1)

GAPS (2)
  B3  review patches never applied            high
      11 unticked [Review][Patch] items across 1 settled ticket
                                                  [Ask agent -- prompt]
  E2  epic has no stories                   medium
      epic-account-reservations lists no stories

16 unclassified file(s), 2 empty initiative(s)
```

## What you get

### Five views, one tab

| View | Shows |
|---|---|
| **Status** | The two numbers, the next step, one foldable lane per ticket state, and the findings |
| **Requirements** | Every requirement the initiative declares: its state, and what claims to deliver it |
| **Epic** | One section per epic: its status, its tickets, and its progress |
| **Tickets** | Every ticket in the initiative, grouped by state, across all epics |
| **Initiatives** | Every initiative with its status and counts, marking the active one |

Selecting an initiative in **Initiatives** loads it into the other four. The
selection is local: nothing is written back, so looking at another initiative
cannot change which one BMAD considers active.

### Two numbers, two meanings, never blended

| | |
|---|---|
| **Unfinished** | work committed and not delivered |
| **Does not add up** | two records disagreeing about one fact |

**Unfinished** sums the requirements nothing covers, deferred items still owed by
settled tickets, unticked review patches, UX runs the plan never names, UX
components no epic delivers, and epics with no stories.

**Does not add up** sums containers that say `done` while their tickets are not,
leaf tickets no index lists, plans no entry claims, and status words the store
does not define.

Both count **items**, not findings: eleven unticked patches is eleven things to
do, and one finding that says so is not eleven. Each number equals the length of
the lane beneath it, so you can count the entries and get the same answer.

Two facts are deliberately **not** in either number, because they are not debts:
files the store cannot classify, and initiatives with no epics. They appear once,
as a quiet line with a count, so nothing is hidden and nothing shouts.

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

### The checks

| | Fires when |
|---|---|
| **REQ** | a declared requirement has no epic and no ticket listing it in `covers` |
| **B1** | work was deferred off a ticket the store now calls settled |
| **B3** | a settled ticket still has unticked `[Review][Patch]` items |
| **U1** | a UX design run exists and nothing in the plan names it |
| **U2** | a component pattern in `EXPERIENCE.md` is named by no epic or ticket |
| **E2** | an epic exists and its ticket store lists no stories |
| **C1** | an epic says `done` while tickets inside it are not |
| **C2** | an initiative says `done` while tickets inside it are not |
| **L2** | a leaf ticket exists on disk with no entry in the ticket index |
| **L3** | a plan file corresponds to no index entry |
| **L4** | a ticket carries a status word the store does not define |
| **L1** | a file in a ticket folder is neither a leaf ticket nor a plan, so the store ignores it |
| **E1** | an initiative's ticket store lists no epics |

**L1 is worth knowing about on a migrated project.** The store decides what a
file is from its frontmatter `type`: `story`, `spike` or `bug` is a leaf that
carries the ticket, anything else declaring a `ticket` key is a plan over one,
and anything else is ignored. A file named `story-x-plan.md` whose type is
`feature` and which names no ticket is therefore *neither* — invisible to the
tooling, which reports its ticket as backlog however finished the work is. Every
number it prints is wrong while every file on disk looks correct.

**The board's lanes are the store's lanes.** States come from `tickets.py`'s own
table rather than being invented: an empty status is **backlog**, because a
planned story looks exactly like that before `bmad-build` writes its plan — a
plan is an artefact of building, not a precondition of existing. Only a status
word the store does not define becomes *unknown*, and it is counted as a
contradiction rather than as settled.

**A declared container status is believed as written.** An initiative finished and
later stripped of its tickets is indistinguishable from one that never started, so
the board reports what the file says rather than guessing. A container that is
*silent* is read from its children instead.

### On the ticket card

Everything the store already records, on one line, so the card stays a card:
`assignee`, `risk`, `estimate`, `after` (dependencies), and `blocked_reason` —
which replaces the rest when present, because "blocked and nobody says why" is
the state the line exists to prevent.

`hitl` appears **only while the ticket is unsettled**. A finished ticket whose
human step was performed still carries the flag, and nagging about work already
done is how a board stops being believed.

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

The plugin is layered, and only the last knows about DSH:

| What | Where |
|---|---|
| Parsers | `src/toml.js`, `src/frontmatter.js` — the two readers BMAD's files need |
| The project model | `src/config.js`, `src/store.js`, `src/model.js`, `src/scan.js` — pure, no DSH, no DOM |
| The artefacts | `src/requirements.js`, `src/deferred.js`, `src/ux.js` |
| The checks | `src/detect.js` |
| How it renders | `src/shell-*.js` — CSS, components, slot registration |

Adding a **view** is one entry in `VIEWS` in `src/shell-post.js` plus a body
function; the switcher, the fold state and the snapshot are already shared.

Adding a **detector** is a function returning gaps shaped
`{ id, title, severity, subject, evidence, action, items }` and one push in
`detectInitiative()`. `items` is what the headline counts — the things a reader
would work through, not the finding that describes them. Add the id to `BUCKETS`
to place it in **Unfinished**, **Does not add up**, or the footnote.

`src/model.test.js` shows the shape: each detector is tested against a fixture
that should fire it *and* a clean fixture beside it, because a detector nobody has
checked can stay quiet is one nobody has checked.

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
