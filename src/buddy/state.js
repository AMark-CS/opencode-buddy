// Buddy state machine + attribute bookkeeping.
//
// Attributes (all 0..100):
//   hunger     100 = full, 0 = starving
//   happiness  100 = delighted, 0 = grumpy
//   energy     100 = wide awake, 0 = exhausted
//
// External events from opencode (via tmux pane polling or CLI notify):
//   working    -> state becomes 'working' (boosts happiness over time)
//   done       -> state becomes 'celebrating' for a few seconds
//   error      -> state becomes 'scared' for a few seconds
//   idle       -> state returns to 'idle' / 'sleeping' based on energy
//
// User actions:
//   feed       -> +25 hunger, -5 energy
//   play       -> +20 happiness, -10 energy, -5 hunger
//   rest       -> +30 energy
//
// Time decay: every minute, hunger -0.5, happiness -0.3, energy -0.2.

export const DEFAULT_STATE = {
  species: "duck",
  name: "Quack",
  hunger: 80,
  happiness: 80,
  energy: 100,
  xp: 0,
  level: 1,
  hatchedAt: Date.now(),
  lastFed: Date.now(),
  lastPlayed: Date.now(),
  lastTick: Date.now(),
  // ephemeral, not persisted as state-of-truth
  state: "idle",
  stateUntil: 0,
  stateReason: "",
};

const CLAMP = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function tick(state, now = Date.now()) {
  const minutes = (now - state.lastTick) / 60_000;
  if (minutes <= 0) return state;

  const next = {
    ...state,
    hunger: CLAMP(state.hunger - 0.5 * minutes),
    happiness: CLAMP(state.happiness - 0.3 * minutes),
    energy: CLAMP(state.energy - 0.2 * minutes),
    lastTick: now,
  };
  return next;
}

export function feed(state) {
  return {
    ...state,
    hunger: CLAMP(state.hunger + 25),
    energy: CLAMP(state.energy - 5),
    lastFed: Date.now(),
  };
}

export function play(state) {
  return {
    ...state,
    happiness: CLAMP(state.happiness + 20),
    energy: CLAMP(state.energy - 10),
    hunger: CLAMP(state.hunger - 5),
    lastPlayed: Date.now(),
    xp: state.xp + 5,
  };
}

export function rest(state) {
  return {
    ...state,
    energy: CLAMP(state.energy + 30),
  };
}

export function rename(state, name) {
  return { ...state, name: String(name).slice(0, 20) };
}

export function switchSpecies(state, species) {
  return { ...state, species };
}

export function celebrate(state, durationMs = 4000) {
  return {
    ...state,
    happiness: CLAMP(state.happiness + 5),
    state: "celebrating",
    stateUntil: Date.now() + durationMs,
    stateReason: "session idle",
  };
}

export function scared(state, durationMs = 5000) {
  return {
    ...state,
    state: "scared",
    stateUntil: Date.now() + durationMs,
    stateReason: "session error",
  };
}

export function working(state) {
  // Don't overwrite a stronger transient state
  if (state.state === "celebrating" && Date.now() < state.stateUntil)
    return state;
  if (state.state === "scared" && Date.now() < state.stateUntil) return state;
  return { ...state, state: "working", stateUntil: 0, stateReason: "" };
}

// Derive state purely from attributes when no external override is active.
export function deriveState(state, now = Date.now()) {
  if (state.state === "celebrating" && now < state.stateUntil) return state;
  if (state.state === "scared" && now < state.stateUntil) return state;

  if (state.energy < 20) {
    return { ...state, state: "sleeping", stateReason: "low energy" };
  }
  if (state.hunger < 25) {
    return { ...state, state: "scared", stateReason: "hungry", stateUntil: now + 30_000 };
  }
  if (state.state === "working") return state;
  return { ...state, state: "idle", stateReason: "" };
}

export function maybeLevelUp(state) {
  const xpNeeded = state.level * 50;
  if (state.xp < xpNeeded) return state;
  return {
    ...state,
    level: state.level + 1,
    xp: state.xp - xpNeeded,
    happiness: CLAMP(state.happiness + 10),
  };
}

export function describe(state) {
  const mood =
    state.happiness > 80
      ? "happy"
      : state.happiness > 50
        ? "okay"
        : state.happiness > 25
          ? "grumpy"
          : "depressed";
  const tummy =
    state.hunger > 70
      ? "full"
      : state.hunger > 40
        ? "peckish"
        : state.hunger > 20
          ? "hungry"
          : "starving";
  return `${state.name} the ${state.species} | Lv ${state.level} | ${mood} | ${tummy} | hunger ${Math.floor(state.hunger)} happiness ${Math.floor(state.happiness)} energy ${Math.floor(state.energy)} | xp ${state.xp}/${state.level * 50}`;
}
