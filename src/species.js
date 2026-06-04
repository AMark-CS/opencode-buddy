// 6 species × 5 states. Each "frame" is an array of rows.
// All frames in a state share the same width so the canvas doesn't jitter.
// The `idle` state is an array of frames (animated).
// Other states are single-frame (set in a one-element array).

const RESET = "\x1b[0m";

const C = {
  reset: RESET,
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
};

const FRAMES = {
  duck: {
    idle: [
      // frame 0: blink open
      [
        `         __         `,
        `       <(o )___     `,
        `        ( ._> /     `,
        `         \`--'       `,
        `                    `,
        `      ~ idle ~      `,
      ],
      // frame 1: blink closed
      [
        `         __         `,
        `       <(- )___     `,
        `        ( ._> /     `,
        `         \`--'       `,
        `                    `,
        `      ~ idle ~      `,
      ],
      // frame 2: blink open (same as 0, ends loop)
      [
        `         __         `,
        `       <(o )___     `,
        `        ( ._> /     `,
        `         \`--'       `,
        `                    `,
        `      ~ idle ~      `,
      ],
    ],
    working: [
      [
        `         __         `,
        `       <(o )___     `,
        `        ( ._> /     `,
        `       *\`--'* .. .. `,
        `      /   /         `,
        `    coding...       `,
      ],
    ],
    celebrating: [
      [
        `       \\o/          `,
        `      <(o )___  !   `,
        `       ( ._> /      `,
        `        \`--'    \\o/ `,
        `                    `,
        `      \\o/ nice!    `,
      ],
    ],
    scared: [
      [
        `         __         `,
        `       <(O )___     `,
        `        ( ._> /     `,
        `         \`--'   !!  `,
        `                    `,
        `      !!  oh no     `,
      ],
    ],
    sleeping: [
      [
        `         __         `,
        `       <(o )___     `,
        `        ( -_> z     `,
        `         \`--'   z   `,
        `                    `,
        `    z z z z z       `,
      ],
    ],
  },

  cat: {
    idle: [
      [
        `    /\\_/\\           `,
        `   ( o.o )          `,
        `    > ^ <           `,
        `   /|   |\\          `,
        `  (_|   |_)         `,
        `      meow          `,
      ],
      [
        `    /\\_/\\           `,
        `   ( -.o )          `,
        `    > ^ <           `,
        `   /|   |\\          `,
        `  (_|   |_)         `,
        `      meow          `,
      ],
      [
        `    /\\_/\\           `,
        `   ( o.o )          `,
        `    > ^ <           `,
        `   /|   |\\          `,
        `  (_|   |_)         `,
        `      meow          `,
      ],
    ],
    working: [
      [
        `    /\\_/\\  ...      `,
        `   ( o.o )          `,
        `    > ^ <           `,
        `   /|   |\\  ..      `,
        `  (_|   |_)         `,
        `    typing...       `,
      ],
    ],
    celebrating: [
      [
        `    /\\_/\\           `,
        `   ( ^.^ )   \\o/    `,
        `    > ~ <           `,
        `   /|   |\\  \\o/     `,
        `  (_|   |_)         `,
        `   purrrfect!       `,
      ],
    ],
    scared: [
      [
        `    /\\_/\\    !!     `,
        `   ( O.O )          `,
        `    > ^ <           `,
        `   /|   |\\          `,
        `  (_|   |_)  /\\     `,
        `    !! hiss         `,
      ],
    ],
    sleeping: [
      [
        `    /\\_/\\           `,
        `   ( -.- )  z       `,
        `    > ^ <           `,
        `   /|   |\\   z      `,
        `  (_|   |_)         `,
        `   z z z z z        `,
      ],
    ],
  },

  dragon: {
    idle: [
      [
        `      /\\_/\\         `,
        `     ( o o )  ~~    `,
        `      > ^ < /       `,
        `     /|   |\\        `,
        `    (_|   |_)       `,
        `      rawr          `,
      ],
      [
        `      /\\_/\\         `,
        `     ( - - )  ~~    `,
        `      > ^ < /       `,
        `     /|   |\\        `,
        `    (_|   |_)       `,
        `      rawr          `,
      ],
      [
        `      /\\_/\\         `,
        `     ( o o )  ~~    `,
        `      > ^ < /       `,
        `     /|   |\\        `,
        `    (_|   |_)       `,
        `      rawr          `,
      ],
    ],
    working: [
      [
        `      /\\_/\\   ~~~   `,
        `     ( o o ) ~~     `,
        `      > ^ <         `,
        `     /|   |\\  ~~    `,
        `    (_|   |_)       `,
        `    forging...      `,
      ],
    ],
    celebrating: [
      [
        `      /\\^/\\    \\o/  `,
        `     ( ^.^ )        `,
        `      > ~ <    \\o/  `,
        `     /|   |\\        `,
        `    (_|   |_)       `,
        `   +50 xp!! \\o/    `,
      ],
    ],
    scared: [
      [
        `      /\\_/\\    !!   `,
        `     ( O O )        `,
        `      > ^ <         `,
        `     /|   |\\   !!   `,
        `    (_|   |_)       `,
        `    !! yikes        `,
      ],
    ],
    sleeping: [
      [
        `      /\\_/\\         `,
        `     ( - - ) z      `,
        `      > ^ <         `,
        `     /|   |\\   z    `,
        `    (_|   |_)       `,
        `   z z z z z        `,
      ],
    ],
  },

  axolotl: {
    idle: [
      [
        `      ^___^         `,
        `     (o . o)        `,
        `    \\|_|_|/        `,
        `     \\| |/         `,
        `      ) (          `,
        `    ~ ambien        `,
      ],
      [
        `      ^___^         `,
        `     (o - o)        `,
        `    \\|_|_|/        `,
        `     \\| |/         `,
        `      ) (          `,
        `    ~ ambien        `,
      ],
      [
        `      ^___^         `,
        `     (o . o)        `,
        `    \\|_|_|/        `,
        `     \\| |/         `,
        `      ) (          `,
        `    ~ ambien        `,
      ],
    ],
    working: [
      [
        `      ^___^   ..    `,
        `     (o . o)        `,
        `    \\|_|_|/  ..    `,
        `     \\| |/         `,
        `      ) (          `,
        `     swimming...    `,
      ],
    ],
    celebrating: [
      [
        `      ^___^   \\o/   `,
        `     (o ^ o)        `,
        `    \\|_|_|/ \\o/    `,
        `     \\| |/         `,
        `      ) (          `,
        `   \\o/  splish!    `,
      ],
    ],
    scared: [
      [
        `      ^___^   !!    `,
        `     (O . O)        `,
        `    \\|_|_|/        `,
        `     \\| |/   !!    `,
        `      ) (          `,
        `    !!  gulp       `,
      ],
    ],
    sleeping: [
      [
        `      ^___^         `,
        `     (o - o) z      `,
        `    \\|_|_|/        `,
        `     \\| |/   z     `,
        `      ) (          `,
        `   z z z z z        `,
      ],
    ],
  },

  robot: {
    idle: [
      [
        `     [ O . O ]      `,
        `    /|#####|\\       `,
        `   / |#####| \\      `,
        `      |     |       `,
        `     /| | | |\\      `,
        `      beep          `,
      ],
      [
        `     [ O . O ]      `,
        `    /|#####|\\       `,
        `   / |#####| \\      `,
        `      |     |       `,
        `     /| | | |\\      `,
        `      beep          `,
      ],
      [
        `     [ O . O ]      `,
        `    /|#####|\\       `,
        `   / |#####| \\      `,
        `      |     |       `,
        `     /| | | |\\      `,
        `      beep          `,
      ],
    ],
    working: [
      [
        `     [ O . O ] ...  `,
        `    /|#####|\\       `,
        `   / |#####| \\  ..  `,
        `      |     |       `,
        `     /| | | |\\      `,
        `   compiling...     `,
      ],
    ],
    celebrating: [
      [
        `     [ ^ . ^ ] \\o/  `,
        `    /|#####|\\       `,
        `   / |#####| \\      `,
        `      |     |       `,
        `     /| | | |\\ \\o/  `,
        `   pass tests!      `,
      ],
    ],
    scared: [
      [
        `     [ O . O ] !!   `,
        `    /|#####|\\       `,
        `   / |#####| \\      `,
        `      |     |   !!  `,
        `     /| | | |\\      `,
        `    !! segfault     `,
      ],
    ],
    sleeping: [
      [
        `     [ - . - ] z    `,
        `    /|#####|\\       `,
        `   / |#####| \\  z   `,
        `      |     |       `,
        `     /| | | |\\      `,
        `   z z z z z        `,
      ],
    ],
  },

  ghost: {
    idle: [
      [
        `     .-""-.         `,
        `    ( o . o )       `,
        `    | ~  ~ |        `,
        `    |     |         `,
        `    \\uuuuu/        `,
        `      boo           `,
      ],
      [
        `     .-""-.         `,
        `    ( o . o )       `,
        `    | ~  ~ |        `,
        `    |     |         `,
        `    \\uuuuu/        `,
        `      boo           `,
      ],
      [
        `     .-""-.         `,
        `    ( o . o )       `,
        `    | ~  ~ |        `,
        `    |     |         `,
        `    \\uuuuu/        `,
        `      boo           `,
      ],
    ],
    working: [
      [
        `     .-""-.  ...    `,
        `    ( o . o )       `,
        `    | ~  ~ |        `,
        `    |     |         `,
        `    \\uuuuu/        `,
        `   haunting...      `,
      ],
    ],
    celebrating: [
      [
        `     .-""-.  \\o/    `,
        `    ( ^ . ^ )       `,
        `    | ~  ~ | \\o/    `,
        `    |     |         `,
        `    \\uuuuu/        `,
        `   \\o/ spooky!     `,
      ],
    ],
    scared: [
      [
        `     .-""-.   !!    `,
        `    ( O . O )       `,
        `    | ~  ~ |        `,
        `    |     |   !!    `,
        `    \\uuuuu/        `,
        `    !! yeek         `,
      ],
    ],
    sleeping: [
      [
        `     .-""-.         `,
        `    ( - . - ) z     `,
        `    | ~  ~ |        `,
        `    |     |         `,
        `    \\uuuuu/   z    `,
        `   z z z z z        `,
      ],
    ],
  },
};

