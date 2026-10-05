// level4ValvePuzzle.js — Newlands Simon-says memory rounds.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { LEVEL4_ANCHORS } from './level4City.js'
import { playIncorrectBuzzer, playSequenceTone } from './gameAudio.js'

export const VALVE_REACH = 14
export const HANDLE_COUNT = 4
export const VALVE_WRONG_THIRST = 10
export const VALVE_COUNT = 4
const INTRO_SECONDS = 5.2

const COLORS = [0xc62828, 0xf9a825, 0x1565c0, 0x2e7d32]
const VALVE_XS = [-6, -2, 2, 6]
const VALVE_MODEL_HEIGHT = 2.2
const VALVE_PICK_Y = 1.7
const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

// Must stay a literal `new URL(..., import.meta.url)` so Vite bundles the GLB.
const VALVE_MODEL_URL = new URL(
  '../../Characters/Level4Assets/newlandsValves3DModel.glb',
  import.meta.url
).href

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/** @type {THREE.Object3D | null} */
let valveTemplate = null
/** @type {Promise<THREE.Object3D | null> | null} */
let valveLoadPromise = null
const templateGeoms = new WeakSet()

function shuffle(list) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

function randInt(min, maxInclusive) {
  return min + ((Math.random() * (maxInclusive - min + 1)) | 0)
}

/** Fresh lengths every memory game — not always 5 then 8. */
function generateRoundPlan() {
  return [randInt(4, 6), randInt(7, 9)]
}

function randomSeq(len) {
  const out = []
  for (let i = 0; i < len; i++) {
    const choices = []
    for (let n = 0; n < VALVE_COUNT; n++) {
      if (out.length && n === out[out.length - 1]) continue
      choices.push(n)
    }
    out.push(choices[(Math.random() * choices.length) | 0])
  }
  if (len >= VALVE_COUNT) {
    for (let n = 0; n < VALVE_COUNT; n++) {
      if (out.includes(n)) continue
      for (let i = 0; i < out.length; i++) {
        const prev = i > 0 ? out[i - 1] : -1
        const next = i < out.length - 1 ? out[i + 1] : -1
        const copies = out.filter((x) => x === out[i]).length
        if (copies > 1 && n !== prev && n !== next) {
          out[i] = n
          break
        }
      }
    }
  }
  return out
}

function prepareValveTemplate(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    o.frustumCulled = false
    if (o.geometry) templateGeoms.add(o.geometry)
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  root.scale.setScalar(VALVE_MODEL_HEIGHT / Math.max(size.y, 0.001))
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  const center = grounded.getCenter(new THREE.Vector3())
  root.position.x -= center.x
  root.position.z -= center.z
  root.position.y -= grounded.min.y
  root.updateMatrixWorld(true)
  return root
}

function loadValveTemplate() {
  if (valveTemplate) return Promise.resolve(valveTemplate)
  if (valveLoadPromise) return valveLoadPromise
  valveLoadPromise = new Promise((resolve) => {
    gltfLoader.load(
      VALVE_MODEL_URL,
      (gltf) => {
        valveTemplate = prepareValveTemplate(gltf.scene)
        resolve(valveTemplate)
      },
      undefined,
      (err) => {
        valveLoadPromise = null
        if (import.meta.env.DEV) {
          console.warn('[Level4] Failed to load newlandsValves3DModel.glb', err)
        }
        resolve(null)
      }
    )
  })
  return valveLoadPromise
}

function cloneValveModel() {
  if (!valveTemplate) return null
  const inst = valveTemplate.clone(true)
  inst.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    o.frustumCulled = false
    if (Array.isArray(o.material)) o.material = o.material.map((m) => m.clone())
    else if (o.material) o.material = o.material.clone()
  })
  return inst
}

function collectMats(root) {
  const mats = []
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    if (Array.isArray(o.material)) mats.push(...o.material)
    else mats.push(o.material)
  })
  return mats
}

function glowTargets(valve) {
  return valve.mats?.length ? valve.mats : [valve.wheel.material]
}

function setGlow(valve, hex, intensity) {
  for (const mat of glowTargets(valve)) {
    if (!mat?.emissive) continue
    mat.emissive.setHex(hex)
    mat.emissiveIntensity = intensity
  }
}

function tintValve(valve) {
  if (!valve.mats?.length) return
  const c = new THREE.Color(COLORS[valve.index])
  for (const mat of valve.mats) {
    if (mat.color) mat.color.copy(c)
  }
}

