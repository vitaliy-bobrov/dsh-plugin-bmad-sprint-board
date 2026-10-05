# BMAD Sprint Board

A [DSH Harness](https://github.com/deepseek-ai/dsh) plugin that reads a
[BMAD](https://github.com/bmad-code-org/BMAD-METHOD) project and shows it in the
Session sidebar: what is being worked on, what disagrees with the tracking file,
and what to do next.

**Read-only.** It never writes to your sprint files. Every action it offers is a
string you copy — a command when the board knows what to do, a prompt when it
only knows what to ask.

```
Requirements │ BMAD Sprint board │ Chat
─────────────────────────────────────────
Status  Epic  Requirements  Specs

stories       ████████░░  12 / 15   80%
requirements  ███████░░░  11 / 17   65%
              ⚠ 23 of 40 unmapped

NEXT  bmad-build  Storefront Header Navigation Tools Integration
      it is the next unstarted story        [Ask agent · prompt]

● DONE (12)   ● GAPS (4)   ● COULD NOT CHECK (1)   ● BACKLOG (3)
```

## What you get

### Four views, one tab

| View | Shows |
|---|---|
| **Status** | One foldable lane per story status, in board order, with the gaps board below |
| **Epic** | One section per epic: its status, retrospective state, and progress |
| **Requirements** | Every declared requirement by class, each with the state its evidence supports |
| **Specs** | The spec files no story in the sprint file claims |

Requirements and specs are readings of the same artefacts, so they are views of
the same tab rather than tabs of their own.

The requirements lane is the one worth knowing about, because it has **four**
states rather than two:

| Mark | State | Meaning |
|---|---|---|
| `✓` | done | verifiable, and verified |
| `◑` | partial | some covering epic is finished |
| `✗` | not started | verifiable, and nothing has begun |
| `○` | no evidence | nothing can say either way |

`○` is the point. A requirement with no coverage map and no story citing it is
not "not done" — the board cannot tell, and says so rather than guessing.

### The gaps board

The board is a **check on** the tracking file, not a mirror of it.

| Detector | Fires when |
|---|---|
| **B1 done but owing** | a story is `done` while deferred entries still name its spec |
| **B3 review patches never applied** | a story is `done` with unticked `[Review][Patch]` items |
| **U1 UX run not carried into the plan** | a UX design run the epics document never names |
| **U2 UX requirement no epic delivers** | a UX requirement whose components no story mentions |
| **REQ** | requirements the inventory declares that no coverage map claims |

Alongside them: two sparse progress bars side by side — stories against
requirements, because the distance between them is the finding — and **one next
action**, chosen from BMAD's own ladder rather than invented. A board that offers
three next actions has not answered.

**Unverifiable is a state, never a silence.** A check that cannot be evaluated
reports itself, and the bar's denominator never shrinks — so the board cannot
improve its score by going blind.

### Keyboard

`primary+S` on desktop, `primary+alt+S` on the web, opening in whichever sidebar
pane you are already in. `web:linux` declares no default on purpose: the Harness
admits only three chords product-wide there, so every shipped tab command omits
it rather than squat on one.

## Install

**From npm** — nothing to build, no dependencies, no install scripts:

```
plugin_manager({ action: "install_bundle",
                 target: "dsh-plugin-bmad-sprint-board" })
```

**From the repository:**

```
plugin_manager({ action: "install_bundle",
                 target: "github:vitaliy-bobrov/dsh-plugin-bmad-sprint-board" })
```

**From a local clone**, which is the form used while developing it:

```
plugin_manager({ action: "install_bundle",
                 target: "/path/to/bmad-sprint-board-bundle" })
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

## Extending

The plugin is two layers, and only the second knows about DSH:

| What | Where |
|---|---|
| What the board reads and computes | `src/core.js`, `src/detect.js`, `src/plan.js`, `src/ux.js`, `src/requirements.js` — pure, no DSH, no DOM |
| How it renders | `src/shell-*.js` — CSS, components, slot registration |

Adding a **view** is one entry in the `VIEWS` list in `src/shell-post.js` plus a
body function; the switcher, the fold state and the snapshot are already shared.

Adding a **detector** is a function returning gaps shaped
`{ id, title, severity, subject, evidence, action }` and one line in `detect()`.
`src/detect.test.js` shows the shape: the fixtures there prove a detector *fires*,
while the live-workspace tests only prove it *agrees* with the repository. Those
are different jobs, and keeping them apart is what stops a sprint in progress
from breaking the suite.

```bash
node build.mjs          # reassemble client.js from src/
node build.mjs --check  # fail if client.js and src/ have drifted apart
node --test src/*.test.js
```

`client.js` is committed on purpose: an install from a registry or a git URL does
no build, so the assembled bundle has to be present. Edit `src/`, rebuild, and
`--check` will tell you if you forget.

## More

- [Implementation notes](https://github.com/vitaliy-bobrov/dsh-plugin-bmad-sprint-board/blob/main/docs/implementation.md) — what every section renders
  from, how paths and folds resolve, the parsing, the bundle layout. None of it is
  needed to install or use the plugin.

## Licence

MIT — see [LICENSE](LICENSE).
