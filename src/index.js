// Main runtime. Wires together state, persistence, TUI, tmux polling.
//
// Usage from bin/opencode-buddy.js:
//   await runInteractive()    // for `opencode-buddy start`
//   await runCommand(args)    // for all other subcommands

import * as persistence from "./persistence.js";
import { createTui } from "./tui.js";
import {
  tick,
  feed,
  play,
  rest,
  rename,
  switchSpecies,
  celebrate,
  scared,
  working,
  deriveState,
  maybeLevelUp,
  describe as describeState,
  DEFAULT_STATE,
} from "./buddy/state.js";
import { SPECIES } from "./buddy/species.js";
import {
  inTmux,
  currentPaneId,
  splitRight,
  captureMainPane,
  inferActivity,
  killBuddyPane,
} from "./tmux.js";

const TICK_MS = 1000;
const SAVE_EVERY_MS = 5000;

const HINT = `keys: f feed · p play · r rename · s switch · z rest · n hatch · q quit`;

export async function loadOrInit() {
  const existing = await persistence.load();
  if (existing) return existing;
  const fresh = { ...DEFAULT_STATE, lastTick: Date.now() };
  await persistence.save(fresh);
  return fresh;
}

export async function runInteractive({ autoSplit = true } = {}) {
  if (!inTmux()) {
    throw new Error(
      "opencode-buddy start must run inside a tmux session. " +
        "Start tmux first, then run: opencode-buddy start",
    );
  }

  let state = await loadOrInit();
  let buddyPane = null;
  if (autoSplit) {
    buddyPane = splitRight(
      `cd ${process.cwd()} && exec ${process.execPath} ${process.argv[1]} render`,
      28,
    );
  }

  const tui = createTui({
    onKey: (key) => {
      switch (key) {
        case "f":
          state = feed(state);
          flash("yum!");
          break;
        case "p":
          state = play(state);
          flash("hehe!");
          break;
        case "z":
          state = rest(state);
          flash("zzz...");
          break;
        case "n":
          state = { ...DEFAULT_STATE, lastTick: Date.now() };
          flash("new buddy!");
          break;
        case "r": {
          // simple prompt via stdout
          process.stdout.write(`\x1b[2J\x1b[Hnew name: `);
          let name = "";
          const onData = (b) => {
            const s = b.toString("utf8");
            if (s === "\n" || s === "\r" || s === "\u0003") {
              process.stdin.off("data", onData);
              if (name) state = rename(state, name);
              flash(name ? `hi ${name}!` : "ok");
            } else if (s === "\u007f" || s === "\b") {
              name = name.slice(0, -1);
            } else {
              name += s.replace(/[\r\n]/g, "");
            }
          };
          process.stdin.on("data", onData);
          break;
        }
        case "s": {
          // cycle species
          const idx = SPECIES.indexOf(state.species);
          const next = SPECIES[(idx + 1) % SPECIES.length];
          state = switchSpecies(state, next);
          flash(`now ${next}`);
          break;
        }
        case "q":
        case "ctrl-c":
          cleanup();
          process.exit(0);
          break;
        default:
          // ignore
          break;
      }
    },
  });

  let flashUntil = 0;
  let flashText = "";
  function flash(text, ms = 1500) {
    flashText = text;
    flashUntil = Date.now() + ms;
  }

  function buildHint() {
    if (Date.now() < flashUntil) return `${flashText}   ·   ${HINT}`;
    return HINT;
  }

  let lastActivity = "unknown";
  let lastPoll = 0;
  let lastSave = 0;
  let running = true;

  async function loop() {
    while (running) {
      const now = Date.now();

      // 1. tick attributes for time decay
      state = tick(state, now);

      // 2. capture tmux main pane every 2s for activity inference
      if (now - lastPoll > 2000) {
        lastPoll = now;
        const text = captureMainPane(60);
        const activity = inferActivity(text);
        if (activity !== lastActivity) {
          lastActivity = activity;
          if (activity === "working") state = working(state);
          else if (activity === "error") state = scared(state);
          else if (activity === "idle")
            state = celebrate(state, 1500);
        }
      }

      // 3. derive final state (transient overrides first, then attributes)
      state = deriveState(state, now);

      // 4. level up check
      state = maybeLevelUp(state);

      // 5. render
      tui.render(state, buildHint());

      // 6. persist periodically
      if (now - lastSave > SAVE_EVERY_MS) {
        lastSave = now;
        await persistence.save(state).catch(() => {});
      }

      await new Promise((r) => setTimeout(r, TICK_MS));
    }
  }

  function cleanup() {
    running = false;
    tui.stop();
    if (buddyPane) killBuddyPane(buddyPane);
  }

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  tui.start();
  await loop();
}

