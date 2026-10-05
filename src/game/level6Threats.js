// level6Threats.js — Cape Flats patrollers: Romero walks the loops and watches.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { prepareThugModel } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'
import {
  findHipsBone,
  findPrimarySkinnedMesh,
  pickLocomotionClip,
  pinHipsXZ,
  retargetClipToBones,
  retargetClipToRoot,
  stripHipRootMotion,
} from '../mixamoAnimation.js'
import {
  LEVEL6_THREAT_COUNT as THREAT_COUNT_CONST,
  LEVEL6_VISION_ANGLE as VISION_ANGLE_CONST,
  LEVEL6_VISION_RANGE as VISION_RANGE_CONST,
} from './gameConstants.js'

export const LEVEL6_THREAT_COUNT = THREAT_COUNT_CONST
export const LEVEL6_VISION_RANGE = VISION_RANGE_CONST
/** Half-angle of the cone (radians) — ~82 degrees total. */
export const LEVEL6_VISION_ANGLE = VISION_ANGLE_CONST
export const LEVEL6_ALERT_DURATION = 2200

export const LEVEL6_CROUCH_VISION_RANGE = 14
/** Only used if the player is almost touching a patroller. The red cone is what spots you. */
export const LEVEL6_CLOSE_RADIUS = 1.4
export const LEVEL6_CROUCH_CLOSE_RADIUS = 1.1

const PATROL_SPEED = 4.5
const TURN_SPEED = 3.2
const ALERT_TURN_SPEED = 1.1
const WAYPOINT_PAUSE = 1.5
const PAUSE_SWEEP = Math.PI / 3
const CONE_SEGMENTS = 28
/** Anything at least this tall blocks a standing player from view. */
const SIGHT_H_STANDING = 1.6
/** Low cover (car hulks) hides a crouched player. */
const SIGHT_H_CROUCHED = 1.0

const CONE_COLOR = 0xff3300
const CONE_OPACITY = 0.32
const CONE_ALERT_COLOR = 0xff0000
const CONE_ALERT_OPACITY = 0.35
const SILHOUETTE_COLOR = 0x222230
const ROMERO_URL = '/media/thugs/Romero.glb'
/** Same locomotion clip the Level 3 thugs share (Phara's run, retargeted onto Romero). */
const THUG_LOCOMOTION_URL = '/media/thugs/Phara.glb'
const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

/**
 * Six handcrafted loops spread across the three maze zones (see LEVEL6_WALLS).
 * Every leg is a straight run along an open passage.
 */
export const LEVEL6_PATROLS = [
  // Zone 1 — lane z 92, watches the east crossing
  [
    { x: -40, z: 91 },
    { x: 0, z: 91 },
    { x: 34, z: 91 },
    { x: 0, z: 91 },
  ],
  // Zone 1 — passage x 44 down to lane z 64
  [
    { x: 44, z: 66 },
    { x: 44, z: 90 },
    { x: 44, z: 66 },
    { x: 10, z: 64 },
  ],
  // Zone 2 — lane z 44 under the divider
  [
    { x: -40, z: 44 },
    { x: 0, z: 44 },
    { x: 30, z: 44 },
    { x: 0, z: 44 },
  ],
  // Zone 2 — courtyard and lane z -8
  [
    { x: 50, z: 34 },
    { x: 48, z: -8 },
    { x: 10, z: -8 },
    { x: 48, z: -8 },
  ],
  // Zone 3 — lane z -62 behind the divider
  [
    { x: -50, z: -62 },
    { x: -10, z: -62 },
    { x: 24, z: -62 },
    { x: -10, z: -62 },
  ],
  // Zone 3 — plaza in front of the Care Centre
  [
    { x: -20, z: -94 },
    { x: 30, z: -94 },
    { x: 30, z: -104 },
    { x: -20, z: -104 },
  ],
]

