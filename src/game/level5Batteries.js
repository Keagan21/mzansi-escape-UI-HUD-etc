// level5Batteries.js — Scattered AA batteries for the Level 5 torch loop.

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import {
  BLOCK,
  GRID_N,
  LEVEL5_ANCHORS,
  LEVEL5_WORLD_BOUND,
  STREET_W,
} from './level5City.js'
import {
  LEVEL5_BATTERY_COUNT,
  LEVEL5_BATTERY_PER_PICKUP,
} from './gameConstants.js'

export { LEVEL5_BATTERY_COUNT, LEVEL5_BATTERY_PER_PICKUP }

const MAX_PER_ROAD = 2
const MIN_GAP = 26
const PICKUP_R = 1.55
const PICKUP_R2 = PICKUP_R * PICKUP_R

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmp = list[i]
    list[i] = list[j]
    list[j] = tmp
  }
  return list
}

/**
 * @returns {{ x: number, z: number, spin: number, collected: boolean }[]}
 */
export function buildLevel5BatteryData() {
  const list = []
  const half = GRID_N / 2
  const spawn = LEVEL5_ANCHORS.spawn
  const minT = -half * BLOCK + 18
  const maxT = half * BLOCK - 18
  const span = maxT - minT
  const curb = STREET_W * 0.42

  const roads = []
  for (let i = -half; i <= half; i++) {
    roads.push({ axis: 'ns', coord: i * BLOCK })
    roads.push({ axis: 'ew', coord: i * BLOCK })
  }
  shuffle(roads)

  const tryAdd = (x, z) => {
    if (list.length >= LEVEL5_BATTERY_COUNT) return false
    if (Math.abs(x) > LEVEL5_WORLD_BOUND - 6) return false
    if (Math.abs(z) > LEVEL5_WORLD_BOUND - 6) return false
    if (Math.hypot(x - spawn.x, z - spawn.z) < 14) return false
    if (
      Math.hypot(x - LEVEL5_ANCHORS.node1_circuit.x, z - LEVEL5_ANCHORS.node1_circuit.z) < 18
    ) {
      return false
    }
    if (list.some((c) => Math.hypot(c.x - x, c.z - z) < MIN_GAP)) return false
    list.push({ x, z, spin: Math.random() * Math.PI * 2, collected: false })
    return true
  }

  for (const road of roads) {
    if (list.length >= LEVEL5_BATTERY_COUNT) break
    let onThis = 0
    const sides = shuffle([-1, 1])
    const alongs = []
    for (let attempt = 0; attempt < 24 && alongs.length < 6; attempt++) {
      const t = minT + span * (0.1 + Math.random() * 0.8)
      if (alongs.every((a) => Math.abs(a - t) >= MIN_GAP * 0.7)) alongs.push(t)
    }
    shuffle(alongs)
    for (const t of alongs) {
      if (onThis >= MAX_PER_ROAD || list.length >= LEVEL5_BATTERY_COUNT) break
      const side = sides[onThis % sides.length]
      const offset = curb * side + (Math.random() - 0.5) * 1.4
      const x = road.axis === 'ns' ? road.coord + offset : t
      const z = road.axis === 'ew' ? road.coord + offset : t
      if (tryAdd(x, z)) onThis++
    }
  }

  return list
}

/**
 * @param {{ x: number, z: number, collected: boolean }[]} data
 * @param {number} px
 * @param {number} pz
 */
export function collectLevel5BatteriesNearPlayer(data, px, pz) {
  let picked = 0
  for (const bat of data) {
    if (bat.collected) continue
    const dx = px - bat.x
    const dz = pz - bat.z
    if (dx * dx + dz * dz > PICKUP_R2) continue
    bat.collected = true
    picked++
  }
  return picked
}

/**
 * @param {{ x: number, z: number, spin: number, collected: boolean }[]} data
 * @param {{ instances: THREE.Object3D[] }} meshes
 */
export function resetLevel5Batteries(data, meshes) {
  for (const b of data) b.collected = false
  if (meshes) updateLevel5BatteryMeshes(meshes, data, 0)
}

/**
 * @param {{ x: number, z: number, spin: number }[]} data
 */
export function createLevel5BatteryMeshes(data) {
  const group = new THREE.Group()
  group.name = 'level5-batteries'
  const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.55, 12)
  const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf5c518,
    roughness: 0.35,
    metalness: 0.2,
  })
  const capMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })
  /** @type {THREE.Object3D[]} */
  const instances = []
  for (const b of data) {
    const bat = new THREE.Group()
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.castShadow = true
    const capTop = new THREE.Mesh(capGeo, capMat)
    capTop.position.y = 0.305
    const capBot = new THREE.Mesh(capGeo, capMat)
    capBot.position.y = -0.305
    bat.add(body, capTop, capBot)
    bat.position.set(b.x, 0.45, b.z)
    group.add(bat)
    instances.push(bat)
  }
  return { group, instances, bodyGeo, capGeo, bodyMat, capMat }
}

/**
 * @param {{ instances: THREE.Object3D[] }} meshes
 * @param {{ x: number, z: number, spin: number, collected: boolean }[]} data
 * @param {number} t
 */
export function updateLevel5BatteryMeshes(meshes, data, t) {
  for (let i = 0; i < data.length; i++) {
    const b = data[i]
    const mesh = meshes.instances[i]
    if (!mesh) continue
    if (b.collected) {
      mesh.visible = false
      continue
    }
    mesh.visible = true
    mesh.position.set(b.x, 0.45 + 0.05 * Math.sin(t * 4.2 + b.spin), b.z)
    mesh.rotation.y = t * 2.2 + b.spin
  }
}

export function disposeLevel5BatteryMeshes(meshes) {
  if (!meshes) return
  disposeObject3D(meshes.group)
  meshes.bodyGeo?.dispose()
  meshes.capGeo?.dispose()
  meshes.bodyMat?.dispose()
  meshes.capMat?.dispose()
}
