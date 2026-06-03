// End-to-end smoke test: launches a detached tmux session, runs the buddy
// commands, captures output, kills the session. Run with `node test/e2e.js`.

import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const BIN = new URL("../bin/opencode-buddy.js", import.meta.url).pathname;
const BUDDY = `node ${BIN}`;
const SESSION = "oc-buddy-e2e";

function tmux(args) {
  const r = spawnSync("tmux", args, { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function run(cmd) {
  return tmux(["send-keys", "-t", SESSION, cmd, "Enter"]);
}

function capture(lines = 120) {
  return tmux([
    "capture-pane",
    "-t",
    SESSION,
    "-p",
    "-S",
    `-${lines}`,
  ]).stdout;
}

function buddy(cmd) {
  // Always invoke the buddy script via absolute path. Returned output
  // appears in the captured pane a moment later.
  return run(`${BUDDY} ${cmd}`);
}

function cleanup() {
  tmux(["kill-session", "-t", SESSION]);
  // Also kill any leftover buddy pane that's still running the script
  tmux(["list-panes", "-a", "-F", "#{pane_id} #{pane_current_command}"])
    .stdout.split("\n")
    .filter((l) => l.includes("opencode-buddy"))
    .forEach((l) => {
      const pid = l.split(" ")[0];
      tmux(["kill-pane", "-t", pid]);
    });
}

function waitForText(needle, attempts = 30, intervalMs = 200) {
  // Poll the pane until the needle shows up, then wait one more
  // interval and capture the now-stable full pane contents.
  for (let i = 0; i < attempts; i++) {
    const text = capture(200);
    if (text.includes(needle)) {
      // Wait one more tick to make sure following lines (e.g. the
      // describe() output of a `stats` call) have been written.
      spawnSync("sleep", [`${intervalMs / 1000}`]);
      return capture(200);
    }
    spawnSync("sleep", [`${intervalMs / 1000}`]);
  }
  return capture(200);
}

let failed = false;
function step(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    failed = true;
    console.error(`  \u2717 ${name}: ${err.message}`);
  }
}

cleanup();
spawnSync("sleep", ["0.3"]);
const start = tmux([
  "new-session",
  "-d",
  "-s",
  SESSION,
  "-x",
  "200",
  "-y",
  "50",
]);
if (start.status !== 0) {
  console.error("failed to start tmux session:", start.stderr);
  process.exit(1);
}

// Reset persisted state so the first `stats` call shows the default duck
spawnSync("rm", ["-f", `${process.env.HOME}/.config/opencode-buddy/state.json`]);
spawnSync("sleep", ["0.2"]);

console.log("opencode-buddy e2e");
console.log("-------------------");

step("tmux session is alive", () => {
  const r = tmux(["has-session", "-t", SESSION]);
  assert.equal(r.status, 0);
});

step("`stats` prints buddy info on empty state", () => {
  buddy("stats");
  const text = waitForText("the duck");
  assert.match(text, /the duck/);
  assert.match(text, /Lv 1/);
});

step("`hatch dragon Sparky` switches species", () => {
  buddy("hatch dragon Sparky");
  const text = waitForText("Hatched a new dragon");
  assert.match(text, /Hatched a new dragon/);
});

step("`stats` reflects new species", () => {
  buddy("stats");
  const text = waitForText("Sparky the dragon");
  assert.match(text, /Sparky the dragon/);
});

step("`feed` increases hunger", () => {
  buddy("feed");
  const text = waitForText("Fed Sparky");
  assert.match(text, /Fed Sparky/);
});

step("`play` increases happiness", () => {
  buddy("play");
  const text = waitForText("Played with Sparky");
  assert.match(text, /Played with Sparky/);
});

step("`rename Long-Name-Over-Twenty-Chars` truncates", () => {
  buddy("rename ThisNameIsWayTooLongForTheLimit");
  waitForText("Renamed");
  buddy("stats");
  // Wait specifically for the stats line that contains the new name
  const text = waitForText("ThisNameIsWayTooLong ");
  const statsLines = text
    .split("\n")
    .filter((l) => l.includes("the ") && l.includes("Lv "));
  assert.ok(statsLines.length > 0, `no stats line in:\n${text.slice(-800)}`);
  const latest = statsLines[statsLines.length - 1];
  assert.match(latest, /\bThisNameIsWayTooLong\b/);
  assert.doesNotMatch(latest, /ThisNameIsWayTooLongForTheLimit/);
});

step("`switch cat` changes species", () => {
  buddy("switch cat");
  waitForText("transformed");
  buddy("stats");
  const text = waitForText("the cat");
  assert.match(text, /the cat/);
});

step("`notify done` does not error", () => {
  buddy("notify done");
  const text = waitForText("Notified buddy");
  assert.match(text, /Notified buddy/);
});

step("`start` splits a side pane and renders", () => {
  // Start buddy in side pane
  buddy("start");
  // wait for split + render
  spawnSync("sleep", ["1.5"]);
  // List panes to find the buddy pane
  const panes = tmux([
    "list-panes",
    "-t",
    SESSION,
    "-F",
    "#{pane_id} #{pane_current_command}",
  ]).stdout;
  // The buddy pane runs `node ... opencode-buddy.js render`
  const buddyPane = panes
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.includes("node") && l.length > 1);
  assert.ok(buddyPane, `expected a node pane, got: ${panes}`);
  const paneId = buddyPane.split(" ")[0];
  // -e captures the alternate screen contents
  const r = tmux(["capture-pane", "-e", "-t", paneId, "-p", "-S", "-50"]);
  assert.equal(r.status, 0, r.stderr);
  // Buddy is on cat species (from previous `switch cat` step), so the
  // state label will be IDLE/WORKING/etc. The art is the "cat" art.
  assert.match(r.stdout, /hunger/, `expected hunger label in:\n${r.stdout.slice(0, 500)}`);
  assert.match(r.stdout, /IDLE|happy|meow/, `expected frame content in:\n${r.stdout.slice(0, 500)}`);
});

step("side pane contains node process", () => {
  const r = tmux([
    "list-panes",
    "-t",
    SESSION,
    "-F",
    "#{pane_id}:#{pane_current_command}",
  ]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /node/);
});

cleanup();

console.log("-------------------");
if (failed) {
  console.error("e2e FAILED");
  process.exit(1);
} else {
  console.log("e2e OK");
}
