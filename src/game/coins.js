// coins.js — Rand coin / Coke GLB placement, meshes, pickup animation.

import * as THREE from 'three'
import { cloneCokeCollectibleInstance } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'
import {
  COIN_COUNT,
  COIN_HEIGHT,
  COIN_MAX_TRIES,
  COIN_MIN_GAP,
  COIN_PICKUP_RX,
  COIN_PICKUP_RZ,
  COIN_POTHOLE_CLEARANCE,
  COIN_RADIUS,
  COIN_Z_FAR,
  COIN_Z_NEAR,
  LANES,
} from './gameConstants.js'

export const COIN_TEXTURE = new URL(
  '../../Characters/coin.png',
  import.meta.url
).href

/** @typedef {'coin' | 'coke-bottle'} CollectibleVariant */

/**
 * Rand coin placements; spaced per lane and kept clear of pothole hit zones.
 * @param {{ x: number, z: number, halfX?: number, halfZ?: number }[]} potholeData
 * @param {{
 *   count?: number
 *   excludePositions?: { x: number, z: number }[]
 *   excludeGap?: number
 *   maxTries?: number
 * }} [options]
 * @returns {{ x: number, z: number, spin: number, collected: boolean }[]}
 */
export function buildCoinData(potholeData, options = {}) {
  const count = options.count ?? COIN_COUNT
  const excludePositions = options.excludePositions ?? []
  const excludeGap = options.excludeGap ?? COIN_MIN_GAP
  const maxTries = options.maxTries ?? COIN_MAX_TRIES
  const list = []
  const byLaneZ = { 0: [], 1: [], 2: [] }
  const holes = potholeData ?? []
  for (let n = 0; n < maxTries && list.length < count; n++) {
    const lane = (Math.random() * 3) | 0
    const z = COIN_Z_FAR + Math.random() * (COIN_Z_NEAR - COIN_Z_FAR)
    const x = LANES[lane] + (Math.random() - 0.5) * 0.45
    const zList = byLaneZ[lane]
    if (zList.some((zz) => Math.abs(zz - z) < COIN_MIN_GAP)) continue
    const inPothole = holes.some((ph) => {
      if (Math.abs(z - ph.z) > (ph.halfZ ?? 0) + COIN_POTHOLE_CLEARANCE) return false
      return Math.abs(x - ph.x) <= (ph.halfX ?? 0) + COIN_POTHOLE_CLEARANCE
    })
    if (inPothole) continue
    if (
      excludePositions.some(
        (p) => Math.hypot((p.x ?? 0) - x, (p.z ?? 0) - z) < excludeGap
      )
    ) {
      continue
    }
    zList.push(z)
    list.push({
      x,
      z,
      spin: Math.random() * Math.PI * 2,
      collected: false,
    })
  }
  return list
}

const _coinPos = new THREE.Vector3()
const _coinScale = new THREE.Vector3()
const _coinEuler = new THREE.Euler()
const _coinQuat = new THREE.Quaternion()
const _coinMatrix = new THREE.Matrix4()

/**
 * @param {import('three').InstancedMesh} mesh
 */
