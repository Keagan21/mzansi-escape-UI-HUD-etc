// level5Looters.js — Looter NPCs: chase only when player torch is ON.

import * as THREE from 'three'
import { BLOCK } from './level5City.js'
import {
  LEVEL5_LOOTER_MAX,
  LEVEL5_LOOTER_FIRST_SPAWN_DELAY,
} from './gameConstants.js'
import {
  areLevel5LootersReady,
  cancelLooterAttack,
  createLooterCharacterInstance,
  disposeLooterCharacterInstance,
  endLooterAttack,
  pickLooterCharacterId,
  pinLooterHips,
  playLooterAttack,
  preloadLevel5Looters,
} from './level5LooterAssets.js'

export { preloadLevel5Looters, areLevel5LootersReady }

export const LOOTER_HP = 50
export const LOOTER_DAMAGE = 28
export const LOOTER_ATTACK_RANGE = 2.2
export const LOOTER_ATTACK_COOLDOWN = 1.4
export const LOOTER_ATTACK_CANCEL_RANGE = LOOTER_ATTACK_RANGE + 0.8
export const LOOTER_CHASE_SPEED = 7.5
export const LOOTER_AGGRO_RANGE = 55
export const LOOTER_DESPAWN_RANGE = 90
export const LOOTER_WANDER_SPEED = 3.2
export const PUNCH_DAMAGE = 28
export const PUNCH_RANGE = 2.8
export const PUNCH_COOLDOWN = 0.55
export const MAX_LOOTERS = LEVEL5_LOOTER_MAX
export const SPAWN_INTERVAL_MIN = 2.2
export const SPAWN_INTERVAL_MAX = 4.5
export const FIRST_SPAWN_DELAY = LEVEL5_LOOTER_FIRST_SPAWN_DELAY / 1000

export const LOOTER_TYPES = {
  NORMAL: 'normal',
  FAST: 'fast',
  TANK: 'tank',
}

const LOOTER_CONFIGS = {
  [LOOTER_TYPES.NORMAL]: {
    hp: 50,
    damage: LOOTER_DAMAGE,
    speed: 7.5,
    color: 0xc9a227,
    scale: 1.0,
  },
  [LOOTER_TYPES.FAST]: {
    hp: 35,
    damage: LOOTER_DAMAGE,
    speed: 11.0,
    color: 0xde5a24,
    scale: 0.9,
  },
  [LOOTER_TYPES.TANK]: {
    hp: 80,
    damage: LOOTER_DAMAGE,
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
 *   wanderAngle: number
 *   wanderT: number
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
 * }} Looter
 */

function createFallbackLooterRoot(config) {
  const root = new THREE.Group()
  root.name = 'looter-fallback'
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

function removeLooter(looter) {
  looter.mixer?.stopAllAction()
  if (looter.mixer && looter.animRoot) looter.mixer.uncacheRoot(looter.animRoot)
  looter.group.removeFromParent()
  if (looter.group.userData.fallbackLooter) {
    looter.group.traverse((o) => {
      if (!o.isMesh) return
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) m?.dispose?.()
    })
    return
  }
  disposeLooterCharacterInstance(looter.group)
}

/**
 * @param {THREE.Object3D} parent
 * @param {number} x
 * @param {number} z
 * @param {string} looterType
 * @returns {Looter}
 */
export function spawnLooter(parent, x, z, looterType = LOOTER_TYPES.NORMAL) {
  const config = LOOTER_CONFIGS[looterType] || LOOTER_CONFIGS[LOOTER_TYPES.NORMAL]
  const characterId = pickLooterCharacterId(looterType, spawnCount)
  let inst = createLooterCharacterInstance(characterId)
  const fallback = !inst
  if (!inst) {
    inst = {
      root: createFallbackLooterRoot(config),
      mixer: null,
      action: null,
      attackAction: null,
      hips: null,
      hipsBind: null,
    }
  }
  spawnCount += 1

  const group = new THREE.Group()
  group.name = 'looter'
  group.userData.fallbackLooter = fallback
  group.scale.setScalar(config.scale)
  group.position.set(x, 0, z)
  group.add(inst.root)
  const chaseTimeScale = config.speed / LOOTER_CHASE_SPEED
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
    type: looterType,
    hitFlash: 0,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderT: 1 + Math.random() * 2,
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

export function clearLooters(looters) {
  for (const looter of looters) removeLooter(looter)
  looters.length = 0
}

export function resolveLooterCollision(x, z, colliders, radius = 0.55) {
  let nx = x
  let nz = z
  for (const c of colliders) {
    if (c.active === false) continue
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

function forEachMaterial(root, fn) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) if (m) fn(m)
  })
}

