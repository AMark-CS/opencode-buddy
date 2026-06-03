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
  state: "idle",
  stateUntil: 0,
  stateReason: "",
};

const CLAMP = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function tick(state, now = Date.now()) {
  const minutes = (now - state.lastTick) / 60_000;
  if (minutes <= 0) return state;
  return {
    ...state,
    hunger: CLAMP(state.hunger - 0.5 * minutes),
    happiness: CLAMP(state.happiness - 0.3 * minutes),
    energy: CLAMP(state.energy - 0.2 * minutes),
    lastTick: now,
  };
}

export function feed(state) {
  return {
    ...state,
    hunger: CLAMP(state.hunger + 25),
    energy: CLAMP(state.energy - 5),
    lastFed: Date.now(),
    lastTick: Date.now(),
  };
}

export function play(state) {
  const next = {
    ...state,
    happiness: CLAMP(state.happiness + 20),
    energy: CLAMP(state.energy - 10),
    hunger: CLAMP(state.hunger - 5),
    lastPlayed: Date.now(),
    lastTick: Date.now(),
    xp: state.xp + 5,
  };
  return maybeLevelUp(next);
}

export function rest(state) {
  return { ...state, energy: CLAMP(state.energy + 30), lastTick: Date.now() };
}

export function rename(state, name) {
  return { ...state, name: String(name).slice(0, 20), lastTick: Date.now() };
}

export function switchSpecies(state, species) {
  return { ...state, species, lastTick: Date.now() };
}

export function hatch(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    ...overrides,
    lastTick: Date.now(),
  };
}

export function celebrate(state) {
  return {
    ...state,
    state: "celebrating",
    stateUntil: Date.now() + 4000,
    lastTick: Date.now(),
  };
}

export function scared(state) {
  return {
    ...state,
    state: "scared",
    stateUntil: Date.now() + 5000,
    lastTick: Date.now(),
  };
}

export function working(state) {
  if (state.state === "celebrating" && Date.now() < state.stateUntil) return state;
  if (state.state === "scared" && Date.now() < state.stateUntil) return state;
  return { ...state, state: "working", stateUntil: 0, lastTick: Date.now() };
}

export function deriveState(state, now = Date.now()) {
  if (state.state === "celebrating" && now < state.stateUntil) return state;
  if (state.state === "scared" && now < state.stateUntil) return state;
  if (state.energy < 20) return { ...state, state: "sleeping", lastTick: now };
  if (state.hunger < 25) {
    return { ...state, state: "scared", stateUntil: now + 30_000, lastTick: now };
  }
  if (state.state === "working") return state;
  return { ...state, state: "idle", lastTick: now };
}

function maybeLevelUp(state) {
  const xpNeeded = state.level * 50;
  if (state.xp < xpNeeded) return state;
  return {
    ...state,
    level: state.level + 1,
    xp: state.xp - xpNeeded,
    happiness: CLAMP(state.happiness + 10),
    lastTick: Date.now(),
  };
}