const PALETTES = {
  duck: (ch) => {
    if (ch === "o" || ch === "O") return C.brightYellow + ch + RESET;
    if (ch === "<" || ch === ">" || ch === "(" || ch === ")") return C.yellow + ch + RESET;
    if (ch === "_" || ch === "-" || ch === ".") return C.yellow + ch + RESET;
    if (ch === "~" || ch === "*") return C.cyan + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === "!") return C.brightYellow + ch + RESET;
    if (ch === " ") return ch;
    return C.yellow + ch + RESET;
  },
  cat: (ch) => {
    if (ch === "o" || ch === "O" || ch === "^") return C.brightGreen + ch + RESET;
    if (ch === "!" || ch === "~" || ch === "o") return C.brightMagenta + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === ".") return C.gray + ch + RESET;
    if (ch === " ") return ch;
    return C.green + ch + RESET;
  },
  dragon: (ch) => {
    if (ch === "o" || ch === "O" || ch === "^") return C.brightRed + ch + RESET;
    if (ch === "~" || ch === "!") return C.brightRed + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === " ") return ch;
    return C.green + ch + RESET;
  },
  axolotl: (ch) => {
    if (ch === "o" || ch === "O") return C.brightMagenta + ch + RESET;
    if (ch === "^" || ch === "_") return C.magenta + ch + RESET;
    if (ch === "!" || ch === "o") return C.brightYellow + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === ".") return C.cyan + ch + RESET;
    if (ch === " ") return ch;
    return C.magenta + ch + RESET;
  },
  robot: (ch) => {
    if (ch === "O" || ch === "#") return C.brightCyan + ch + RESET;
    if (ch === "o") return C.cyan + ch + RESET;
    if (ch === ".") return C.gray + ch + RESET;
    if (ch === "!" || ch === "o") return C.brightYellow + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === " ") return ch;
    return C.gray + ch + RESET;
  },
  ghost: (ch) => {
    if (ch === "o" || ch === "O") return C.brightCyan + ch + RESET;
    if (ch === "~" || ch === "!") return C.brightMagenta + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === ".") return C.gray + ch + RESET;
    if (ch === " ") return ch;
    return C.brightCyan + ch + RESET;
  },
};

