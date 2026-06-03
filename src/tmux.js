// tmux integration: detect session, split a side pane, capture main pane
// content for activity inference.
//
// All tmux interaction goes through `tmux -t <target> <command>` so we don't
// have to manage a child process. We parse plain text output.

import { spawnSync } from "node:child_process";

export function inTmux() {
  return Boolean(process.env.TMUX);
}

export function currentPaneId() {
  const r = spawnSync("tmux", ["display-message", "-p", "#{pane_id}"], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

export function sessionName() {
  const r = spawnSync("tmux", ["display-message", "-p", "#{session_name}"], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

export function splitRight(command, size = 28) {
  // -h horizontal split (side-by-side), -l size in columns, -d don't focus
  const r = spawnSync(
    "tmux",
    [
      "split-window",
      "-h",
      "-l",
      String(size),
      "-d",
      "-P",
      "-F",
      "#{pane_id}",
      command,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`tmux split-window failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

export function captureMainPane(lines = 80) {
  const pane = currentPaneId();
  if (!pane) return "";
  const r = spawnSync(
    "tmux",
    ["capture-pane", "-t", pane, "-p", "-S", `-${lines}`],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return "";
  return r.stdout;
}

// Heuristic activity inference from captured pane text.
// Returns one of: "working" | "idle" | "error" | "unknown"
export function inferActivity(paneText) {
  if (!paneText) return "unknown";
  const tail = paneText.split("\n").slice(-40).join("\n");

  // Opencode-specific: while generating, it shows a spinner phrase
  if (/\bgenerating\b|\besc to cancel\b|\bthinking\b/i.test(tail))
    return "working";

  // Error markers
  if ((/\berror\b|\bfailed\b|\bexception\b/i.test(tail)) &&
      !/no error/i.test(tail)) {
    return "error";
  }

  // Idle: looks like an empty prompt waiting for input
  if (/^\s*>\s*$/m.test(tail) || /\bctrl\+t to view\b/i.test(tail))
    return "idle";

  return "unknown";
}

export function killBuddyPane(paneId) {
  if (!paneId) return;
  spawnSync("tmux", ["kill-pane", "-t", paneId], { encoding: "utf8" });
}
