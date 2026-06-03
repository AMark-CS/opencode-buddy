// Species library: 6 ASCII animals × multiple states × animation frames.
//
// Frame format: array of strings, each string is one row. All frames in a
// state are the same width/height, so the renderer can swap them at a fixed
// cadence without resizing the canvas.

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
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

// Each frame is a multiline string. Keep them all the same dimensions
// across states of the same species so the canvas doesn't jitter.
const RAW = {
  duck: {
    idle: [
      `         __         `,
      `       <(o )___     `,
      `        ( ._> /     `,
      `         \`--'       `,
      `                    `,
      `      ~ idle ~      `,
    ],
    working: [
      `         __         `,
      `       <(o )___     `,
      `        ( ._> /     `,
      `       *\`--'* .. .. `,
      `      /   /         `,
      `    coding...       `,
    ],
    celebrating: [
      `       \\o/          `,
      `      <(o )___  !   `,
      `       ( ._> /      `,
      `        \`--'    \\o/ `,
      `                    `,
      `      \\o/ nice!    `,
    ],
    scared: [
      `         __         `,
      `       <(O )___     `,
      `        ( ._> /     `,
      `         \`--'   !!  `,
      `                    `,
      `      !!  oh no     `,
    ],
    sleeping: [
      `         __         `,
      `       <(o )___     `,
      `        ( -_> z     `,
      `         \`--'   z   `,
      `                    `,
      `     z z z z z       `,
    ],
  },

  cat: {
    idle: [
      `    /\\_/\\           `,
      `   ( o.o )          `,
      `    > ^ <           `,
      `   /|   |\\          `,
      `  (_|   |_)         `,
      `      meow          `,
    ],
    working: [
      `    /\\_/\\  ...      `,
      `   ( o.o )          `,
      `    > ^ <           `,
      `   /|   |\\  ..      `,
      `  (_|   |_)         `,
      `    typing...       `,
    ],
    celebrating: [
      `    /\\_/\\           `,
      `   ( ^.^ )   \\o/    `,
      `    > ~ <           `,
      `   /|   |\\  \\o/     `,
      `  (_|   |_)         `,
      `   purrrfect!       `,
    ],
    scared: [
      `    /\\_/\\    !!     `,
      `   ( O.O )          `,
      `    > ^ <           `,
      `   /|   |\\          `,
      `  (_|   |_)  /\\     `,
      `    !! hiss         `,
    ],
    sleeping: [
      `    /\\_/\\           `,
      `   ( -.- )  z       `,
      `    > ^ <           `,
      `   /|   |\\   z      `,
      `  (_|   |_)         `,
      `   z z z z z        `,
    ],
  },

  dragon: {
    idle: [
      `      /\\_/\\         `,
      `     ( o o )  ~~    `,
      `      > ^ < /       `,
      `     /|   |\\        `,
      `    (_|   |_)       `,
      `      rawr          `,
    ],
    working: [
      `      /\\_/\\   ~~~   `,
      `     ( o o ) ~~     `,
      `      > ^ <         `,
      `     /|   |\\  ~~    `,
      `    (_|   |_)       `,
      `    forging...      `,
    ],
    celebrating: [
      `      /\\^/\\    \\o/  `,
      `     ( ^.^ )        `,
      `      > ~ <    \\o/  `,
      `     /|   |\\        `,
      `    (_|   |_)       `,
      `   +50 xp!! \\o/    `,
    ],
    scared: [
      `      /\\_/\\    !!   `,
      `     ( O O )        `,
      `      > ^ <         `,
      `     /|   |\\   !!   `,
      `    (_|   |_)       `,
      `    !! yikes        `,
    ],
    sleeping: [
      `      /\\_/\\         `,
      `     ( - - ) z      `,
      `      > ^ <         `,
      `     /|   |\\   z    `,
      `    (_|   |_)       `,
      `   z z z z z        `,
    ],
  },

  axolotl: {
    idle: [
      `      ^___^         `,
      `     (o . o)        `,
      `    \\|_|_|/        `,
      `     \\| |/         `,
      `      ) (          `,
      `    ~ ambien       `,
    ],
    working: [
      `      ^___^   ..    `,
      `     (o . o)        `,
      `    \\|_|_|/  ..    `,
      `     \\| |/         `,
      `      ) (          `,
      `     swimming...    `,
    ],
    celebrating: [
      `      ^___^   \\o/   `,
      `     (o ^ o)        `,
      `    \\|_|_|/ \\o/    `,
      `     \\| |/         `,
      `      ) (          `,
      `   \\o/  splish!    `,
    ],
    scared: [
      `      ^___^   !!    `,
      `     (O . O)        `,
      `    \\|_|_|/        `,
      `     \\| |/   !!    `,
      `      ) (          `,
      `    !!  gulp       `,
    ],
    sleeping: [
      `      ^___^         `,
      `     (o - o) z      `,
      `    \\|_|_|/        `,
      `     \\| |/   z     `,
      `      ) (          `,
      `   z z z z z        `,
    ],
  },

  robot: {
    idle: [
      `     [ O . O ]      `,
      `    /|#####|\\       `,
      `   / |#####| \\      `,
      `     |     |        `,
      `    /| | | |\\       `,
      `     beep           `,
    ],
    working: [
      `     [ O . O ] ...  `,
      `    /|#####|\\       `,
      `   / |#####| \\  ..  `,
      `     |     |        `,
      `    /| | | |\\       `,
      `   compiling...     `,
    ],
    celebrating: [
      `     [ ^ . ^ ] \\o/  `,
      `    /|#####|\\       `,
      `   / |#####| \\      `,
      `     |     |        `,
      `    /| | | |\\ \\o/   `,
      `   pass tests!      `,
    ],
    scared: [
      `     [ O . O ] !!   `,
      `    /|#####|\\       `,
      `   / |#####| \\      `,
      `     |     |   !!   `,
      `    /| | | |\\       `,
      `    !! segfault     `,
    ],
    sleeping: [
      `     [ - . - ] z    `,
      `    /|#####|\\       `,
      `   / |#####| \\  z   `,
      `     |     |        `,
      `    /| | | |\\       `,
      `   z z z z z        `,
    ],
  },

  ghost: {
    idle: [
      `     .-\"\"-.        `,
      `    ( o . o )       `,
      `    | ~  ~ |        `,
      `    |     |         `,
      `    \\uuuuu/         `,
      `      boo           `,
    ],
    working: [
      `     .-\"\"-.  ...    `,
      `    ( o . o )       `,
      `    | ~  ~ |        `,
      `    |     |         `,
      `    \\uuuuu/        `,
      `   haunting...      `,
    ],
    celebrating: [
      `     .-\"\"-.  \\o/    `,
      `    ( ^ . ^ )       `,
      `    | ~  ~ | \\o/    `,
      `    |     |         `,
      `    \\uuuuu/        `,
      `   \\o/ spooky!     `,
    ],
    scared: [
      `     .-\"\"-.   !!    `,
      `    ( O . O )       `,
      `    | ~  ~ |        `,
      `    |     |   !!    `,
      `    \\uuuuu/        `,
      `    !! yeek         `,
    ],
    sleeping: [
      `     .-\"\"-.         `,
      `    ( - . - ) z     `,
      `    | ~  ~ |        `,
      `    |     |         `,
      `    \\uuuuu/   z    `,
      `   z z z z z        `,
    ],
  },
};

