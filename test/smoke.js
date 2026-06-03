// Smoke test: exercises state machine and species paint functions without
// any I/O. Run with `node test/smoke.js` or `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_STATE,
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
  describe,
} from "../src/buddy/state.js";
import {
  SPECIES,
  paint,
  frameWidth,
  frameHeight,
} from "../src/buddy/species.js";

test("all species have all states at same dimensions", () => {
  const targetW = 20;
  const targetH = 6;
  for (const sp of SPECIES) {
    for (const st of ["idle", "working", "celebrating", "scared", "sleeping"]) {
      const w = frameWidth();
      const h = frameHeight(sp);
      assert.equal(w, targetW, `width should be ${targetW}, got ${w}`);
      assert.equal(h, targetH, `${sp} height should be ${targetH}, got ${h}`);
    }
  }
});

test("paint returns non-empty strings", () => {
  for (const sp of SPECIES) {
    for (const st of ["idle", "working", "celebrating", "scared", "sleeping"]) {
      const lines = paint(sp, st);
      assert.equal(lines.length, frameHeight(sp));
      for (const line of lines) assert.ok(line.length > 0);
    }
  }
});

test("tick decays attributes over time", () => {
  const s = { ...DEFAULT_STATE, lastTick: 0 };
  const next = tick(s, 60_000); // +1 minute
  assert.ok(next.hunger < s.hunger, "hunger should decay");
  assert.ok(next.happiness < s.happiness, "happiness should decay");
  assert.ok(next.energy < s.energy, "energy should decay");
});

test("feed raises hunger, play raises happiness, rest raises energy", () => {
  const base = { ...DEFAULT_STATE, hunger: 30, happiness: 30, energy: 30 };
  const f = feed(base);
  assert.ok(f.hunger > base.hunger);
  const p = play(base);
  assert.ok(p.happiness > base.happiness);
  const r = rest(base);
  assert.ok(r.energy > base.energy);
});

test("rename truncates to 20 chars", () => {
  const s = rename(DEFAULT_STATE, "x".repeat(50));
  assert.equal(s.name.length, 20);
});

test("switchSpecies accepts only valid species", () => {
  const s = switchSpecies(DEFAULT_STATE, "dragon");
  assert.equal(s.species, "dragon");
});

test("celebrate sets transient state", () => {
  const s = celebrate(DEFAULT_STATE, 1000);
  assert.equal(s.state, "celebrating");
  assert.ok(s.stateUntil > Date.now());
});

test("scared sets transient state", () => {
  const s = scared(DEFAULT_STATE, 1000);
  assert.equal(s.state, "scared");
});

test("deriveState picks sleeping when energy is low", () => {
  const s = { ...DEFAULT_STATE, energy: 5, hunger: 80 };
  const d = deriveState(s);
  assert.equal(d.state, "sleeping");
});

test("deriveState picks scared when hungry", () => {
  const s = { ...DEFAULT_STATE, energy: 80, hunger: 10 };
  const d = deriveState(s);
  assert.equal(d.state, "scared");
});

test("maybeLevelUp increments level when xp threshold met", () => {
  const s = { ...DEFAULT_STATE, level: 1, xp: 50 };
  const next = maybeLevelUp(s);
  assert.equal(next.level, 2);
  assert.equal(next.xp, 0);
});

test("describe produces a status string", () => {
  const out = describe(DEFAULT_STATE);
  assert.match(out, /the duck/);
  assert.match(out, /Lv 1/);
});
