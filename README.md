# opencode-buddy

A virtual ASCII pet companion for [opencode](https://opencode.ai). Use it as a `/buddy` slash command inside opencode, or as a tmux side pane next to it.

```
    opencode TUI                                   buddy pane
    ┌──────────────────────┐         ┌──────────────────────┐
    │                      │         │ ╭─ Quack the duck ─╮  │
    │   your opencode      │         │       __            │ │
    │   TUI here           │         │     <(o )___        │ │
    │                      │         │      ( ._> /        │ │
    │                      │         │       `--'          │ │
    │                      │         │                      │ │
    │                      │         │ hunger ████████░░ 79 │ │
    │                      │         │ happy  ████████░░ 79 │ │
    │                      │         │ energy ██████████ 100 │ │
    │                      │         │ keys: f feed · ...   │ │
    └──────────────────────┘         └──────────────────────┘
```

The buddy reacts to what you're doing — idles when you idle, cheers when opencode finishes a turn, gets scared when a session errors, falls asleep when energy runs low.

## Why?

Claude Code v2.1.88 had a fun `/buddy` easter egg (an ASCII pet companion). When Anthropic removed it in v2.1.97 the community revolted. This is the opencode equivalent: your own buddy, open source, never going to be taken away.

## Install

Requires Node.js ≥ 18. tmux is only needed for the side-pane mode (Mode B).

### Mode A: `/buddy` inside opencode (recommended)

```bash
npm install -g opencode-buddy
opencode-buddy install
```

This writes `~/.config/opencode/commands/buddy.md` and adds
`opencode-buddy` to your `opencode.json` `plugin` list. **Restart
opencode.** Then in the TUI:

```
/buddy                  show current status
/buddy feed             feed the buddy
/buddy play             play with the buddy (+xp)
/buddy rest             tuck the buddy in
/buddy switch cat       become a cat
/buddy switch dragon    become a dragon
/buddy rename Mia       rename
/buddy hatch dragon Sparky  start fresh
/buddy ascii            render ASCII art inline
/buddy help             list all actions
```

The buddy's mood is updated automatically: `session.idle` makes it
celebrate, `session.error` makes it scared, low energy sends it to sleep.

### Mode B: tmux side pane (optional, for a permanent companion)

```bash
npm install -g opencode-buddy
```

In any tmux pane (next to your opencode pane):

```bash
opencode-buddy start
```

A 28-column side pane splits off to the right and the buddy appears
inside it, rendered in full ASCII with color. Press keys in the buddy
pane to interact:

| Key | Action |
| --- | --- |
| `f` | Feed (+25 hunger) |
| `p` | Play (+20 happiness, +5 xp) |
| `z` | Rest (+30 energy) |
| `r` | Rename (prompts in the pane) |
| `s` | Switch species (cycles through 6) |
| `n` | Hatch a new buddy (resets state) |
| `q` | Quit (kills the side pane) |

**Modes A and B share the same persisted state** at
`~/.config/opencode-buddy/state.json`, so feeding the buddy via
`/buddy feed` in the TUI will also be reflected in the side pane and
vice versa.

### Install from source

```bash
git clone https://github.com/AMark-CS/opencode-buddy
cd opencode-buddy
npm install            # only for plugin dev deps
npm link               # adds `opencode-buddy` to PATH
opencode-buddy install
```

### Uninstall

```bash
opencode-buddy uninstall
npm uninstall -g opencode-buddy
```

## Headless commands

```bash
opencode-buddy stats                      # one-line status printout
opencode-buddy feed                       # feed from any terminal
opencode-buddy hatch dragon Sparky        # start fresh as a dragon named Sparky
opencode-buddy switch cat                 # become a cat
opencode-buddy rename CaptainQuack        # rename
opencode-buddy notify done                # nudge the buddy from a hook
opencode-buddy path                       # print path to the state file
```

These work whether or not the TUI or tmux side pane is running.
| `n` | Hatch a new buddy (resets state) |
| `q` | Quit (kills the side pane) |

### Headless commands

```bash
opencode-buddy stats                      # one-line status printout
opencode-buddy feed                       # feed from any terminal
opencode-buddy hatch dragon Sparky        # start fresh as a dragon named Sparky
opencode-buddy switch cat                 # become a cat
opencode-buddy rename CaptainQuack        # rename
opencode-buddy notify done                # nudge the buddy from a hook / hookup
opencode-buddy path                       # print path to the state file
```

## The six species

```
       duck                    cat                  dragon
         __                /\\_/\                  /\\_/\
       <(o )___          ( o.o )                ( o o )  ~~
        ( ._> /           > ^ <                  > ^ < /
         `--'            /|   |\\               /|   |\\
      ~ idle ~         (_|   |_)              (_|   |_)
                          meow                   rawr

     axolotl                robot                  ghost
      ^___^              [ O . O ]              .-"\"-.
     (o . o)             /|#####|\\             ( o . o )
    \\|_|_|/            / |#####| \\            | ~  ~ |
     \\| |/              |     |                |     |
      ) (               /| | | |\\              \\uuuuu/
    ~ ambien              beep                   boo
```

Each has frames for `idle / working / celebrating / scared / sleeping`.

## How it works

* **As an opencode plugin** (`src/plugin.js`): registers a `buddy` tool the LLM can call, and listens to `session.idle` / `session.error` events to update the buddy's mood automatically. The `/buddy` slash command in `~/.config/opencode/commands/buddy.md` is a thin prompt that tells the LLM to use that tool.
* **As a tmux sidecar** (`bin/opencode-buddy.js start`): runs a separate process in a right-side tmux pane. Uses `tmux capture-pane` to peek at the opencode pane text and infer whether opencode is generating, errored, or idle.
* **Shared state** at `~/.config/opencode-buddy/state.json`. Both the plugin and the sidecar read and write the same file, so a `/buddy feed` in the TUI is immediately visible in the side pane and vice versa.
* **Zero runtime dependencies.** Pure Node.js + ANSI escapes for the renderer, `spawnSync("tmux", ...)` for pane control. The only dev-time dependency is `@opencode-ai/plugin` (used to define the opencode tool).

## Limitations

* **Activity inference is best-effort.** If opencode's prompt text changes, the heuristics may misclassify. The `notify` subcommand is the explicit way to push events.
* **The /buddy command is LLM-mediated.** The slash command is a prompt that tells opencode's LLM to call the `buddy` tool. It works only inside an active opencode session. For a direct terminal-friendly interface use `opencode-buddy <subcommand>` or the tmux side pane.
* **No animations yet.** Frames are static; the renderer just swaps the frame when the state changes. Adding 2-3 frame loops per state is straightforward (PRs welcome).

## Project layout

```
opencode-buddy/
├── bin/
│   └── opencode-buddy.js     # CLI entry
├── src/
│   ├── plugin.js             # opencode plugin (exports BuddyPlugin)
│   ├── install.js            # one-shot installer for /buddy + opencode.json
│   ├── index.js              # CLI runtime + headless commands
│   ├── tui.js                # ANSI renderer for the side pane
│   ├── tmux.js               # tmux capture / split helpers
│   ├── persistence.js        # state file at ~/.config/opencode-buddy/
│   └── buddy/
│       ├── species.js        # ASCII art + color palettes
│       └── state.js          # state machine + attribute math
├── test/
│   ├── smoke.js              # state / species unit tests
│   ├── plugin.smoke.js       # plugin tool unit tests
│   └── e2e.js                # full tmux roundtrip
├── package.json
├── LICENSE                   # MIT
├── README.md
├── PUSH.md                   # GitHub push guide
└── PUBLISH.md                # npm publish guide
```

## Development

```bash
npm test              # runs all unit tests (smoke + plugin)
npm run test:e2e      # runs end-to-end tmux test (creates & kills a session)
npm run install-buddy # runs the opencode install command
```

## License

MIT