/**
 * @param {Looter[]} looters
 * @param {{
 *   px: number
 *   pz: number
 *   colliders: import('./level5City.js').BuildingCollider[]
 *   dt: number
 *   onPlayerHit: (damage: number) => void
 *   playerInvuln: boolean
 *   torchOn: boolean
 * }} ctx
 */
export function updateLooters(looters, ctx) {
  const { px, pz, colliders, dt, onPlayerHit, playerInvuln, torchOn } = ctx

  for (let i = looters.length - 1; i >= 0; i--) {
    const looter = looters[i]
    if (looter.hp <= 0) {
      removeLooter(looter)
      looters.splice(i, 1)
      continue
    }

    looter.attackT = Math.max(0, looter.attackT - dt)
    looter.wobble += dt * 8
    looter.hitFlash = Math.max(0, looter.hitFlash - dt)
    looter.wanderT = Math.max(0, looter.wanderT - dt)

    if (looter.hitFlash > 0) {
      const flashIntensity = looter.hitFlash / 0.3
      forEachMaterial(looter.group, (mat) => {
        if (!mat.emissive) mat.emissive = new THREE.Color(0x000000)
        mat.emissive.setHex(0xff0000)
        mat.emissiveIntensity = flashIntensity * 0.8
      })
    } else {
      forEachMaterial(looter.group, (mat) => {
        if (mat.emissive) mat.emissiveIntensity = 0
      })
    }

    const tx = looter.group.position.x
    const tz = looter.group.position.z
    const dx = px - tx
    const dz = pz - tz
    const dist = Math.hypot(dx, dz)

    if (dist > LOOTER_DESPAWN_RANGE) {
      removeLooter(looter)
      looters.splice(i, 1)
      continue
    }

    let moving = false
    let punching = looter.attacking

    if (torchOn && dist < LOOTER_AGGRO_RANGE) {
      if (dist > LOOTER_ATTACK_RANGE) {
        if (looter.attacking && dist > LOOTER_ATTACK_CANCEL_RANGE) {
          cancelLooterAttack(looter)
          looter.attacking = false
          looter.pendingHitT = -1
          looter.attackRemainT = -1
          punching = false
        }
        if (!looter.attacking) {
          const spd = looter.speed * dt
          const nx = tx + (dx / dist) * spd
          const nz = tz + (dz / dist) * spd
          const resolved = resolveLooterCollision(nx, nz, colliders)
          looter.group.position.x = resolved.x
          looter.group.position.z = resolved.z
          looter.group.rotation.y = Math.atan2(dx, dz)
          moving = true
        } else {
          looter.group.rotation.y = Math.atan2(dx, dz)
        }
      } else {
        looter.group.rotation.y = Math.atan2(dx, dz)
        if (!looter.attacking && looter.attackT <= 0) {
          const duration = playLooterAttack(looter)
          if (duration > 0) {
            looter.attacking = true
            punching = true
            looter.pendingHitT = duration * 0.45
            looter.attackRemainT = duration
            looter.attackT = Math.max(LOOTER_ATTACK_COOLDOWN, duration + 0.15)
          } else if (!playerInvuln) {
            looter.attackT = LOOTER_ATTACK_COOLDOWN
            onPlayerHit(looter.damage)
          }
        }
      }
    } else {
      if (looter.attacking) {
        cancelLooterAttack(looter)
        looter.attacking = false
        looter.pendingHitT = -1
        looter.attackRemainT = -1
        punching = false
      }
      // Wander randomly when torch is off or player is out of aggro
      if (!torchOn) {
        if (looter.wanderT <= 0) {
          looter.wanderAngle += (Math.random() - 0.5) * 1.8
          looter.wanderT = 1.2 + Math.random() * 2.5
        }
        const spd = LOOTER_WANDER_SPEED * dt
        const nx = tx + Math.sin(looter.wanderAngle) * spd
        const nz = tz + Math.cos(looter.wanderAngle) * spd
        const resolved = resolveLooterCollision(nx, nz, colliders)
        looter.group.position.x = resolved.x
        looter.group.position.z = resolved.z
        looter.group.rotation.y = looter.wanderAngle
        moving = true
      }
    }

    if (looter.pendingHitT >= 0) {
      looter.pendingHitT -= dt
      if (looter.pendingHitT <= 0) {
        looter.pendingHitT = -1
        if (dist <= LOOTER_ATTACK_RANGE && !playerInvuln) {
          onPlayerHit(looter.damage)
        }
      }
    }

    if (looter.attackRemainT >= 0) {
      looter.attackRemainT -= dt
      if (looter.attackRemainT <= 0) {
        looter.attackRemainT = -1
        looter.attacking = false
        punching = false
        endLooterAttack(looter)
      }
    }

    if (looter.mixer && (looter.action || looter.attackAction)) {
      looter.group.position.y = 0
      if (looter.action) {
        looter.action.paused = looter.attacking || !moving
      }
      if (moving || punching || looter.attacking) {
        looter.mixer.update(dt)
        pinLooterHips(looter.hips, looter.hipsBind)
      }
    } else {
      looter.group.position.y = moving ? Math.abs(Math.sin(looter.wobble)) * 0.08 : 0
    }
  }
}

