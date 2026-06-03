#!/usr/bin/env node
// CLI entry point. Routes to either the headless command runner or the
// interactive TUI renderer.

import { runInteractive, runCommand } from "../src/index.js";
import { install, uninstall } from "../src/install.js";

const argv = process.argv.slice(2);
const [sub, ...rest] = argv;

async function main() {
  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    await runCommand([]);
    return;
  }

  if (sub === "start") {
    await runInteractive({ autoSplit: true });
    return;
  }

  if (sub === "render") {
    // Re-entered inside the tmux side pane by `start`. Just render.
    await runInteractive({ autoSplit: false });
    return;
  }

  if (sub === "install") {
    await install();
    return;
  }

  if (sub === "uninstall") {
    await uninstall();
    return;
  }

  // Everything else: headless command
  await runCommand(argv);
}

main().catch((err) => {
  console.error(`opencode-buddy: ${err.message || err}`);
  process.exit(1);
});