/**
 * @typedef {{ x: number, z: number, hw: number, hd: number, h: number }} SightBlocker
 *
 * @typedef {{
 *   group: THREE.Group
 *   body: THREE.Group
 *   fallback: THREE.Object3D | null
 *   cone: THREE.Mesh
 *   conePositions: THREE.BufferAttribute
 *   coneMat: THREE.MeshBasicMaterial
 *   path: { x: number, z: number }[]
 *   wp: number
 *   x: number
 *   z: number
 *   heading: number
 *   state: 'walk' | 'pause' | 'alert'
 *   stateT: number
 *   pauseBase: number
 *   alertTarget: { x: number, z: number } | null
 *   moving: boolean
 *   skinned: boolean
 *   mixer: THREE.AnimationMixer | null
 *   action: THREE.AnimationAction | null
 *   bindPose: Record<string, THREE.Quaternion> | null
 *   skeleton: THREE.Skeleton | null
 *   hips: THREE.Object3D | null
 *   hipsBind: { x: number, z: number } | null
 * }} Threat
 */

// --- Shared Romero rig (loaded once) ---

/** @type {{ root: THREE.Object3D, clip: THREE.AnimationClip | null } | null} */
let template = null
/** @type {Promise<void> | null} */
let loadPromise = null
const silhouetteMat = new THREE.MeshStandardMaterial({
  color: SILHOUETTE_COLOR,
  roughness: 1,
  metalness: 0,
  emissive: 0x0b0b14,
  emissiveIntensity: 1,
})

function loadGltf(url) {
  const gltfLoader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(DRACO_DECODER)
  gltfLoader.setDRACOLoader(dracoLoader)
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        dracoLoader.dispose()
        resolve(gltf)
      },
      undefined,
      (err) => {
        dracoLoader.dispose()
        reject(err)
      }
    )
  })
}

export function preloadLevel6Threats() {
  if (loadPromise) return loadPromise
  loadPromise = Promise.all([
    loadGltf(ROMERO_URL),
    loadGltf(THUG_LOCOMOTION_URL).catch((err) => {
      if (import.meta.env.DEV) console.warn('[Level6] Could not load thug locomotion', err)
      return null
    }),
  ])
    .then(([romero, phara]) => {
      const root = prepareThugModel(romero.scene)
      const source = phara ? pickLocomotionClip(phara.animations) : null
      if (phara) disposeObject3D(phara.scene)
      let clip = null
      if (source) {
        const retargeted = stripHipRootMotion(retargetClipToRoot(source, root))
        clip = retargeted.tracks.length > 0 ? retargeted : null
      }
      if (!clip && import.meta.env.DEV) {
        console.warn('[Level6] Romero has no retargeted locomotion clip')
      }
      template = { root, clip }
    })
    .catch((err) => {
      if (import.meta.env.DEV) console.warn('[Level6] Romero failed to load', err)
    })
  return loadPromise
}

export function areLevel6ThreatsReady() {
  return Boolean(template)
}

function createFallbackBody() {
  const root = new THREE.Group()
  root.name = 'threat-fallback'
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 8), silhouetteMat)
  body.position.y = 0.8
  body.castShadow = true
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), silhouetteMat)
  head.position.y = 1.58
  root.add(body, head)
  return root
}

/** @param {Threat} threat */
function attachSkinnedBody(threat) {
  if (!template || threat.skinned) return
  const model = SkeletonUtils.clone(template.root)
  model.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false
  })
  if (threat.fallback) {
    threat.body.remove(threat.fallback)
    threat.fallback.traverse((o) => o.geometry?.dispose())
    threat.fallback = null
  }
  threat.body.add(model)
  threat.skinned = true

  const sm = findPrimarySkinnedMesh(model)
  if (!sm?.skeleton) return
  threat.skeleton = sm.skeleton
  threat.bindPose = {}
  for (const b of sm.skeleton.bones) threat.bindPose[b.name] = b.quaternion.clone()
  threat.hips = findHipsBone(model)
  if (threat.hips) threat.hipsBind = { x: threat.hips.position.x, z: threat.hips.position.z }
  if (!template.clip) return
  let clip = stripHipRootMotion(retargetClipToRoot(template.clip, model))
  if (clip.tracks.length === 0) clip = stripHipRootMotion(retargetClipToBones(template.clip, sm.skeleton))
  if (clip.tracks.length === 0) return
  threat.mixer = new THREE.AnimationMixer(model)
  threat.action = threat.mixer.clipAction(clip)
  threat.action.setLoop(THREE.LoopRepeat, Infinity)
  threat.action.timeScale = 0.55
  threat.action.play()
  threat.action.time = Math.random() * clip.duration
}