// Headless command runner: feed, play, rename, switch, hatch, stats, notify
export async function runCommand(argv) {
  const [cmd, ...rest] = argv;
  let state = await loadOrInit();

  switch (cmd) {
    case "hatch":
    case "reset": {
      const species = rest[0] && SPECIES.includes(rest[0]) ? rest[0] : "duck";
      state = {
        ...DEFAULT_STATE,
        species,
        name: rest[1] || DEFAULT_STATE.name,
        lastTick: Date.now(),
      };
      await persistence.save(state);
      console.log(`Hatched a new ${state.species} named ${state.name}.`);
      break;
    }
    case "feed":
      state = feed(state);
      await persistence.save(state);
      console.log(`Fed ${state.name}. hunger -> ${Math.floor(state.hunger)}`);
      break;
    case "play":
      state = play(state);
      await persistence.save(state);
      console.log(
        `Played with ${state.name}. happiness -> ${Math.floor(state.happiness)}`,
      );
      break;
    case "rest":
      state = rest(state);
      await persistence.save(state);
      console.log(`${state.name} took a nap.`);
      break;
    case "rename": {
      const name = rest.join(" ").trim();
      if (!name) {
        console.error("usage: opencode-buddy rename <name>");
        process.exit(2);
      }
      state = rename(state, name);
      await persistence.save(state);
      console.log(`Renamed to ${state.name}.`);
      break;
    }
    case "switch": {
      const species = rest[0];
      if (!species || !SPECIES.includes(species)) {
        console.error(`species must be one of: ${SPECIES.join(", ")}`);
        process.exit(2);
      }
      state = switchSpecies(state, species);
      await persistence.save(state);
      console.log(`${state.name} transformed into a ${species}.`);
      break;
    }
    case "stats":
      console.log(describeState(state));
      break;
    case "notify": {
      const event = rest[0];
      if (event === "working" || event === "start")
        state = working(state);
      else if (event === "done" || event === "celebrate")
        state = celebrate(state);
      else if (event === "error" || event === "scared")
        state = scared(state);
      else {
        console.error(
          "usage: opencode-buddy notify <working|done|error>",
        );
        process.exit(2);
      }
      await persistence.save(state);
      console.log(`Notified buddy: ${event}`);
      break;
    }
    case "path":
      console.log(persistence.pathForDisplay());
      break;
    default:
      printUsage();
      process.exit(cmd ? 2 : 0);
  }
}

function printUsage() {
  console.log(`opencode-buddy — a virtual pet for your tmux session

Usage:
  opencode-buddy start                    Launch interactive buddy in a tmux side pane
  opencode-buddy hatch [species] [name]   Start a brand new buddy (resets state)
  opencode-buddy feed                     Feed your buddy
  opencode-buddy play                     Play with your buddy
  opencode-buddy rest                     Let your buddy rest
  opencode-buddy rename <name>            Give your buddy a new name
  opencode-buddy switch <species>         Change species (${SPECIES.join(", ")})
  opencode-buddy notify <event>           Notify buddy of an opencode event
                                           (working | done | error)
  opencode-buddy stats                    Print current buddy stats
  opencode-buddy path                     Print path to state file
`);
}
