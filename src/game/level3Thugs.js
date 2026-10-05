// level3Thugs.js — Amaphara thug spawning, chase AI, and melee combat.

import * as THREE from 'three'
import { BLOCK } from './level3City.js'
import {
  areLevel3ThugsReady,
  cancelThugAttack,
  createThugCharacterInstance,
  disposeThugCharacterInstance,
  endThugAttack,
  pickThugCharacterId,
  pinThugHips,
  playThugAttack,
  preloadLevel3Thugs,
} from './level3ThugAssets.js'

export { preloadLevel3Thugs, areLevel3ThugsReady }

export const THUG_HP = 50
export const THUG_DAMAGE = 8
export const THUG_ATTACK_RANGE = 2.2
export const THUG_ATTACK_COOLDOWN = 1.4
/** Leave melee this far beyond attack range to cancel a mid-jab chase resume. */
export const THUG_ATTACK_CANCEL_RANGE = THUG_ATTACK_RANGE + 0.8
export const THUG_CHASE_SPEED = 7.5
export const THUG_AGGRO_RANGE = 55
export const THUG_DESPAWN_RANGE = 90
export const PUNCH_DAMAGE = 28
export const PUNCH_RANGE = 2.8
export const PUNCH_COOLDOWN = 0.55
export const MAX_THUGS = 12
export const SPAWN_INTERVAL_MIN = 2.2
export const SPAWN_INTERVAL_MAX = 4.5
/** Breathing room after Level 3 starts before the first thug. */
export const FIRST_SPAWN_DELAY = 7

export const THUG_TYPES = {
  NORMAL: 'normal',
  FAST: 'fast',
  TANK: 'tank',
}

const THUG_CONFIGS = {
  [THUG_TYPES.NORMAL]: {
    hp: 50,
    damage: 8,
    speed: 7.5,
    color: 0xc9a227,
    scale: 1.0,
  },
  [THUG_TYPES.FAST]: {
    hp: 35,
    damage: 6,
    speed: 11.0,
    color: 0xde5a24,
    scale: 0.9,
  },
  [THUG_TYPES.TANK]: {
    hp: 80,
    damage: 12,
    speed: 5.0,
    color: 0x7a3ea8,
    scale: 1.2,
  },
}

let spawnCount = 0

/**
 * @typedef {{
 *   group: THREE.Group
 *   hp: number
 *   maxHp: number
 *   damage: number
 *   speed: number
 *   attackT: number
 *   wobble: number
 *   type: string
 *   hitFlash: number
 *   skinned: boolean
 *   mixer: import('three').AnimationMixer | null
 *   action: import('three').AnimationAction | null
 *   attackAction: import('three').AnimationAction | null
 *   hips: import('three').Object3D | null
 *   hipsBind: { x: number, z: number } | null
 *   animRoot: import('three').Object3D | null
 *   chaseTimeScale: number
 *   attacking: boolean
 *   pendingHitT: number
 *   attackRemainT: number
 * }} Thug
 */

/**
 * Visible stand-in when Mixamo GLBs are missing or still loading.
 * @param {{ color: number }} config
 */
function createFallbackThugRoot(config) {
  const root = new THREE.Group()
  root.name = 'thug-fallback'
  const shirt = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.82,
    metalness: 0.04,
    emissive: 0x000000,
    emissiveIntensity: 0,
  })
  const skin = new THREE.MeshStandardMaterial({
    color: 0x8d5a3a,
    roughness: 0.7,
    emissive: 0x000000,
    emissiveIntensity: 0,
  })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.95, 4, 8), shirt)
  body.position.y = 0.755
  body.castShadow = true
  body.frustumCulled = false
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin)
  head.position.y = 1.55
  head.castShadow = true
  head.frustumCulled = false
  root.add(body, head)
  return root
}

/**
 * @param {Thug} thug
 * @param {THREE.Object3D | undefined} _parent
 */
function removeThug(thug, _parent) {
  thug.mixer?.stopAllAction()
  if (thug.mixer && thug.animRoot) thug.mixer.uncacheRoot(thug.animRoot)
  thug.group.removeFromParent()
  if (thug.group.userData.fallbackThug) {
    thug.group.traverse((o) => {
      if (!o.isMesh) return
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) m?.dispose?.()
    })
    return
  }
  disposeThugCharacterInstance(thug.group)
}

/**
 * @param {THREE.Object3D} parent
 * @param {number} x
 * @param {number} z
 * @param {string} thugType
 * @returns {Thug}
 */