// Per-character color map. Each species has a function that takes a char
// from the raw frame and returns an ANSI-colored version. This way we
// can give ducks a yellow bill, axolotls pink gills, ghosts a translucent
// hue, etc.
const PALETTES = {
  duck: (ch) => {
    if (ch === "o" || ch === "O") return C.brightYellow + ch + RESET;
    if (ch === "(" || ch === ")" || ch === "<" || ch === ">")
      return C.yellow + ch + RESET;
    if (ch === "_" || ch === "-") return C.yellow + ch + RESET;
    if (ch === "." || ch === "*") return C.cyan + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === "!") return C.brightYellow + ch + RESET;
    if (ch === "~") return C.cyan + ch + RESET;
    if (ch === " ") return ch;
    return C.yellow + ch + RESET;
  },

  cat: (ch) => {
    if (ch === "o" || ch === "O" || ch === "^") return C.brightGreen + ch + RESET;
    if (ch === "!" || ch === "~") return C.brightMagenta + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === ".") return C.gray + ch + RESET;
    if (ch === " ") return ch;
    return C.green + ch + RESET;
  },

  dragon: (ch) => {
    if (ch === "o" || ch === "O" || ch === "^") return C.brightRed + ch + RESET;
    if (ch === "~") return C.red + ch + RESET;
    if (ch === "!" || ch === "o" || ch === "O") return C.brightYellow + ch + RESET;
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
    if (ch === "~") return C.cyan + ch + RESET;
    if (ch === "!" || ch === "o") return C.brightMagenta + ch + RESET;
    if (ch === "z") return C.gray + ch + RESET;
    if (ch === ".") return C.gray + ch + RESET;
    if (ch === " ") return ch;
    return C.brightCyan + ch + RESET;
  },
};

export const SPECIES = ["duck", "cat", "dragon", "axolotl", "robot", "ghost"];

export const STATES = ["idle", "working", "celebrating", "scared", "sleeping"];

// Random flavor line shown under the buddy in idle / sleeping.
export const FLAVOR = {
  duck: ["quack.", "need code.", "swimming in semicolons"],
  cat: ["purr.", "knock something off desk?", "yarn > threads"],
  dragon: ["rawr.", "hoarding stack traces", "breathing fire on bugs"],
  axolotl: ["ambien?", "regenerating tail...", "neotenic forever"],
  robot: ["beep boop", "01010110", "needs oil"],
  ghost: ["boo.", "haunting the stack", "passed on... to prod"],
};

function targetWidth() {
  // All species share this width so the rendered canvas never resizes when
  // a state changes. Each row is padded (or trimmed) to this length.
  return 20;
}

export function paint(species, state) {
  const frame = RAW[species][state];
  const palette = PALETTES[species];
  const w = targetWidth();
  return frame.map((row) => {
    let out = "";
    // Use [...row] to count grapheme-ish units. ASCII art is pure ASCII
    // so spread over code units is fine and matches visual columns.
    for (const ch of row) out += palette(ch);
    if (out.length < w) out += " ".repeat(w - out.length);
    return out;
  });
}

export function frameHeight(species) {
  return RAW[species].idle.length;
}

export function frameWidth() {
  return targetWidth();
}
