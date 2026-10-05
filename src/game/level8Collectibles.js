// level8Collectibles.js — Flood-safety notes and wallet rand coins.

import * as THREE from 'three'
import {
  createCoinMeshes,
  disposeCoinMeshes,
  updateCollectibleInstances,
} from './coins.js'
import { LEVEL8_ALL_TIPS_BONUS_MS } from './level8City.js'

export const LEVEL8_TIP_PICKUP_RADIUS = 2.2
export { LEVEL8_ALL_TIPS_BONUS_MS }

const COIN_PICKUP_R = 1.55
const COIN_PICKUP_R2 = COIN_PICKUP_R * COIN_PICKUP_R

export const LEVEL8_TIP_FACTS = [
  'Fifteen centimetres of moving water can knock you off your feet.',
  'Sixty centimetres can sweep a car. Never drive the dip.',
  'Get to high ground early. Drains in townships back up fast.',
  'Informal homes on floodplains get hit first — check on neighbours.',
  'Do not wade in to “save” someone. Call for help from dry ground.',
  'After the water drops, assume tap water is unsafe until the city says otherwise.',
  'Lightning and downed cables travel through flood water. Keep off metal fences.',
  '112 from a mobile is the free emergency number in South Africa.',
]

const TIP_SPOTS = [
  { x: -14, z: 100 },
  { x: 16, z: 78 },
  { x: 0, z: 52 },
  { x: 36, z: 48 },
  { x: -22, z: 6 },
  { x: -48, z: 4 },
  { x: 12, z: -48 },
  { x: -14, z: -86 },
]

const HEART_SPOTS = [
  { x: 13.5, z: 86 },
  { x: -13.5, z: 36 },
  { x: 13.5, z: -56 },
]

const COIN_SPOTS = [
  { x: -20, z: 100 },
  { x: 20, z: 100 },
  { x: 0, z: 72 },
  { x: 40, z: 52 },
  { x: 56, z: 36 },
  { x: -8, z: 20 },
  { x: -52, z: 2 },
  { x: -28, z: -8 },
  { x: 8, z: -20 },
  { x: 40, z: -48 },
  { x: 56, z: -36 },
  { x: 16, z: -60 },
  { x: -8, z: -72 },
  { x: 8, z: -84 },
  { x: -16, z: -96 },
]

/** @typedef {{ x: number, z: number, fact: string, collected: boolean }} TipNote */

export function buildLevel8TipData() {
  return TIP_SPOTS.map((spot, i) => ({
    x: spot.x,
    z: spot.z,
    fact: LEVEL8_TIP_FACTS[i % LEVEL8_TIP_FACTS.length],
    collected: false,
  }))
}

function haloTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
  g.addColorStop(0, 'rgba(180, 230, 255, 0.9)')
  g.addColorStop(1, 'rgba(180, 230, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

/** @param {TipNote[]} tips */
export function createLevel8TipMeshes(tips) {
  const group = new THREE.Group()
  group.name = 'level8-tips'
  const noteGeo = new THREE.PlaneGeometry(0.6, 0.8)
  const noteMat = new THREE.MeshStandardMaterial({
    color: 0xe3f4ff,
    emissive: 0x7ee0ff,
    emissiveIntensity: 0.9,
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
    holder.position.set(tip.x, 1.15, tip.z)
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

export function updateLevel8TipMeshes(meshes, tips, t) {
  tips.forEach((tip, i) => {
    const item = meshes.items[i]
    if (!item) return
    item.holder.visible = !tip.collected
    if (tip.collected) return
    item.holder.position.y = 1.15 + Math.sin(t * 2 + i) * 0.12
    item.note.rotation.y = Math.sin(t * 0.8 + i) * 0.5
  })
}

export function findLevel8TipNear(tips, px, pz) {
  let best = -1
  let bestD = LEVEL8_TIP_PICKUP_RADIUS
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

export function resetLevel8Tips(tips) {
  for (const tip of tips) tip.collected = false
}

export function buildLevel8CoinData() {
  return COIN_SPOTS.map((spot) => ({
    x: spot.x,
    z: spot.z,
    spin: Math.random() * Math.PI * 2,
    collected: false,
  }))
}

export function collectLevel8CoinsNearPlayer(coinData, px, pz) {
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

export function resetLevel8Coins(coinData, coinMeshes) {
  for (const coin of coinData) coin.collected = false
  if (coinMeshes) updateCollectibleInstances(coinMeshes, coinData, 0)
}

export function createLevel8CoinMeshes(coinData, textureLoader) {
  return createCoinMeshes(coinData, textureLoader)
}

export function buildLevel8HeartData() {
  return HEART_SPOTS.map((spot) => ({ x: spot.x, z: spot.z, collected: false }))
}

export function createLevel8HeartMeshes(hearts) {
  const group = new THREE.Group()
  group.name = 'level8-hearts'
  const geo = new THREE.SphereGeometry(0.28, 10, 10)
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff3d6e,
    emissive: 0xff1744,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  })
  const items = hearts.map((h) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(h.x, 1.05, h.z)
    mesh.castShadow = true
    group.add(mesh)
    return mesh
  })
  return {
    group,
    items,
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}

export function updateLevel8HeartMeshes(meshes, hearts, t) {
  hearts.forEach((h, i) => {
    const mesh = meshes.items[i]
    if (!mesh) return
    mesh.visible = !h.collected
    if (h.collected) return
    mesh.position.y = 1.05 + Math.sin(t * 2.4 + i) * 0.14
    mesh.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08)
  })
}

export function collectLevel8HeartsNearPlayer(hearts, px, pz) {
  let picked = 0
  for (const h of hearts) {
    if (h.collected) continue
    if (Math.hypot(px - h.x, pz - h.z) > 1.6) continue
    h.collected = true
    picked++
  }
  return picked
}

export function resetLevel8Hearts(hearts) {
  for (const h of hearts) h.collected = false
}

export { disposeCoinMeshes, updateCollectibleInstances }