export function spawnThug(parent, x, z, thugType = THUG_TYPES.NORMAL) {
  const config = THUG_CONFIGS[thugType] || THUG_CONFIGS[THUG_TYPES.NORMAL]
  const characterId = pickThugCharacterId(thugType, spawnCount)
  let inst = createThugCharacterInstance(characterId)
  const fallback = !inst
  if (!inst) {
    inst = {
      root: createFallbackThugRoot(config),
      mixer: null,
      action: null,
      attackAction: null,
      hips: null,
      hipsBind: null,
    }
  }
  spawnCount += 1

  const group = new THREE.Group()
  group.name = 'thug'
  group.userData.fallbackThug = fallback
  group.scale.setScalar(config.scale)
  group.position.set(x, 0, z)
  group.add(inst.root)
  const chaseTimeScale = config.speed / THUG_CHASE_SPEED
  if (inst.mixer) inst.mixer.timeScale = chaseTimeScale

  parent.add(group)
  return {
    group,
    hp: config.hp,
    maxHp: config.hp,
    damage: config.damage,
    speed: config.speed,
    attackT: 0,
    wobble: Math.random() * Math.PI * 2,
    type: thugType,
    hitFlash: 0,
    skinned: Boolean(inst.mixer),
    mixer: inst.mixer,
    action: inst.action,
    attackAction: inst.attackAction ?? null,
    hips: inst.hips,
    hipsBind: inst.hipsBind,
    animRoot: inst.root,
    chaseTimeScale,
    attacking: false,
    pendingHitT: -1,
    attackRemainT: -1,
  }
}

/**
 * @param {Thug[]} thugs
 * @param {THREE.Scene} scene
 */
export function clearThugs(thugs, scene) {
  for (const thug of thugs) removeThug(thug, scene)
  thugs.length = 0
}

/**
 * Resolve circle-vs-AABB push-out for thug movement.
 * @param {import('./level3City.js').BuildingCollider[]} colliders
 */
export function resolveThugCollision(x, z, colliders, radius = 0.55) {
  let nx = x
  let nz = z
  for (const c of colliders) {
    const dx = nx - c.x
    const dz = nz - c.z
    const ox = c.hw + radius - Math.abs(dx)
    const oz = c.hd + radius - Math.abs(dz)
    if (ox > 0 && oz > 0) {
      if (ox < oz) nx += dx > 0 ? ox : -ox
      else nz += dz > 0 ? oz : -oz
    }
  }
  return { x: nx, z: nz }
}

/**
 * @param {THREE.Object3D} root
 * @param {(mat: THREE.Material) => void} fn
 */
function forEachMaterial(root, fn) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) if (m) fn(m)
  })
}

/**
 * @param {Thug[]} thugs
 * @param {{
 *   px: number
 *   pz: number
 *   colliders: import('./level3City.js').BuildingCollider[]
 *   dt: number
 *   onPlayerHit: (damage: number) => void
 *   playerInvuln: boolean
 *   scene?: THREE.Scene
 * }} ctx
 */
export function updateThugs(thugs, ctx) {
  const { px, pz, colliders, dt, onPlayerHit, playerInvuln } = ctx

  for (let i = thugs.length - 1; i >= 0; i--) {
    const thug = thugs[i]
    if (thug.hp <= 0) {
      removeThug(thug, ctx.scene)
      thugs.splice(i, 1)
      continue
    }

    thug.attackT = Math.max(0, thug.attackT - dt)
    thug.wobble += dt * 8
    thug.hitFlash = Math.max(0, thug.hitFlash - dt)

    if (thug.hitFlash > 0) {
      const flashIntensity = thug.hitFlash / 0.3
      forEachMaterial(thug.group, (mat) => {
        if (!mat.emissive) mat.emissive = new THREE.Color(0x000000)
        mat.emissive.setHex(0xff0000)
        mat.emissiveIntensity = flashIntensity * 0.8
      })
    } else {
      forEachMaterial(thug.group, (mat) => {
        if (mat.emissive) mat.emissiveIntensity = 0
      })
    }

    const tx = thug.group.position.x
    const tz = thug.group.position.z
    const dx = px - tx
    const dz = pz - tz
    const dist = Math.hypot(dx, dz)

    if (dist > THUG_DESPAWN_RANGE) {
      removeThug(thug, ctx.scene)
      thugs.splice(i, 1)
      continue
    }

    let moving = false
    let punching = thug.attacking

    if (dist < THUG_AGGRO_RANGE) {
      if (dist > THUG_ATTACK_RANGE) {
        if (thug.attacking && dist > THUG_ATTACK_CANCEL_RANGE) {
          cancelThugAttack(thug)
          thug.attacking = false
          thug.pendingHitT = -1
          thug.attackRemainT = -1
          punching = false
        }
        if (!thug.attacking) {
          const spd = thug.speed * dt
          const nx = tx + (dx / dist) * spd
          const nz = tz + (dz / dist) * spd
          const resolved = resolveThugCollision(nx, nz, colliders)
          thug.group.position.x = resolved.x
          thug.group.position.z = resolved.z
          thug.group.rotation.y = Math.atan2(dx, dz)
          moving = true
        } else {
          thug.group.rotation.y = Math.atan2(dx, dz)
        }
      } else {
        // In melee: face player, stop locomotion, play jab.
        thug.group.rotation.y = Math.atan2(dx, dz)
        if (!thug.attacking && thug.attackT <= 0) {
          const duration = playThugAttack(thug)
          if (duration > 0) {
            thug.attacking = true
            punching = true
            thug.pendingHitT = duration * 0.45
            thug.attackRemainT = duration
            thug.attackT = Math.max(THUG_ATTACK_COOLDOWN, duration + 0.15)
          } else if (!playerInvuln) {
            // Fallback capsules / missing jab: instant hit like before.
            thug.attackT = THUG_ATTACK_COOLDOWN
            onPlayerHit(thug.damage)
          }
        }
      }
    } else if (thug.attacking) {
      cancelThugAttack(thug)
      thug.attacking = false
      thug.pendingHitT = -1
      thug.attackRemainT = -1
      punching = false
    }

    if (thug.pendingHitT >= 0) {
      thug.pendingHitT -= dt
      if (thug.pendingHitT <= 0) {
        thug.pendingHitT = -1
        if (dist <= THUG_ATTACK_RANGE && !playerInvuln) {
          onPlayerHit(thug.damage)
        }
      }
    }

    if (thug.attackRemainT >= 0) {
      thug.attackRemainT -= dt
      if (thug.attackRemainT <= 0) {
        thug.attackRemainT = -1
        thug.attacking = false
        punching = false
        endThugAttack(thug)
      }
    }

    if (thug.mixer && (thug.action || thug.attackAction)) {
      thug.group.position.y = 0
      if (thug.action) {
        thug.action.paused = thug.attacking || !moving
      }
      if (moving || punching || thug.attacking) {
        thug.mixer.update(dt)
        pinThugHips(thug.hips, thug.hipsBind)
      }
    } else {
      thug.group.position.y = moving ? Math.abs(Math.sin(thug.wobble)) * 0.08 : 0
    }
  }
}