/**
 * @param {Looter[]} looters
 * @param {number} px
 * @param {number} pz
 * @param {number} yaw
 */
export function tryPunchLooters(looters, px, pz, yaw) {
  let defeated = 0
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)

  for (const looter of looters) {
    const tx = looter.group.position.x
    const tz = looter.group.position.z
    const dx = tx - px
    const dz = tz - pz
    const dist = Math.hypot(dx, dz)
    if (dist > PUNCH_RANGE) continue
    const dot = (dx * fx + dz * fz) / (dist || 1)
    if (dot < 0.35) continue
    looter.hp -= PUNCH_DAMAGE
    looter.hitFlash = 0.3
    looter.group.position.x += fx * 0.8
    looter.group.position.z += fz * 0.8
    if (looter.hp <= 0) defeated++
  }
  return defeated
}

function isSpawnBlocked(x, z, colliders, pad = 1.4) {
  for (const c of colliders) {
    if (c.active === false) continue
    if (Math.abs(x - c.x) < c.hw + pad && Math.abs(z - c.z) < c.hd + pad) {
      return true
    }
  }
  return false
}

function snapToStreet(x, z) {
  const nx = Math.round(x / BLOCK) * BLOCK
  const nz = Math.round(z / BLOCK) * BLOCK
  if (Math.abs(x - nx) <= Math.abs(z - nz)) return { x: nx, z }
  return { x, z: nz }
}

/**
 * @param {number} px
 * @param {number} pz
 * @param {import('./level5City.js').BuildingCollider[]} colliders
 * @param {number} [facingYaw]
 */
export function pickLooterSpawnPoint(px, pz, colliders, facingYaw = 0) {
  const rand = Math.random()
  let looterType = LOOTER_TYPES.NORMAL
  if (rand < 0.2) looterType = LOOTER_TYPES.FAST
  else if (rand > 0.8) looterType = LOOTER_TYPES.TANK

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
      return { x: snapped.x, z: snapped.z, type: looterType }
    }
  }

  const fallback = snapToStreet(px + lookX * 14, pz + lookZ * 14)
  return { x: fallback.x, z: fallback.z, type: looterType }
}

/** True if any looter is within warning range of the player. */
export function isLooterNearby(looters, px, pz, range = 18) {
  for (const looter of looters) {
    const dx = looter.group.position.x - px
    const dz = looter.group.position.z - pz
    if (dx * dx + dz * dz < range * range) return true
  }
  return false
}
