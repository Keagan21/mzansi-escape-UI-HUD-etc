// level6Collectibles.js — Community tip notes (GBV facts) and wallet rand coins.

import * as THREE from 'three'
import {
  createCoinMeshes,
  disposeCoinMeshes,
  updateCollectibleInstances,
} from './coins.js'
import { LEVEL6_COMMUNITY_TIPS, LEVEL6_WALLET_COIN_COUNT } from './gameConstants.js'

export const LEVEL6_TIP_PICKUP_RADIUS = 2.2
/** Collecting every note shaves this much off the run time. */
export const LEVEL6_ALL_TIPS_BONUS_MS = 8000

const COIN_PICKUP_R = 1.55
const COIN_PICKUP_R2 = COIN_PICKUP_R * COIN_PICKUP_R

export const LEVEL6_TIP_FACTS = [
  'Most GBV perpetrators are known to the victim.',
  'The Cape Flats has the highest femicide rate in SA.',
  'A Thuthuzela Care Centre offers medical, legal and counselling help in one place.',
  'You are not alone. 0800 428 428 is free and available 24 hours.',
  'Abuse is not only physical — emotional, verbal and financial abuse are GBV too.',
  'Believing a survivor is the first step to helping them.',
  "A protection order is free to apply for at any magistrate's court.",
  'Silence protects abusers. Speaking up protects survivors.',
]

/** Handcrafted note spots — each sits in an open passage of the maze. */
const TIP_SPOTS = [
  { x: -20, z: 106 },
  { x: 56, z: 106 },
  { x: 0, z: 78 },
  { x: 46, z: 24 },
  { x: -62, z: 6 },
  { x: -37, z: -18 },
  { x: -56, z: -76 },
  { x: 28, z: -76 },
]

const COIN_SPOTS = [
  { x: -40, z: 120 },
  { x: 30, z: 120 },
  { x: -75, z: 120 },
  { x: 56, z: 100 },
  { x: -56, z: 92 },
  { x: 20, z: 90 },
  { x: -10, z: 64 },
  { x: 30, z: 64 },
  { x: -46, z: 78 },
  { x: -20, z: 44 },
  { x: 40, z: 44 },
  { x: 60, z: 22 },
  { x: 64, z: -2 },
  { x: -40, z: 20 },
  { x: 10, z: 20 },
  { x: -50, z: -8 },
  { x: 24, z: -8 },
  { x: 4, z: -25 },
  { x: 0, z: -42 },
  { x: -10, z: -92 },
]

/**
 * @typedef {{ x: number, z: number, fact: string, collected: boolean }} TipNote
 */

/** @returns {TipNote[]} */
export function buildLevel6TipData() {
  return TIP_SPOTS.slice(0, LEVEL6_COMMUNITY_TIPS).map((spot, i) => ({
    x: spot.x,
    z: spot.z,
    fact: LEVEL6_TIP_FACTS[i % LEVEL6_TIP_FACTS.length],
    collected: false,
  }))
}

function haloTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
  g.addColorStop(0, 'rgba(255, 253, 224, 0.9)')
  g.addColorStop(1, 'rgba(255, 253, 224, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

/** @param {TipNote[]} tips */
export function createLevel6TipMeshes(tips) {
  const group = new THREE.Group()
  group.name = 'level6-tips'
  const noteGeo = new THREE.PlaneGeometry(0.6, 0.8)
  const noteMat = new THREE.MeshStandardMaterial({
    color: 0xfffde0,
    emissive: 0xfffde0,
    emissiveIntensity: 1.3,
    side: THREE.DoubleSide,
  })
  const haloTex = haloTexture()
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const items = tips.map((tip) => {
    const holder = new THREE.Group()
    holder.position.set(tip.x, 1.1, tip.z)
    const note = new THREE.Mesh(noteGeo, noteMat)
    note.rotation.z = 0.08
    const halo = new THREE.Sprite(haloMat)
    halo.scale.set(1.8, 1.8, 1)
    holder.add(halo, note)
    group.add(holder)
    return { holder, note }
  })
  return {
    group,
    items,
    dispose() {
      noteGeo.dispose()
      noteMat.dispose()
      haloMat.dispose()
      haloTex.dispose()
    },
  }
}

/**
 * @param {ReturnType<typeof createLevel6TipMeshes>} meshes
 * @param {TipNote[]} tips
 * @param {number} t
 */
export function updateLevel6TipMeshes(meshes, tips, t) {
  tips.forEach((tip, i) => {
    const item = meshes.items[i]
    if (!item) return
    item.holder.visible = !tip.collected
    if (tip.collected) return
    item.holder.position.y = 1.1 + Math.sin(t * 2 + i) * 0.12
    item.note.rotation.y = Math.sin(t * 0.8 + i) * 0.5
  })
}

/**
 * Index of the nearest uncollected note within pickup range, or -1.
 * @param {TipNote[]} tips
 */
export function findLevel6TipNear(tips, px, pz) {
  let best = -1
  let bestD = LEVEL6_TIP_PICKUP_RADIUS
  tips.forEach((tip, i) => {
    if (tip.collected) return
    const d = Math.hypot(px - tip.x, pz - tip.z)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

/** @param {TipNote[]} tips */
export function resetLevel6Tips(tips) {
  for (const tip of tips) tip.collected = false
}

/** @returns {{ x: number, z: number, spin: number, collected: boolean }[]} */
export function buildLevel6CoinData() {
  return COIN_SPOTS.slice(0, LEVEL6_WALLET_COIN_COUNT).map((spot) => ({
    x: spot.x,
    z: spot.z,
    spin: Math.random() * Math.PI * 2,
    collected: false,
  }))
}

export function collectLevel6CoinsNearPlayer(coinData, px, pz) {
  let picked = 0
  for (const coin of coinData) {
    if (coin.collected) continue
    const dx = px - coin.x
    const dz = pz - coin.z
    if (dx * dx + dz * dz > COIN_PICKUP_R2) continue
    coin.collected = true
    picked++
  }
  return picked
}

export function resetLevel6Coins(coinData, coinMeshes) {
  for (const coin of coinData) coin.collected = false
  if (coinMeshes) updateCollectibleInstances(coinMeshes, coinData, 0)
}

export function createLevel6CoinMeshes(coinData, textureLoader) {
  return createCoinMeshes(coinData, textureLoader)
}

export { disposeCoinMeshes, updateCollectibleInstances }