// --- Line of sight ---

/**
 * Distance along a 2D ray to the first blocker at least `minH` tall (slab test).
 * @param {SightBlocker[]} blockers
 */
export function rayBlockDistance(x0, z0, dx, dz, maxDist, blockers, minH) {
  let best = maxDist
  for (const b of blockers) {
    if (b.h < minH) continue
    let tMin = 0
    let tMax = best
    if (Math.abs(dx) < 1e-6) {
      if (Math.abs(x0 - b.x) > b.hw) continue
    } else {
      const inv = 1 / dx
      let t1 = (b.x - b.hw - x0) * inv
      let t2 = (b.x + b.hw - x0) * inv
      if (t1 > t2) [t1, t2] = [t2, t1]
      tMin = Math.max(tMin, t1)
      tMax = Math.min(tMax, t2)
      if (tMin > tMax) continue
    }
    if (Math.abs(dz) < 1e-6) {
      if (Math.abs(z0 - b.z) > b.hd) continue
    } else {
      const inv = 1 / dz
      let t1 = (b.z - b.hd - z0) * inv
      let t2 = (b.z + b.hd - z0) * inv
      if (t1 > t2) [t1, t2] = [t2, t1]
      tMin = Math.max(tMin, t1)
      tMax = Math.min(tMax, t2)
      if (tMin > tMax) continue
    }
    if (tMin < best) best = tMin
  }
  return best
}

/** @param {SightBlocker[]} blockers */
export function isSightBlocked(x0, z0, x1, z1, blockers, minH = SIGHT_H_STANDING) {
  const dx = x1 - x0
  const dz = z1 - z0
  const len = Math.hypot(dx, dz)
  if (len < 1e-4) return false
  return rayBlockDistance(x0, z0, dx / len, dz / len, len, blockers, minH) < len - 0.05
}

// --- Construction ---