function syncValveVisual(valve) {
  if (valve.visual) {
    valve.wheel.visible = false
    valve.visual.visible = true
    tintValve(valve)
    return
  }
  valve.wheel.visible = true
}

export function createLevel4ValvePuzzle(parent, originX = LEVEL4_ANCHORS.newlands.x, originZ = LEVEL4_ANCHORS.newlands.z) {
  const group = new THREE.Group()
  group.name = 'valve-puzzle'
  group.position.set(originX, 0, originZ)
  parent.add(group)

  /** @type {{ index: number, wheel: THREE.Mesh, stand: THREE.Group, visual: THREE.Object3D | null, mats: THREE.Material[], fitted: boolean }[]} */
  const valves = []
  const pickables = []
  const xs = shuffle(VALVE_XS)
  for (let i = 0; i < VALVE_COUNT; i++) {
    const stand = new THREE.Group()
    stand.position.set(xs[i], 0, 3.4)
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.08, 8, 16),
      new THREE.MeshStandardMaterial({
        color: COLORS[i],
        metalness: 0.35,
        roughness: 0.45,
        emissive: 0x000000,
      })
    )
    wheel.position.y = 1.15
    wheel.rotation.x = Math.PI / 2
    wheel.visible = false
    wheel.userData.valveIndex = i
    const hit = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    )
    hit.rotation.x = -Math.PI / 2
    hit.position.y = VALVE_PICK_Y
    hit.userData.valveIndex = i
    stand.add(wheel, hit)
    group.add(stand)
    valves.push({ index: i, wheel, stand, visual: null, mats: [], fitted: true })
    pickables.push(hit, wheel)
  }

  let cancelled = false
  let complete = false
  /** @type {'idle' | 'intro' | 'watch' | 'repeat'} */
  let phase = 'idle'
  let introT = 0
  let round = 0
  /** @type {number[]} */
  let roundPlan = generateRoundPlan()
  /** @type {number[]} */
  let sequence = []
  let progress = 0
  let watchT = 0
  let lastWatchStep = -1
  let hoverIndex = -1
  let armT = 0
  let preRoll = 0
  /** Notes the player actually saw/heard — this is what we grade. */
  /** @type {number[]} */
  let played = []
  let lastHintAt = 0
  const _screen = new THREE.Vector3()

  const attachValveModels = () => {
    for (const v of valves) {
      if (v.visual) continue
      const visual = cloneValveModel()
      if (!visual) return
      visual.userData.valveIndex = v.index
      v.stand.add(visual)
      v.visual = visual
      v.mats = collectMats(visual)
      syncValveVisual(v)
    }
  }

  void loadValveTemplate().then((template) => {
    if (cancelled || !template) return
    attachValveModels()
  })

  /** Second memory round only — first round is short enough without a hint. */
  const isHintRound = () => round === 1

  const canHint = () =>
    !complete &&
    isHintRound() &&
    phase === 'repeat' &&
    progress < sequence.length

  const playNextHint = () => {
    if (!canHint() || armT > 0) return false
    const next = sequence[progress]
    if (typeof next !== 'number') return false
    const now = performance.now()
    if (now - lastHintAt < 420) return false
    lastHintAt = now
    playSequenceTone(next)
    return true
  }

  const flashOff = () => {
    for (const v of valves) {
      if (complete) {
        setGlow(v, 0x0a3040, 0.4)
        continue
      }
      setGlow(v, 0x000000, 0)
    }
  }

  const layoutValves = () => {
    const xs = shuffle(VALVE_XS)
    for (let i = 0; i < VALVE_COUNT; i++) {
      valves[i].stand.position.x = xs[i]
    }
  }

  const startIntro = () => {
    phase = 'intro'
    introT = INTRO_SECONDS
    round = 0
    sequence = []
    played = []
    progress = 0
    flashOff()
  }

  const startRound = () => {
    if (round === 0) roundPlan = generateRoundPlan()
    sequence = randomSeq(roundPlan[round])
    played = []
    progress = 0
    watchT = 0
    lastWatchStep = -1
    armT = 0
    preRoll = 0.75
    phase = 'watch'
    flashOff()
  }

  const setHover = (index) => {
    hoverIndex = index
    if (phase === 'watch' || phase === 'intro') return
    for (const v of valves) {
      const on = v.index === index && !complete
      setGlow(v, on ? 0xffffff : 0x000000, on ? 0.35 : 0)
    }
  }

  return {
    group,
    origin: { x: originX, z: originZ },
    inZone(px, pz) {
      return Math.hypot(px - originX, pz - originZ) < VALVE_REACH
    },
    handlesCollected: () => HANDLE_COUNT,
    handlesNeeded: () => HANDLE_COUNT,
    fittedCount: () => VALVE_COUNT,
    phase: () => phase,
    round: () => round,
    isComplete: () => complete,
    canHint,
    playNextHint,
    collectNear() {
      return 0
    },
    begin() {
      if (complete) return
      if (phase === 'idle') startIntro()
    },
    getPickables: () => pickables,
    /**
     * Pick the valve whose wheel is closest to the cursor in screen space.
     * Avoids lookAt/ray vs torus mismatches that hit a neighbour.
     */
    pickIndex(camera, ndcX, ndcY) {
      camera.updateMatrixWorld(true)
      let best = -1
      let bestD = 0.32
      for (const v of valves) {
        v.stand.getWorldPosition(_screen)
        _screen.y = VALVE_PICK_Y
        _screen.project(camera)
        const d = Math.hypot(_screen.x - ndcX, _screen.y - ndcY)
        if (d < bestD) {
          bestD = d
          best = v.index
        }
      }
      return best
    },
    setHoverByIndex(index) {
      setHover(typeof index === 'number' ? index : -1)
    },
    setHoverByObject(obj) {
      const idx = obj?.userData?.valveIndex
      setHover(typeof idx === 'number' ? idx : -1)
    },
    tryClickIndex(idx) {
      if (complete) return false
      if (typeof idx !== 'number' || idx < 0) return false
      if (phase === 'intro' || phase === 'idle') return 'busy'
      if (phase === 'watch' || (phase === 'repeat' && armT > 0)) return 'busy'
      if (phase !== 'repeat') return false

      const expected = sequence[progress]
      if (idx !== expected) {
        progress = 0
        played = []
        phase = 'watch'
        watchT = 0
        lastWatchStep = -1
        armT = 0
        preRoll = 0.55
        playIncorrectBuzzer()
        return 'wrong'
      }
      playSequenceTone(idx)
      progress++
      if (progress >= sequence.length) {
        round++
        if (round >= roundPlan.length) {
          complete = true
          phase = 'repeat'
          armT = 0
          for (const v of valves) setGlow(v, 0x0a3040, 0.4)
          return 'solved'
        }
        startRound()
        return 'next-round'
      }
      return 'ok'
    },
    tryClickObject(obj) {
      const idx = obj?.userData?.valveIndex
      return this.tryClickIndex(typeof idx === 'number' ? idx : -1)
    },
    update(dt, live = false) {
      if (complete || !live) return
      if (phase === 'intro') {
        introT -= dt
        if (introT <= 0) startRound()
        return
      }
      if (phase === 'repeat') {
        if (armT > 0) armT = Math.max(0, armT - dt)
        return
      }
      if (phase !== 'watch') return
      if (preRoll > 0) {
        preRoll -= dt
        flashOff()
        return
      }
      watchT += dt
      const beat = 0.62
      const step = Math.floor(watchT / beat)
      flashOff()
      if (step < sequence.length * 2) {
        if (step % 2 === 0) {
          const seqIndex = sequence[step / 2]
          const v = valves[seqIndex]
          if (v) setGlow(v, 0xffffff, 0.95)
          if (step !== lastWatchStep) {
            lastWatchStep = step
            if (typeof seqIndex === 'number') played.push(seqIndex)
            playSequenceTone(seqIndex)
          }
        } else {
          lastWatchStep = step
        }
      } else {
        if (played.length) sequence = played.slice()
        phase = 'repeat'
        progress = 0
        lastWatchStep = -1
        armT = 0.35
        flashOff()
      }
    },
    reset() {
      complete = false
      phase = 'idle'
      introT = 0
      round = 0
      roundPlan = generateRoundPlan()
      sequence = []
      played = []
      progress = 0
      watchT = 0
      lastWatchStep = -1
      armT = 0
      preRoll = 0
      lastHintAt = 0
      setHover(-1)
      layoutValves()
      for (const v of valves) {
        v.fitted = true
        v.wheel.rotation.z = 0
        if (v.visual) v.visual.rotation.y = 0
        setGlow(v, 0x000000, 0)
        syncValveVisual(v)
      }
    },
    dispose() {
      cancelled = true
      parent.remove(group)
      group.traverse((obj) => {
        if (obj.geometry && !templateGeoms.has(obj.geometry)) obj.geometry.dispose()
        if (!obj.material) return
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const mat of mats) mat.dispose()
      })
    },
  }
}