function updateCoinInstancedMesh(mesh, coinData, t) {
  for (let i = 0; i < coinData.length; i++) {
    const coin = coinData[i]
    if (coin.collected) {
      _coinPos.set(0, -100, 0)
      _coinScale.set(0, 0, 0)
      _coinQuat.identity()
    } else {
      _coinPos.set(
        coin.x,
        0.42 + 0.05 * Math.sin(t * 4.2 + coin.spin),
        coin.z
      )
      _coinScale.set(1, 1, 1)
      _coinEuler.set(Math.PI / 2, t * 2.6 + coin.spin, 0)
      _coinQuat.setFromEuler(_coinEuler)
    }
    _coinMatrix.compose(_coinPos, _coinQuat, _coinScale)
    mesh.setMatrixAt(i, _coinMatrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

/**
 * @param {import('three').Object3D[]} instances
 * @param {number} floatHalfY
 */
function updateCokeInstances(instances, coinData, t, floatHalfY) {
  for (let i = 0; i < coinData.length; i++) {
    const coin = coinData[i]
    const bottle = instances[i]
    if (!bottle) continue
    if (coin.collected) {
      bottle.visible = false
      continue
    }
    bottle.visible = true
    const bob = 0.04 * Math.sin(t * 4.2 + coin.spin)
    bottle.position.set(coin.x, floatHalfY + bob, coin.z)
    bottle.rotation.set(0, t * 2.2 + coin.spin, 0)
  }
}

/**
 * @param {{
 *   mesh?: import('three').InstancedMesh | null,
 *   instances?: import('three').Object3D[],
 *   floatHalfY?: number,
 *   variant: CollectibleVariant,
 * }} coinMeshes
 */
export function updateCollectibleInstances(coinMeshes, coinData, t) {
  if (coinMeshes.instances?.length) {
    updateCokeInstances(
      coinMeshes.instances,
      coinData,
      t,
      coinMeshes.floatHalfY ?? 0.5
    )
    return
  }
  if (coinMeshes.mesh) {
    updateCoinInstancedMesh(coinMeshes.mesh, coinData, t)
  }
}

/**
 * Collect coins overlapping the player this frame (swept along Z so fast runs do not skip).
 * @returns {number} newly collected count
 */
export function collectCoinsNearPlayer(coinData, px, pz, previousPlayerZ) {
  const zMin = Math.min(pz, previousPlayerZ)
  const zMax = Math.max(pz, previousPlayerZ)
  let picked = 0
  for (const coin of coinData) {
    if (coin.collected) continue
    if (coin.z < zMin - COIN_PICKUP_RZ || coin.z > zMax + COIN_PICKUP_RZ) continue
    if (Math.abs(px - coin.x) > COIN_PICKUP_RX) continue
    coin.collected = true
    picked++
  }
  return picked
}

/**
 * @param {import('three').Object3D} cokeTemplate
 * @returns {{
 *   group: THREE.Group,
 *   instances: import('three').Object3D[],
 *   floatHalfY: number,
 *   variant: CollectibleVariant,
 *   mesh: null,
 *   coinMat: null,
 *   coinTexture: null,
 * }}
 */
export function createCokeCollectibleMeshes(coinData, cokeTemplate) {
  const group = new THREE.Group()
  const floatHalfY = cokeTemplate.userData.floatHalfY ?? 0.5
  const instances = []
  for (let i = 0; i < coinData.length; i++) {
    const bottle = cloneCokeCollectibleInstance(cokeTemplate)
    bottle.visible = false
    group.add(bottle)
    instances.push(bottle)
  }
  updateCokeInstances(instances, coinData, 0, floatHalfY)
  return {
    group,
    instances,
    floatHalfY,
    variant: 'coke-bottle',
    mesh: null,
    coinMat: null,
    coinTexture: null,
  }
}

/**
 * @param {THREE.TextureLoader} textureLoader
 */
export function createCoinMeshes(coinData, textureLoader) {
  const coinTexture = textureLoader.load(COIN_TEXTURE)
  coinTexture.colorSpace = THREE.SRGBColorSpace
  const coinMat = new THREE.MeshStandardMaterial({
    map: coinTexture,
    metalness: 0.72,
    roughness: 0.28,
    emissive: 0x4a3a10,
    emissiveIntensity: 0.12,
  })
  const coinMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 28),
    coinMat,
    coinData.length
  )
  coinMesh.castShadow = true
  coinMesh.receiveShadow = true
  updateCoinInstancedMesh(coinMesh, coinData, 0)
  const group = new THREE.Group()
  group.add(coinMesh)
  return {
    group,
    mesh: coinMesh,
    instances: null,
    floatHalfY: 0,
    coinMat,
    coinTexture,
    variant: 'coin',
  }
}

/** Empty placeholder until coke.glb finishes loading. */
export function createEmptyCokeCollectibleMeshes() {
  return {
    group: new THREE.Group(),
    instances: null,
    floatHalfY: 0,
    variant: 'coke-bottle',
    mesh: null,
    coinMat: null,
    coinTexture: null,
  }
}

export function disposeCoinMeshes(coinMeshes) {
  if (coinMeshes.instances?.length) {
    for (const bottle of coinMeshes.instances) {
      coinMeshes.group.remove(bottle)
      disposeObject3D(bottle)
    }
    coinMeshes.instances.length = 0
    return
  }
  if (coinMeshes.mesh) {
    coinMeshes.mesh.geometry.dispose()
    coinMeshes.coinMat?.dispose()
    coinMeshes.coinTexture?.dispose()
  }
}
