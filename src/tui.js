// TUI renderer. Pure ANSI, no third-party deps.
//
// Lifecycle:
//   const tui = createTui()
//   tui.start()
//   ... on every tick:
//     tui.render({ buddy, status, hint })
//   tui.stop()
//
// Input handling: registers a keypress listener. Keys are mapped by
// `bindKey()` to user-defined callbacks.

import readline from "node:readline";
import { paint, frameWidth, frameHeight, FLAVOR } from "./buddy/species.js";
import { describe } from "./buddy/state.js";

const ESC = "\x1b";
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const ALT_SCREEN_ON = `${ESC}[?1049h`;
const ALT_SCREEN_OFF = `${ESC}[?1049l`;
const CLEAR = `${ESC}[2J${ESC}[H`;
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const CYAN = `${ESC}[36m`;
const YELLOW = `${ESC}[33m`;
const GREEN = `${ESC}[32m`;
const MAGENTA = `${ESC}[35m`;
const GRAY = `${ESC}[90m`;
const BRIGHT_WHITE = `${ESC}[97m`;

const FRAME_INTERVAL_MS = 200;

function pickFlavor(species, seed) {
  const lines = FLAVOR[species] || ["..."];
  return lines[seed % lines.length];
}

function bars(value, width = 20, colorFn = (i) => GREEN) {
  const filled = Math.round((value / 100) * width);
  return colorFn(0) + "█".repeat(filled) + GRAY + "░".repeat(width - filled) + RESET;
}

function buildFrame(state, opts = {}) {
  const width = frameWidth(state.species);
  const height = frameHeight(state.species);
  const art = paint(state.species, state.state);

  const lines = [];
  // Top border
  lines.push(
    `${CYAN}┌${"─".repeat(width + 2)}┐${RESET}`,
  );
  // Art lines, padded to a consistent width
  for (let i = 0; i < height; i++) {
    const row = art[i] || " ".repeat(width);
    lines.push(`${CYAN}│${RESET} ${row} ${CYAN}│${RESET}`);
  }
  // Bottom border
  lines.push(
    `${CYAN}└${"─".repeat(width + 2)}┘${RESET}`,
  );
  // Status block
  const stateLabel = state.state.toUpperCase();
  const reason = state.stateReason ? ` ${DIM}(${state.stateReason})${RESET}` : "";
  lines.push(
    `  ${BOLD}${state.name}${RESET} ${DIM}the${RESET} ${MAGENTA}${state.species}${RESET} ${DIM}·${RESET} ${YELLOW}${stateLabel}${RESET}${reason}`,
  );
  lines.push(`  ${DIM}Lv${RESET} ${state.level}  ${DIM}xp${RESET} ${state.xp}/${state.level * 50}`);
  lines.push(
    `  ${DIM}hunger${RESET}    ${bars(state.hunger)} ${Math.floor(state.hunger)}`,
  );
  lines.push(
    `  ${DIM}happy${RESET}     ${bars(state.happiness, 20, () => MAGENTA)} ${Math.floor(state.happiness)}`,
  );
  lines.push(
    `  ${DIM}energy${RESET}    ${bars(state.energy, 20, () => CYAN)} ${Math.floor(state.energy)}`,
  );
  lines.push(
    `  ${DIM}flavor${RESET}    ${BRIGHT_WHITE}${pickFlavor(state.species, Math.floor(Date.now() / 4000))}${RESET}`,
  );
  if (opts.hint) {
    lines.push("");
    lines.push(`  ${DIM}${opts.hint}${RESET}`);
  }
  return lines;
}

export function createTui({ onKey, onResize } = {}) {
  let running = false;
  let timer = null;
  let lastState = null;
  let lastHint = "";
  let stdinRaw = false;

  function ensureRawMode() {
    if (!process.stdin.isTTY) return;
    if (stdinRaw) return;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    stdinRaw = true;
  }

  function onData(buf) {
    const key = buf.toString("utf8");
    // ctrl-c: signal stop, but let main handle the actual exit
    if (key === "\u0003") {
      if (onKey) onKey("ctrl-c");
      return;
    }
    if (onKey) onKey(key);
  }

  function onResize() {
    if (onResize) onResize();
  }

  function render() {
    if (!lastState) return;
    const out = buildFrame(lastState, { hint: lastHint }).join("\n") + "\n";
    process.stdout.write(CLEAR + out);
  }

  return {
    start() {
      if (running) return;
      running = true;
      ensureRawMode();
      process.stdin.on("data", onData);
      process.stdout.on("resize", onResize);
      process.stdout.write(ALT_SCREEN_ON + HIDE_CURSOR + CLEAR);
      timer = setInterval(render, FRAME_INTERVAL_MS);
      render();
    },

    stop() {
      if (!running) return;
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
      process.stdin.off("data", onData);
      process.stdout.off("resize", onResize);
      if (stdinRaw && process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        stdinRaw = false;
      }
      process.stdout.write(SHOW_CURSOR + ALT_SCREEN_OFF);
    },

    render(state, hint = "") {
      lastState = state;
      lastHint = hint;
      render();
    },

    // Returns the natural frame width (so callers can size the tmux pane)
    naturalWidth: () => (lastState ? frameWidth(lastState.species) + 4 : 26),
    naturalHeight: () => (lastState ? frameHeight(lastState.species) + 12 : 18),
  };
}

export { describe };
