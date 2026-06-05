// Persist buddy state to ~/.config/opencode-buddy/state.json
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const DIR = path.join(os.homedir(), ".config", "opencode-buddy");
const FILE = path.join(DIR, "state.json");

export async function load() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function save(state) {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.unlink(FILE).catch(() => {});
  await fs.rename(tmp, FILE);
}

export async function mtime() {
  try {
    const st = await fs.stat(FILE);
    return st.mtimeMs;
  } catch (err) {
    if (err.code === "ENOENT") return 0;
    throw err;
  }
}

export function pathForDisplay() {
  return FILE;
}
