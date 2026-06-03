# opencode-buddy

A virtual ASCII pet companion that lives in the opencode TUI sidebar. Hatches, feeds, plays, and reacts to what you're coding — all without leaving opencode.

```
┌──────────────────────────┐
│  opencode TUI            │
│                          │
│  > your prompt here      │
│                          │
│         sidebar          │
│ ┌──────────────────────┐ │
│ │ Quack the duck       │ │
│ │       __             │ │
│ │     <(o )___         │ │
│ │      ( ._> /         │ │
│ │       `--'           │ │
│ │ ──────────────────── │ │
│ │ hunger ████████░░ 79 │ │
│ │ happy  ████████░░ 79 │ │
│ │ energy ██████████ 100│ │
│ │ idle · Lv 1 · xp 0   │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

The buddy blinks every 600ms. Switch species, watch it cheer when opencode finishes a turn, and get scared when a session errors.

## Install

Requires Node.js ≥ 18 and opencode ≥ 1.15.

```bash
npm install -g opencode-buddy
```

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-buddy"]
}
```

Restart opencode. The buddy appears in the sidebar.

## How to interact

The buddy has a `buddy` tool the LLM can call. Just talk to it:

```
/buddy
/feed the buddy
/switch to a dragon
/rename it to Sparky
/can you show me the buddy's ascii art
```

The LLM will call the `buddy` tool with the right action. Available actions:

| Action | Effect |
| --- | --- |
| `status` | Print current stats |
| `feed` | +25 hunger, -5 energy |
| `play` | +20 happiness, -5 hunger, +5 xp |
| `rest` | +30 energy |
| `switch <species>` | Change to duck, cat, dragon, axolotl, robot, or ghost |
| `rename <name>` | Rename (max 20 chars) |
| `hatch [species] [name]` | Start a brand new buddy |
| `ascii [frame]` | Return rendered ASCII art |
| `path` | Path to the state file |
| `help` | List actions |

## Six species

```
       duck                    cat                  dragon
         __                /\_/\                  /\_/\
       <(o )___          ( o.o )                ( o o )  ~~
        ( ._> /           > ^ <                  > ^ < /
         `--'            /|   |\                /|   |\
      ~ idle ~         (_|   |_)               (_|   |_)
                          meow                   rawr

     axolotl                robot                  ghost
      ^___^              [ O . O ]              .-"\"-.
     (o . o)             /|#####|\              ( o . o )
    \|_|_|/             / |#####| \             | ~  ~ |
     \| |/               |     |                |     |
      ) (               /| | | |\               \uuuuu/
    ~ ambien              beep                   boo
```

Each species has a per-character color palette. Idle state has 3 frames (blink loop) at 600ms per frame.

## How it works

- **TUI plugin** (`src/tui-plugin.jsx`): registers `sidebar_content` slot, renders a Solid component that polls `~/.config/opencode-buddy/state.json` every 1.5s and animates at 6fps. Pure opencode-native — no tmux, no separate process.
- **Server plugin** (`src/server-plugin.js`): registers a `buddy` tool the LLM can call. The same package exports both entrypoints (`main` for server, `exports["./tui"]` for TUI).
- **State** at `~/.config/opencode-buddy/state.json` (~/.config is cross-platform via os.homedir()). Attributes decay over time. Sessions auto-celebrate on `session.idle` and auto-scare on `session.error`.

## Uninstall

```bash
npm uninstall -g opencode-buddy
```

Then remove `"opencode-buddy"` from your `opencode.json` `plugin` array.

## Project layout

```
opencode-buddy/
├── package.json
├── README.md
├── LICENSE
└── src/
    ├── tui-plugin.jsx     # v2 TUI plugin, mounts to sidebar_content
    ├── server-plugin.js   # v1 server plugin, exposes `buddy` tool
    ├── species.js         # ASCII art + per-species color palettes
    ├── state.js           # state machine (hunger/happiness/energy decay)
    └── persistence.js     # state file reader/writer
```

## License

MIT
