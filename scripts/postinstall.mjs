#!/usr/bin/env node
// Postinstall: register the buddy plugin in opencode config files so the user
// only needs to run `npm install -g opencode-buddy` and restart opencode.
//
// We touch two files:
//   - ~/.config/opencode/opencode.json   (server plugin)
//   - ~/.config/opencode/tui.json        (TUI plugin, created if missing)
//
// We are idempotent: if the entry is already present, we leave it alone.
// We never overwrite a user's existing config — we only add the `plugin` key.

import { promises as fs } from "node:fs"
import path from "node:path"
import os from "node:os"

const PLUGIN_SPEC = "opencode-buddy"
const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode")
const SERVER_CONFIG = path.join(CONFIG_DIR, "opencode.json")
const TUI_CONFIG = path.join(CONFIG_DIR, "tui.json")

async function readJSON(filepath) {
  try {
    const raw = await fs.readFile(filepath, "utf8")
    return { raw, data: JSON.parse(raw) }
  } catch (err) {
    if (err.code === "ENOENT") return null
    throw err
  }
}

function hasComments(raw) {
  // JSONC comments: // line comments and /* block */ comments.
  return /\/\/[^\n]*|\/\*[\s\S]*?\*\//.test(raw)
}

function ensurePluginArray(data, spec) {
  if (!data || typeof data !== "object") return false
  const list = Array.isArray(data.plugin) ? data.plugin : []
  if (list.some((entry) => typeof entry === "string" && entry === spec)) return false
  list.push(spec)
  data.plugin = list
  return true
}

async function updateConfig({ filepath, spec, fallback, mergeTopLevel }) {
  let existing = await readJSON(filepath)

  if (existing && hasComments(existing.raw)) {
    // Don't touch JSONC files with comments — we'd strip them.
    return { changed: false, created: false, skipped: true }
  }

  let data
  let isNew

  if (!existing) {
    data = { ...fallback }
    isNew = true
  } else {
    data = existing.data
    isNew = false
  }

  if (mergeTopLevel) {
    Object.assign(data, mergeTopLevel)
  }

  const changed = ensurePluginArray(data, spec)
  if (!changed && !isNew) {
    return { changed: false, created: false }
  }

  await fs.mkdir(path.dirname(filepath), { recursive: true })
  const json = JSON.stringify(data, null, 2) + "\n"
  await fs.writeFile(filepath, json)

  if (isNew) return { changed: true, created: true }
  return { changed: true, created: false }
}

async function main() {
  const results = []

  results.push({
    file: SERVER_CONFIG,
    ...(await updateConfig({
      filepath: SERVER_CONFIG,
      spec: PLUGIN_SPEC,
      fallback: { $schema: "https://opencode.ai/config.json" },
    })),
  })

  results.push({
    file: TUI_CONFIG,
    ...(await updateConfig({
      filepath: TUI_CONFIG,
      spec: PLUGIN_SPEC,
      fallback: { $schema: "https://opencode.ai/tui.json" },
    })),
  })

  for (const r of results) {
    if (r.changed) {
      const action = r.created ? "created" : "updated"
      console.log(`[opencode-buddy] ${action} ${r.file}`)
    }
  }
}

main().catch((err) => {
  console.error("[opencode-buddy] postinstall: failed to register plugin", err.message)
  // Don't fail the install — the user can configure manually if needed.
  process.exit(0)
})
