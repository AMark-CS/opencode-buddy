/** @jsxImportSource @opentui/solid */
import { createSignal, createMemo, createEffect, onCleanup } from "solid-js"
import * as persistence from "./persistence.js"
import {
  tick as tickState,
  celebrate as celebrateState,
  scared as scaredState,
  deriveState,
  feed,
  play,
  rest,
  rename,
  switchSpecies,
} from "./state.js"
import { renderFrame, frameCount, frameIntervalMs, SPECIES } from "./species.js"

const ANIMATION_TICK_MS = frameIntervalMs()
const REFRESH_TICK_MS = 1500

function View(props) {
  const api = props.api
  const theme = () => api.theme.current
  const [state, setState] = createSignal(null)
  const [frame, setFrame] = createSignal(0)
  const [lastMtime, setLastMtime] = createSignal(0)
  const [tick, setTick] = createSignal(0)

  const refresh = async () => {
    try {
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
        setTick(tick() + 1)
        return
      }
      if (mt !== lastMtime()) {
        setLastMtime(mt)
        const onDisk = await persistence.load()
        if (onDisk) {
          const ticked = tickState(onDisk)
          const derived = deriveState(ticked)
          setState(derived)
          setTick(tick() + 1)
          persistence.save(derived).catch(() => {})
        }
      }
    } catch (err) {
      console.error("[buddy] refresh error", err)
    }
  }

  refresh()
  const refreshTimer = setInterval(refresh, REFRESH_TICK_MS)
  onCleanup(() => clearInterval(refreshTimer))

  // Use createEffect to run a self-perpetuating animation loop. The
  // effect re-runs on every frame change, so the animation is tied to
  // the reactive system rather than setInterval. This survives slot
  // teardowns because effects re-establish on each tracking pass.
  createEffect(() => {
    // Read frame() to track it; the actual update happens via setTimeout.
    frame()
    const id = setTimeout(() => {
      setFrame((f) => f + 1)
    }, ANIMATION_TICK_MS)
    onCleanup(() => clearTimeout(id))
  })

  const current = state
  const species = () => {
    const v = current()
    return v ? v.species : "duck"
  }
  const buddyState = () => {
    const v = current()
    return v ? v.state : "idle"
  }
  const fc = createMemo(() => frameCount(species(), buddyState()))
  const lines = createMemo(() => renderFrame(species(), buddyState(), frame() % Math.max(1, fc())))

  const barStr = (v) => {
    const filled = Math.round((v / 100) * 10)
    return "|" + "\u2588".repeat(filled) + "\u2591".repeat(10 - filled) + "|"
  }

  const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "")

  const speciesColor = () => {
    const sp = current()?.species
    if (sp === "cat") return theme().accent
    if (sp === "duck") return theme().success
    if (sp === "dragon") return theme().error
    if (sp === "axolotl") return theme().accent
    if (sp === "robot") return theme().info
    if (sp === "ghost") return theme().text
    return theme().text
  }

  const SPINNER = ["\u25D0", "\u25D3", "\u25D1", "\u25D2"]
  const spinner = () => SPINNER[frame() % SPINNER.length]

  return (
    <box>
      <text fg={theme().accent}>{spinner()}  {current() ? current().name + " the " + current().species : "BUDDY"}</text>
      <text fg={speciesColor()}>{stripAnsi(lines()[0] ?? "")}</text>
      <text fg={speciesColor()}>{stripAnsi(lines()[1] ?? "")}</text>
      <text fg={speciesColor()}>{stripAnsi(lines()[2] ?? "")}</text>
      <text fg={speciesColor()}>{stripAnsi(lines()[3] ?? "")}</text>
      <text fg={speciesColor()}>{stripAnsi(lines()[4] ?? "")}</text>
      <text fg={speciesColor()}>{stripAnsi(lines()[5] ?? "")}</text>
      <text fg={theme().textMuted}>hunger {barStr(current()?.hunger ?? 0)} {Math.floor(current()?.hunger ?? 0)}</text>
      <text fg={theme().textMuted}>happy  {barStr(current()?.happiness ?? 0)} {Math.floor(current()?.happiness ?? 0)}</text>
      <text fg={theme().textMuted}>energy {barStr(current()?.energy ?? 0)} {Math.floor(current()?.energy ?? 0)}</text>
      <text fg={theme().textMuted}>{current()?.state ?? "..."}  Lv{current()?.level ?? 1}  xp{current()?.xp ?? 0}/{(current()?.level ?? 1) * 50}</text>
    </box>
  )
}

