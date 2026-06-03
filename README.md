# opencode-buddy

A virtual ASCII pet that lives in a tmux side pane while you code with [opencode](https://opencode.ai).

```
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

The buddy reacts to what you're doing in the main pane — idles when you idle, cheers when opencode finishes, gets scared when a tool errors, and falls asleep when energy runs low.

## Why?

Claude Code v2.1.88 had a fun `/buddy` easter egg (an ASCII pet companion). When Anthropic removed it in v2.1.97 the community revolted. This project is the opencode equivalent: your own buddy, open source, never going to be taken away.

## Install

Requires Node.js ≥ 18 and tmux.

```bash
git clone https://github.com/<you>/opencode-buddy
cd opencode-buddy
npm link
```

Or just put `bin/opencode-buddy.js` on your PATH however you like.

## Usage

1. Start tmux.
2. In one pane, run `opencode` as usual.
3. In the same pane (or another), run:

   ```bash
   opencode-buddy start
   ```

   A 28-column side pane splits off to the right and the buddy appears inside it.

4. Switch back to your opencode pane (Ctrl+B then arrow, or click). Keep coding. Watch the buddy react.

### Keyboard controls (in the buddy pane)

| Key | Action |
| --- | --- |
| `f` | Feed (+25 hunger) |
| `p` | Play (+20 happiness, +5 xp) |
| `z` | Rest (+30 energy) |
| `r` | Rename (prompts in the pane) |
| `s` | Switch species (cycles through 6) |
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

* The buddy is a sidecar process — it runs in its own tmux pane, completely separate from opencode.
* It uses `tmux capture-pane` to peek at your main pane and infer whether opencode is generating, errored, or idle. (Heuristic: looks for "generating", "esc to cancel", "ctrl+t to view", "error/exception" patterns.)
* State is persisted to `~/.config/opencode-buddy/state.json` so your buddy survives across sessions.
* No third-party npm dependencies. Pure Node.js + ANSI escapes.

## Limitations

* **Side pane only.** This is a tmux split, not an opencode TUI extension. The buddy does not live *inside* the opencode TUI itself — opencode's plugin API doesn't expose UI rendering. To get it inside the TUI you'd need to fork opencode and modify its Solid.js layout.
* **Activity inference is best-effort.** If opencode's prompt text changes, the heuristics may misclassify. The `notify` subcommand is the explicit way to push events.
* **No /buddy slash-command inside opencode.** opencode has its own slash commands. The buddy listens via tmux capture-pane and CLI notify only.
* **No animations yet.** Frames are static; the renderer just swaps the frame when the state changes. Adding 2-3 frame loops per state is straightforward (PRs welcome).

## Project layout

```
opencode-buddy/
├── bin/
│   └── opencode-buddy.js     # CLI entry
├── src/
│   ├── index.js              # command + interactive runtime
│   ├── tui.js                # ANSI renderer
│   ├── tmux.js               # tmux capture / split helpers
│   ├── persistence.js        # state file
│   └── buddy/
│       ├── species.js        # ASCII art + color palettes
│       └── state.js          # state machine + attribute math
├── test/
│   ├── smoke.js              # node:test unit tests
│   └── e2e.js                # full tmux roundtrip
├── package.json
├── LICENSE                   # MIT
└── README.md
```

## Development

```bash
npm test           # runs unit tests
node test/e2e.js   # runs end-to-end tmux test (creates & kills a session)
```

## License

MIT