export const SPECIES = ["duck", "cat", "dragon", "axolotl", "robot", "ghost"];
export const STATES = ["idle", "working", "celebrating", "scared", "sleeping"];

const FRAME_INTERVAL_MS = 300;

export function framesFor(species, state) {
  const list = FRAMES[species]?.[state] ?? FRAMES.duck.idle;
  return list;
}

export function frameIntervalMs() {
  return FRAME_INTERVAL_MS;
}

export function frameCount(species, state) {
  return framesFor(species, state).length;
}

const FRAME_WIDTH = 20;

export function maxFrameHeight() {
  return 6;
}

export function frameWidth() {
  return FRAME_WIDTH;
}

export function renderFrame(species, state, frameIdx) {
  const frames = framesFor(species, state);
  const i = ((frameIdx % frames.length) + frames.length) % frames.length;
  const palette = PALETTES[species];
  // Idle frames sway the body so the buddy feels alive even when the
  // eyes aren't blinking. We toggle a leading-space offset that
  // alternates with the frame so the shift is unmistakable.
  const sway = state === "idle" ? (i % 2 === 0 ? 0 : 2) : 0;
  // Append a frame counter to the caption row (last row) so the For
  // reconciliation always sees different content. Helps debug whether
  // the body re-renders at all.
  return frames[i].map((row, rowIdx) => {
    let out = "";
    for (const ch of row) out += palette(ch);
    if (sway > 0) out = " ".repeat(sway) + out;
    // Auto-pad to FRAME_WIDTH so off-by-one spacing in raw art doesn't
    // cause render jitter.
    const visible = out.replace(/\x1b\[[0-9;]*m/g, "").length;
    if (visible < FRAME_WIDTH) out += " ".repeat(FRAME_WIDTH - visible);
    return out;
  });
}
