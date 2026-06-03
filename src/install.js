// One-shot installer. Writes the /buddy slash command markdown file
// and adds this package to opencode.json's plugin list so opencode will
// bun-install it on the next startup.
//
// Re-runnable: safely no-ops if everything is already in place.

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const OPENCODE_DIR = path.join(os.homedir(), ".config", "opencode");
const COMMANDS_DIR = path.join(OPENCODE_DIR, "commands");
const COMMAND_FILE = path.join(COMMANDS_DIR, "buddy.md");
const CONFIG_FILE = path.join(OPENCODE_DIR, "opencode.json");

const PLUGIN_NAME = "opencode-buddy";

const COMMAND_BODY = `---
description: Interact with your virtual buddy companion.
---

The user typed \`/buddy\`. Use the \`buddy\` tool to respond.

If the user typed \`/buddy\` with no arguments, call the tool with
\`action: "status"\`. If they passed sub-arguments like \`/buddy feed\`
or \`/buddy switch dragon\`, map them to the tool's \`action\`,
\`species\`, and \`name\` arguments accordingly. Examples:

  /buddy              -> buddy({ action: "status" })
  /buddy feed         -> buddy({ action: "feed" })
  /buddy play         -> buddy({ action: "play" })
  /buddy switch cat   -> buddy({ action: "switch", species: "cat" })
  /buddy rename Mia   -> buddy({ action: "rename", name: "Mia" })
  /buddy hatch dragon Sparky -> buddy({ action: "hatch", species: "dragon", name: "Sparky" })
  /buddy ascii        -> buddy({ action: "ascii" })

Always show the tool's returned text to the user. If the user just wants
to see the buddy, call \`action: "ascii"\` to render the current art in a
code block.
`;

export async function install() {
  const steps = [];
  const errors = [];

  // 1. Write the slash command file
  try {
    await fs.mkdir(COMMANDS_DIR, { recursive: true });
    const existing = await fs.readFile(COMMAND_FILE, "utf8").catch(() => null);
    if (existing === COMMAND_BODY) {
      steps.push(`= ${COMMAND_FILE} (unchanged)`);
    } else {
      await fs.writeFile(COMMAND_FILE, COMMAND_BODY);
      steps.push(`+ ${COMMAND_FILE}`);
    }
  } catch (err) {
    errors.push(`failed to write ${COMMAND_FILE}: ${err.message}`);
  }

  // 2. Patch opencode.json
  try {
    let config = {};
    try {
      const raw = await fs.readFile(CONFIG_FILE, "utf8");
      config = JSON.parse(raw);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    let pluginList = config.plugin;
    if (pluginList == null) {
      pluginList = [];
      config.plugin = pluginList;
    } else if (typeof pluginList === "string") {
      pluginList = [pluginList];
      config.plugin = pluginList;
    } else if (!Array.isArray(pluginList)) {
      errors.push(
        `${CONFIG_FILE} has an unexpected "plugin" field type; expected array.`,
      );
      pluginList = [];
    }

    if (!pluginList.includes(PLUGIN_NAME)) {
      pluginList.push(PLUGIN_NAME);
      config.plugin = pluginList;
      const tmp = CONFIG_FILE + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(config, null, 2));
      await fs.rename(tmp, CONFIG_FILE);
      steps.push(`~ ${CONFIG_FILE} (added "${PLUGIN_NAME}")`);
    } else {
      steps.push(`= ${CONFIG_FILE} (already lists "${PLUGIN_NAME}")`);
    }
  } catch (err) {
    errors.push(`failed to patch ${CONFIG_FILE}: ${err.message}`);
  }

  // 3. Report
  console.log("opencode-buddy install");
  console.log("------------------------");
  for (const s of steps) console.log(`  ${s}`);
  if (errors.length) {
    console.log("\nErrors:");
    for (const e of errors) console.log(`  ! ${e}`);
    process.exit(1);
  }
  console.log("\nDone. Restart opencode to activate the /buddy command.");
  console.log("Then in opencode, try:  /buddy");
}

export async function uninstall() {
  const steps = [];
  const errors = [];

  // 1. Remove the command file
  try {
    await fs.unlink(COMMAND_FILE);
    steps.push(`- ${COMMAND_FILE}`);
  } catch (err) {
    if (err.code === "ENOENT") steps.push(`= ${COMMAND_FILE} (not present)`);
    else errors.push(`failed to remove ${COMMAND_FILE}: ${err.message}`);
  }

  // 2. Remove from opencode.json
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(raw);
    if (Array.isArray(config.plugin)) {
      const before = config.plugin.length;
      config.plugin = config.plugin.filter((p) => p !== PLUGIN_NAME);
      if (config.plugin.length === 0) delete config.plugin;
      if (config.plugin.length !== before) {
        const tmp = CONFIG_FILE + ".tmp";
        await fs.writeFile(tmp, JSON.stringify(config, null, 2));
        await fs.rename(tmp, CONFIG_FILE);
        steps.push(`~ ${CONFIG_FILE} (removed "${PLUGIN_NAME}")`);
      } else {
        steps.push(`= ${CONFIG_FILE} (no entry to remove)`);
      }
    } else {
      steps.push(`= ${CONFIG_FILE} (no plugin array)`);
    }
  } catch (err) {
    if (err.code === "ENOENT") steps.push(`= ${CONFIG_FILE} (not present)`);
    else errors.push(`failed to patch ${CONFIG_FILE}: ${err.message}`);
  }

  console.log("opencode-buddy uninstall");
  console.log("--------------------------");
  for (const s of steps) console.log(`  ${s}`);
  if (errors.length) {
    console.log("\nErrors:");
    for (const e of errors) console.log(`  ! ${e}`);
    process.exit(1);
  }
  console.log("\nDone. Restart opencode to deactivate the /buddy command.");
}