/**
 * @param {Thug[]} thugs
 * @param {number} px
 * @param {number} pz
 * @param {number} yaw
 * @returns {number} defeated count
 */
export function tryPunchThugs(thugs, px, pz, yaw) {
  let defeated = 0
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)

  for (const thug of thugs) {
    const tx = thug.group.position.x
    const tz = thug.group.position.z
    const dx = tx - px
    const dz = tz - pz
    const dist = Math.hypot(dx, dz)
    if (dist > PUNCH_RANGE) continue
    const dot = (dx * fx + dz * fz) / (dist || 1)
    if (dot < 0.35) continue
    thug.hp -= PUNCH_DAMAGE
    thug.hitFlash = 0.3
    thug.group.position.x += fx * 0.8
    thug.group.position.z += fz * 0.8
    if (thug.hp <= 0) defeated++
  }
  return defeated
}

/**
 * @param {number} x
 * @param {number} z
 * @param {import('./level3City.js').BuildingCollider[]} colliders
 * @param {number} pad
 */
function isSpawnBlocked(x, z, colliders, pad = 1.4) {
  for (const c of colliders) {
    if (Math.abs(x - c.x) < c.hw + pad && Math.abs(z - c.z) < c.hd + pad) {
      return true
    }
  }
  return false
}

/** Pull a point onto the nearest N-S or E-W street center. */
function snapToStreet(x, z) {
  const nx = Math.round(x / BLOCK) * BLOCK
  const nz = Math.round(z / BLOCK) * BLOCK
  if (Math.abs(x - nx) <= Math.abs(z - nz)) return { x: nx, z }
  return { x, z: nz }
}

/**
 * Pick a spawn on a street in front of the camera so thugs are in view.
 * @param {number} px
 * @param {number} pz
 * @param {import('./level3City.js').BuildingCollider[]} colliders
 * @param {number} [facingYaw] camera yaw (0 looks toward +Z)
 * @returns {{ x: number, z: number, type: string }}
 */
export function pickThugSpawnPoint(px, pz, colliders, facingYaw = 0) {
  const rand = Math.random()
  let thugType = THUG_TYPES.NORMAL
  if (rand < 0.2) {
    thugType = THUG_TYPES.FAST
  } else if (rand > 0.8) {
    thugType = THUG_TYPES.TANK
  }

  const lookX = Math.sin(facingYaw)
  const lookZ = Math.cos(facingYaw)
  const sideX = Math.cos(facingYaw)
  const sideZ = -Math.sin(facingYaw)

  for (let attempt = 0; attempt < 20; attempt++) {
    const dist = 10 + Math.random() * 12
    const side = (Math.random() - 0.5) * 8
    const rawX = px + lookX * dist + sideX * side
    const rawZ = pz + lookZ * dist + sideZ * side
    const snapped = snapToStreet(rawX, rawZ)
    if (!isSpawnBlocked(snapped.x, snapped.z, colliders)) {
      return { x: snapped.x, z: snapped.z, type: thugType }
    }
  }

  const fallback = snapToStreet(px + lookX * 14, pz + lookZ * 14)
  return { x: fallback.x, z: fallback.z, type: thugType }
}