function buildCone() {
  const geo = new THREE.BufferGeometry()
  const positions = new THREE.BufferAttribute(new Float32Array((CONE_SEGMENTS + 2) * 3), 3)
  positions.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', positions)
  const idx = []
  for (let i = 1; i <= CONE_SEGMENTS; i++) idx.push(0, i, i + 1)
  geo.setIndex(idx)
  const mat = new THREE.MeshBasicMaterial({
    color: CONE_COLOR,
    transparent: true,
    opacity: CONE_OPACITY,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 2
  return { mesh, positions, mat }
}

/**
 * @param {THREE.Object3D} parent
 * @returns {Threat[]}
 */
export function createLevel6Threats(parent) {
  /** @type {Threat[]} */
  const threats = []
  for (let i = 0; i < LEVEL6_THREAT_COUNT; i++) {
    const path = LEVEL6_PATROLS[i % LEVEL6_PATROLS.length]
    const group = new THREE.Group()
    group.name = `level6-threat-${i}`
    const body = new THREE.Group()
    group.add(body)
    const fallback = createFallbackBody()
    body.add(fallback)
    const cone = buildCone()
    parent.add(group)
    parent.add(cone.mesh)
    /** @type {Threat} */
    const threat = {
      group,
      body,
      fallback,
      cone: cone.mesh,
      conePositions: cone.positions,
      coneMat: cone.mat,
      path,
      wp: 1,
      x: path[0].x,
      z: path[0].z,
      heading: 0,
      state: 'walk',
      stateT: 0,
      pauseBase: 0,
      alertTarget: null,
      moving: false,
      skinned: false,
      mixer: null,
      action: null,
      bindPose: null,
      skeleton: null,
      hips: null,
      hipsBind: null,
    }
    resetThreat(threat)
    threats.push(threat)
  }
  return threats
}

/** @param {Threat} threat */
function resetThreat(threat) {
  const p0 = threat.path[0]
  const p1 = threat.path[1 % threat.path.length]
  threat.x = p0.x
  threat.z = p0.z
  threat.wp = 1 % threat.path.length
  threat.heading = Math.atan2(p1.x - p0.x, p1.z - p0.z)
  threat.state = 'walk'
  threat.stateT = 0
  threat.alertTarget = null
  threat.group.position.set(threat.x, 0, threat.z)
  threat.body.rotation.y = threat.heading
}

/** Teleport every threat back to the start of its loop (full restart). */
export function resetLevel6Threats(threats) {
  for (const t of threats) resetThreat(t)
}

/** Drop alerts but keep positions (after a respawn). */
export function calmLevel6Threats(threats) {
  for (const t of threats) {
    if (t.state === 'alert') {
      t.state = 'walk'
      t.stateT = 0
      t.alertTarget = null
    }
  }
}

/** @param {Threat} threat @param {{ x: number, z: number }} target */
export function alertLevel6Threat(threat, target) {
  threat.state = 'alert'
  threat.stateT = 0
  threat.alertTarget = { x: target.x, z: target.z }
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function turnToward(current, target, maxStep) {
  const diff = wrapAngle(target - current)
  if (Math.abs(diff) <= maxStep) return target
  return current + Math.sign(diff) * maxStep
}

// --- Per-frame update ---

/** @param {Threat} threat */
function restBindPose(threat) {
  if (!threat.bindPose || !threat.skeleton) return
  for (const b of threat.skeleton.bones) {
    const q = threat.bindPose[b.name]
    if (q) b.quaternion.copy(q)
  }
}

/**
 * @param {Threat} threat
 * @param {number} range
 * @param {SightBlocker[]} blockers
 */
function updateCone(threat, range, blockers) {
  const pos = threat.conePositions
  pos.setXYZ(0, 0, 0, 0)
  const start = threat.heading - LEVEL6_VISION_ANGLE
  const span = LEVEL6_VISION_ANGLE * 2
  for (let i = 0; i <= CONE_SEGMENTS; i++) {
    const a = start + (span * i) / CONE_SEGMENTS
    const dx = Math.sin(a)
    const dz = Math.cos(a)
    const d = rayBlockDistance(threat.x, threat.z, dx, dz, range, blockers, SIGHT_H_STANDING)
    pos.setXYZ(i + 1, dx * d, 0, dz * d)
  }
  pos.needsUpdate = true
  threat.cone.geometry.computeBoundingSphere()
  threat.cone.position.set(threat.x, 0.07, threat.z)
  const alerted = threat.state === 'alert'
  threat.coneMat.color.setHex(alerted ? CONE_ALERT_COLOR : CONE_COLOR)
  threat.coneMat.opacity = alerted ? CONE_ALERT_OPACITY : CONE_OPACITY
}

/**
 * @param {Threat[]} threats
 * @param {{ dt: number, blockers: SightBlocker[], coneRange: number, frozen?: boolean }} ctx
 */
export function updateLevel6Threats(threats, ctx) {
  const { dt, blockers, coneRange, frozen = false } = ctx
  for (const t of threats) {
    if (!t.skinned && template) attachSkinnedBody(t)
    t.moving = false
    t.stateT += dt

    if (t.state === 'alert') {
      if (t.alertTarget) {
        const want = Math.atan2(t.alertTarget.x - t.x, t.alertTarget.z - t.z)
        t.heading = turnToward(t.heading, want, ALERT_TURN_SPEED * dt)
      }
      if (!frozen && t.stateT * 1000 >= LEVEL6_ALERT_DURATION) {
        t.state = 'walk'
        t.stateT = 0
        t.alertTarget = null
      }
    } else if (t.state === 'pause') {
      const k = Math.min(1, t.stateT / WAYPOINT_PAUSE)
      t.heading = t.pauseBase + Math.sin(k * Math.PI * 2) * PAUSE_SWEEP
      if (t.stateT >= WAYPOINT_PAUSE) {
        t.heading = t.pauseBase
        t.wp = (t.wp + 1) % t.path.length
        t.state = 'walk'
        t.stateT = 0
      }
    } else {
      const target = t.path[t.wp]
      const dx = target.x - t.x
      const dz = target.z - t.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.25) {
        t.x = target.x
        t.z = target.z
        t.state = 'pause'
        t.stateT = 0
        t.pauseBase = t.heading
      } else {
        const want = Math.atan2(dx, dz)
        t.heading = turnToward(t.heading, want, TURN_SPEED * dt)
        if (Math.abs(wrapAngle(want - t.heading)) < 0.5) {
          const stepLen = Math.min(dist, PATROL_SPEED * dt)
          t.x += (dx / dist) * stepLen
          t.z += (dz / dist) * stepLen
          t.moving = true
        }
      }
    }

    t.group.position.set(t.x, 0, t.z)
    t.body.rotation.y = t.heading
    if (t.mixer && t.action) {
      if (t.moving) {
        t.action.paused = false
        t.mixer.update(dt)
        pinHipsXZ(t.hips, t.hipsBind)
      } else {
        t.action.paused = true
        restBindPose(t)
      }
    }
    updateCone(t, coneRange, blockers)
  }
}

/**
 * @param {Threat} threat
 * @param {{ x: number, z: number, crouching: boolean, sprinting: boolean, moving: boolean }} player
 * @param {SightBlocker[]} blockers
 * @returns {'sight' | 'close' | null}
 */
export function detectPlayer(threat, player, blockers) {
  const dx = player.x - threat.x
  const dz = player.z - threat.z
  const dist = Math.hypot(dx, dz)

  // Same wedge the red cone draws: heading, angle, and range.
  const sightH = player.crouching ? SIGHT_H_CROUCHED : SIGHT_H_STANDING
  const range = player.crouching ? LEVEL6_CROUCH_VISION_RANGE : LEVEL6_VISION_RANGE
  if (dist < range) {
    const angle = Math.abs(wrapAngle(Math.atan2(dx, dz) - threat.heading))
    if (angle <= LEVEL6_VISION_ANGLE && !isSightBlocked(threat.x, threat.z, player.x, player.z, blockers, sightH)) {
      return 'sight'
    }
  }

  const closeR = player.crouching ? LEVEL6_CROUCH_CLOSE_RADIUS : LEVEL6_CLOSE_RADIUS
  if (dist < closeR && !isSightBlocked(threat.x, threat.z, player.x, player.z, blockers, sightH)) {
    return 'close'
  }
  return null
}

/** @param {Threat[]} threats */
export function nearestThreatDistance(threats, x, z) {
  let best = Infinity
  for (const t of threats) best = Math.min(best, Math.hypot(t.x - x, t.z - z))
  return best
}

/** @param {Threat[]} threats @param {boolean} visible */
export function setLevel6ThreatsVisible(threats, visible) {
  for (const t of threats) {
    t.group.visible = visible
    t.cone.visible = visible
  }
}

/** @param {Threat[]} threats @param {THREE.Object3D} parent */
export function disposeLevel6Threats(threats, parent) {
  for (const t of threats) {
    t.mixer?.stopAllAction()
    parent.remove(t.group)
    parent.remove(t.cone)
    t.cone.geometry.dispose()
    t.coneMat.dispose()
    // Skinned clones share geometry with the cached template; only the fallback owns its own.
    t.fallback?.traverse((o) => o.geometry?.dispose())
  }
  threats.length = 0
}