const tui = async (api) => {
  // The View element is cached on the api object so it survives slot
  // re-renders. If we returned a fresh <View> each time the slot
  // renderer was called, the previous View's onCleanup would clear
  // the setInterval and the buddy would freeze. With caching, the
  // setInterval persists across slot re-renders.
  const viewCache = new Map()

  api.slots.register({
    order: 50,
    slots: {
      sidebar_content(_ctx, props) {
        const key = props.session_id ?? "default"
        if (!viewCache.has(key)) {
          viewCache.set(key, <View api={api} session_id={props.session_id} />)
        }
        return viewCache.get(key)
      },
    },
  })

  const feedBuddy = async () => {
    const s = await persistence.load()
    if (!s) return
    const next = feed(s)
    await persistence.save(next)
    api.ui.toast({ variant: "success", title: "Yum!", message: `${next.name} ate a snack.` })
  }
  const playBuddy = async () => {
    const s = await persistence.load()
    if (!s) return
    const next = play(s)
    await persistence.save(next)
    api.ui.toast({ variant: "success", title: "Woohoo!", message: `${next.name} played (+5xp).` })
  }
  const restBuddy = async () => {
    const s = await persistence.load()
    if (!s) return
    const next = rest(s)
    await persistence.save(next)
    api.ui.toast({ variant: "info", title: "Zzz", message: `${next.name} is napping.` })
  }
  const statusBuddy = async () => {
    const s = await persistence.load()
    if (!s) return
    api.ui.toast({
      variant: "info",
      title: `${s.name} the ${s.species}`,
      message: `Lv${s.level} xp${s.xp}/${s.level * 50} - hunger ${Math.floor(s.hunger)} happy ${Math.floor(s.happiness)} energy ${Math.floor(s.energy)}`,
    })
  }
  const renameBuddy = () => {
    api.ui.dialog.replace(() => (
      <api.ui.DialogPrompt
        title="Rename buddy"
        placeholder="New name (max 20 chars)"
        onConfirm={async (value) => {
          const s = await persistence.load()
          if (!s) return
          const next = rename(s, value)
          await persistence.save(next)
          api.ui.toast({ variant: "success", title: "Renamed", message: `Now called ${next.name}.` })
        }}
        onCancel={() => {}}
      />
    ))
  }
  const switchBuddy = () => {
    const options = SPECIES.map((sp) => ({
      title: sp,
      value: sp,
      onSelect: async () => {
        const s = await persistence.load()
        if (!s) return
        const next = switchSpecies(s, sp)
        await persistence.save(next)
        api.ui.toast({ variant: "success", title: "Morphed", message: `Now a ${sp}.` })
        api.ui.dialog.clear()
      },
    }))
    api.ui.dialog.replace(() => (
      <api.ui.DialogSelect
        title="Switch species"
        options={options}
        onSelect={() => {}}
      />
    ))
  }

  api.keymap.registerLayer({
    commands: [
      {
        namespace: "palette",
        name: "buddy.feed",
        title: "Feed buddy",
        slashName: "buddy-feed",
        category: "Buddy",
        run() {
          api.ui.dialog.clear()
          void feedBuddy()
        },
      },
      {
        namespace: "palette",
        name: "buddy.play",
        title: "Play with buddy",
        slashName: "buddy-play",
        category: "Buddy",
        run() {
          api.ui.dialog.clear()
          void playBuddy()
        },
      },
      {
        namespace: "palette",
        name: "buddy.rest",
        title: "Buddy rests",
        slashName: "buddy-rest",
        category: "Buddy",
        run() {
          api.ui.dialog.clear()
          void restBuddy()
        },
      },
      {
        namespace: "palette",
        name: "buddy.status",
        title: "Show buddy status",
        slashName: "buddy",
        slashAliases: ["buddy-status"],
        category: "Buddy",
        run() {
          api.ui.dialog.clear()
          void statusBuddy()
        },
      },
      {
        namespace: "palette",
        name: "buddy.rename",
        title: "Rename buddy",
        slashName: "buddy-rename",
        category: "Buddy",
        run() {
          renameBuddy()
        },
      },
      {
        namespace: "palette",
        name: "buddy.switch",
        title: "Switch buddy species",
        slashName: "buddy-switch",
        category: "Buddy",
        run() {
          switchBuddy()
        },
      },
    ],
    bindings: [],
  })

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

const plugin = { id: "opencode-buddy", tui }
export default plugin
