// Plugin smoke test: verifies the exported plugin's shape matches what
// opencode expects. Does NOT require opencode to be running.

import assert from "node:assert/strict";
import { test } from "node:test";

import { BuddyPlugin, SPECIES } from "../src/plugin.js";
import * as persistence from "../src/persistence.js";

const PLUGIN_NAME = "opencode-buddy";

// A minimal context that mirrors the real ctx shape so BuddyPlugin can run.
const fakeCtx = {
  project: { id: "test" },
  directory: process.cwd(),
  worktree: process.cwd(),
  client: undefined,
  $: undefined,
};

test("BuddyPlugin is an async function", () => {
  assert.equal(typeof BuddyPlugin, "function");
});

test("BuddyPlugin returns the expected hook shape", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  assert.ok(hooks, "plugin returned no hooks");
  assert.equal(typeof hooks.event, "function", "missing event hook");
  assert.ok(hooks.tool, "missing tool hook");
  assert.ok(hooks.tool.buddy, "missing buddy tool");
});

test("buddy tool has description, args schema, and execute", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  const t = hooks.tool.buddy;
  assert.ok(t.description, "missing description");
  assert.ok(t.description.includes("buddy"), "description should mention buddy");
  assert.ok(t.args, "missing args");
  assert.ok(t.args.action, "missing action arg");
  assert.equal(typeof t.execute, "function", "missing execute");
});

test("SPECIES is exported and has the expected list", () => {
  assert.deepEqual(SPECIES, ["duck", "cat", "dragon", "axolotl", "robot", "ghost"]);
});

test("status action returns a one-liner without mutating state", async () => {
  // Reset persisted state for determinism
  await persistence.save({
    ...((await persistence.load()) || {}),
    name: "TestBuddy",
    species: "cat",
    hunger: 70,
    happiness: 60,
    energy: 50,
    xp: 0,
    level: 1,
    state: "idle",
    stateUntil: 0,
    stateReason: "",
    lastFed: Date.now(),
    lastPlayed: Date.now(),
    lastTick: Date.now(),
    hatchedAt: Date.now(),
  });

  const hooks = await BuddyPlugin(fakeCtx);
  const out = await hooks.tool.buddy.execute(
    { action: "status" },
    { directory: process.cwd(), worktree: process.cwd() },
  );
  assert.match(out, /TestBuddy the cat/);
  assert.match(out, /Lv 1/);
});

test("feed action bumps hunger and persists", async () => {
  // Seed with low hunger so the bump is observable
  await persistence.save({
    ...((await persistence.load()) || {}),
    name: "TestBuddy",
    species: "cat",
    hunger: 30,
    happiness: 60,
    energy: 50,
    xp: 0,
    level: 1,
    state: "idle",
    stateUntil: 0,
    stateReason: "",
    lastFed: 0,
    lastPlayed: Date.now(),
    lastTick: Date.now(),
    hatchedAt: Date.now(),
  });

  const hooks = await BuddyPlugin(fakeCtx);
  await hooks.tool.buddy.execute(
    { action: "feed" },
    { directory: process.cwd(), worktree: process.cwd() },
  );
  const s = await persistence.load();
  assert.ok(s.hunger > 30, `expected hunger > 30, got ${s.hunger}`);
});

test("switch with invalid species returns a helpful error", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  const out = await hooks.tool.buddy.execute(
    { action: "switch", species: "narwhal" },
    { directory: process.cwd(), worktree: process.cwd() },
  );
  assert.match(out, /Unknown species/);
  assert.match(out, /duck/);
});

test("hatch resets state to defaults", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  await hooks.tool.buddy.execute(
    { action: "hatch", species: "dragon", name: "Sparky" },
    { directory: process.cwd(), worktree: process.cwd() },
  );
  const s = await persistence.load();
  assert.equal(s.species, "dragon");
  assert.equal(s.name, "Sparky");
});

test("path action returns the state file path", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  const out = await hooks.tool.buddy.execute(
    { action: "path" },
    { directory: process.cwd(), worktree: process.cwd() },
  );
  assert.match(out, /opencode-buddy/);
  assert.match(out, /state\.json$/);
});

test("ascii action returns a code block with art", async () => {
  // Set a known species
  await persistence.save({
    ...((await persistence.load()) || {}),
    species: "robot",
    name: "Beep",
    state: "idle",
    stateUntil: 0,
    stateReason: "",
    hunger: 80,
    happiness: 80,
    energy: 80,
    xp: 0,
    level: 1,
    lastFed: Date.now(),
    lastPlayed: Date.now(),
    lastTick: Date.now(),
    hatchedAt: Date.now(),
  });

  const hooks = await BuddyPlugin(fakeCtx);
  const out = await hooks.tool.buddy.execute(
    { action: "ascii" },
    { directory: process.cwd(), worktree: process.cwd() },
  );
  assert.match(out, /```/);
  // Species name should appear in the summary line, even if the
  // individual letters of "beep" are interleaved with ANSI codes.
  assert.match(out, /Beep the robot/);
  // The art block must contain at least one robot frame indicator.
  // Strip ANSI for a simpler match.
  const stripped = out.replace(/\x1b\[[0-9;]*m/g, "");
  assert.match(stripped, /beep/);
});

test("event hook does not throw on session.idle", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  // Should swallow errors and just log them; never rethrow to opencode
  await assert.doesNotReject(async () => {
    await hooks.event({ event: { type: "session.idle" } });
  });
});

test("event hook does not throw on session.error", async () => {
  const hooks = await BuddyPlugin(fakeCtx);
  await assert.doesNotReject(async () => {
    await hooks.event({ event: { type: "session.error" } });
  });
});

// Sanity: package.json + plugin shape are consistent
test("package.json name matches plugin name", async () => {
  const pkg = JSON.parse(
    await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ),
  );
  assert.equal(pkg.name, PLUGIN_NAME);
  assert.equal(pkg.main, "src/plugin.js");
});
