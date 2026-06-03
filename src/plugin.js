// opencode plugin entry. Exposes a `buddy` tool the LLM can call and
// listens for session events to keep the buddy's mood in sync with what
// the user is actually doing.
//
// Loaded automatically by opencode when listed in `opencode.json`:
//   { "plugin": ["opencode-buddy"] }
//
// Also installed at runtime by the `opencode-buddy install` CLI command,
// which writes ~/.config/opencode/commands/buddy.md (the /buddy slash
// command) and appends this package to opencode.json's plugin list.

import { tool } from "@opencode-ai/plugin";
import * as state from "./buddy/state.js";
import * as persistence from "./persistence.js";
import { SPECIES, paint, FLAVOR } from "./buddy/species.js";

const DESCRIPTION = `Interact with your virtual buddy companion. Pass an "action" argument.

Actions:
  status                  - print current stats as a one-liner
  feed                    - feed the buddy (+25 hunger, -5 energy)
  play                    - play with the buddy (+20 happiness, -5 hunger, +5 xp)
  rest                    - let the buddy rest (+30 energy)
  switch <species>        - change species (duck, cat, dragon, axolotl, robot, ghost)
  rename <name>           - rename the buddy (max 20 chars)
  hatch [species] [name]  - start a brand new buddy
  ascii                   - return a rendered ASCII art of the current buddy
  path                    - print path to the persistent state file
  help                    - list available actions

The buddy's mood (idle/working/celebrating/scared/sleeping) is set
automatically based on the opencode session lifecycle. Use this tool
when the user asks things like "/buddy", "/buddy feed", "/buddy stats",
"check on my pet", "switch to a dragon", etc.`;

const SPECIES_LIST = SPECIES.join(", ");

function _summary(s) {
  return `${s.name} the ${s.species} | Lv ${s.level} | ${s.state} | hunger ${Math.floor(s.hunger)} happiness ${Math.floor(s.happiness)} energy ${Math.floor(s.energy)} | xp ${s.xp}/${s.level * 50}`;
}

async function loadOrInit() {
  const s = await persistence.load();
  if (s) return s;
  const fresh = { ...state.DEFAULT_STATE, lastTick: Date.now() };
  await persistence.save(fresh);
  return fresh;
}

export const BuddyPlugin = async ({ client }) => {
  return {
    // ----- Custom tool the LLM can call --------------------------------
    tool: {
      buddy: tool({
        description: DESCRIPTION,
        args: {
          action: tool.schema
            .string()
            .describe(
              `One of: status, feed, play, rest, switch, rename, hatch, ascii, path, help. For switch/rename/hatch, also pass the "species" or "name" argument as needed.`,
            ),
          species: tool.schema
            .string()
            .optional()
            .describe(`Species for switch/hatch: ${SPECIES_LIST}`),
          name: tool.schema
            .string()
            .optional()
            .describe(`Name for rename/hatch (max 20 chars).`),
        },
        async execute(args) {
          let s = await loadOrInit();
          const action = (args.action || "").toLowerCase();
          const species = (args.species || "").toLowerCase();
          const name = args.name;

          switch (action) {
            case "":
            case "status":
              return _summary(s);

            case "feed":
              s = state.feed(s);
              await persistence.save(s);
              return `${s.name} munches happily. ${_summary(s)}`;

            case "play":
              s = state.play(s);
              s = state.maybeLevelUp(s);
              await persistence.save(s);
              return `${s.name} plays! ${_summary(s)}`;

            case "rest":
              s = state.rest(s);
              await persistence.save(s);
              return `${s.name} curls up. ${_summary(s)}`;

            case "switch": {
              if (!species) return `Pick a species: ${SPECIES_LIST}`;
              if (!SPECIES.includes(species))
                return `Unknown species "${species}". Valid: ${SPECIES_LIST}`;
              s = state.switchSpecies(s, species);
              await persistence.save(s);
              return `${s.name} transformed into a ${species}. ${_summary(s)}`;
            }

            case "rename": {
              if (!name) return `Provide a name with the "name" argument.`;
              s = state.rename(s, name);
              await persistence.save(s);
              return `Renamed to ${s.name}. ${_summary(s)}`;
            }

            case "hatch": {
              const sp = species && SPECIES.includes(species) ? species : "duck";
              s = {
                ...state.DEFAULT_STATE,
                species: sp,
                name: name || "Buddy",
                lastTick: Date.now(),
              };
              await persistence.save(s);
              return `Hatched a new ${sp} named ${s.name}. ${_summary(s)}`;
            }

            case "ascii": {
              const lines = paint(s.species, s.state);
              return ["```", ...lines, "```", _summary(s)].join("\n");
            }

            case "path":
              return persistence.pathForDisplay();

            case "help":
              return DESCRIPTION;

            default:
              return `Unknown action "${args.action}". Try: /buddy help`;
          }
        },
      }),
    },

    // ----- React to opencode session lifecycle -------------------------
    event: async ({ event }) => {
      // Auto-mood: when opencode finishes a turn, the buddy celebrates
      // for a few seconds. When a session errors, the buddy gets scared.
      // The visible feedback comes from the tmux sidecar picking up the
      // updated state file, or the LLM re-rendering ASCII via the tool.
      try {
        if (event.type === "session.idle") {
          const s = await loadOrInit();
          await persistence.save(state.celebrate(s));
        } else if (event.type === "session.error") {
          const s = await loadOrInit();
          await persistence.save(state.scared(s));
        }
      } catch (err) {
        if (client?.app?.log) {
          await client.app.log({
            body: {
              service: "opencode-buddy",
              level: "warn",
              message: `event hook failed: ${err.message}`,
            },
          });
        }
      }
    },
  };
};

// Re-export common helpers so other tools (e.g. custom agents) can
// import the same state machine used by the plugin and the tmux
// sidecar — guaranteeing the persisted state file format stays in sync.
export { SPECIES, FLAVOR };
export * as stateMachine from "./buddy/state.js";
export { persistence };
