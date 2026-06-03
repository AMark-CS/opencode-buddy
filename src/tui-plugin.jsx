/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiSlotPlugin } from "@opencode-ai/plugin/tui"
import { createSignal, createMemo, onCleanup, Show, For } from "solid-js"
import * as persistence from "./persistence.js"
import {
  tick as tickState,
  celebrate as celebrateState,
  scared as scaredState,
  deriveState,
} from "./state.js"
import { renderFrame, frameCount, frameIntervalMs } from "./species.js"

const ANIMATION_TICK_MS = frameIntervalMs()
const REFRESH_TICK_MS = 1500

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const [state, setState] = createSignal<any | null>(null)
  const [frame, setFrame] = createSignal(0)
  const [lastMtime, setLastMtime] = createSignal(0)

  const refresh = async () => {
    const mt = await persistence.mtime()
    if (mt === 0) {
      const fresh = {
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
      }
      await persistence.save(fresh)
      setLastMtime(Date.now())
      setState(fresh)
      return
    }
    if (mt !== lastMtime()) {
      setLastMtime(mt)
      const onDisk = await persistence.load()
      if (onDisk) {
        const ticked = tickState(onDisk)
        const derived = deriveState(ticked)
        setState(derived)
        // Persist derived state (so transient state changes survive)
        persistence.save(derived).catch(() => {})
      }
    }
  }

  refresh()
  const refreshTimer = setInterval(refresh, REFRESH_TICK_MS)
  onCleanup(() => clearInterval(refreshTimer))

  const animTimer = setInterval(() => {
    setFrame((f) => f + 1)
  }, ANIMATION_TICK_MS)
  onCleanup(() => clearInterval(animTimer))

  const s = () => state()
  const species = () => s()?.species ?? "duck"
  const buddyState = () => s()?.state ?? "idle"
  const fc = createMemo(() => frameCount(species(), buddyState()))
  const lines = createMemo(() => renderFrame(species(), buddyState(), frame() % Math.max(1, fc())))

  const bar = (v: number, color: any) => {
    const filled = Math.round((v / 100) * 10)
    return (
      <text>
        <span style={{ fg: theme().success }}>{"█".repeat(filled)}</span>
        <span style={{ fg: theme().borderSubtle }}>{"░".repeat(10 - filled)}</span>
      </text>
    )
  }

  return (
    <Show when={s()}>
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <text fg={theme().accent}>
          <b>  {s()!.name} the {species()}</b>
        </text>
        <For each={lines()}>
          {(line) => (
            <text>
              {"  "}
              {line}
            </text>
          )}
        </For>
        <text fg={theme().textMuted}>  {"─".repeat(20)}</text>
        <text>
          {"  hunger "}
          {bar(s()!.hunger, theme().success)}
          {" "}
          {Math.floor(s()!.hunger)}
        </text>
        <text>
          {"  happy  "}
          {bar(s()!.happiness, theme().accent)}
          {" "}
          {Math.floor(s()!.happiness)}
        </text>
        <text>
          {"  energy "}
          {bar(s()!.energy, theme().info)}
          {" "}
          {Math.floor(s()!.energy)}
        </text>
        <text fg={theme().textMuted}>
          {"  "}
          {buddyState()} · Lv {s()!.level} · xp {s()!.xp}/{s()!.level * 50}
        </text>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  // Register the slot. `api` is captured in the closure so the slot
  // function can pass it to the Solid component.
  api.slots.register({
    order: 500,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  } as TuiSlotPlugin)

  // React to opencode session events
  api.event.on("session.idle", async () => {
    const s = await persistence.load()
    if (!s) return
    await persistence.save(celebrateState(s))
  })
  api.event.on("session.error", async () => {
    const s = await persistence.load()
    if (!s) return
    await persistence.save(scaredState(s))
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-buddy",
  tui,
}

export default plugin
