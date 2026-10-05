// level5Coins.js — Optional street-scattered rand coins for the store wallet.

import {
  createCoinMeshes,
  disposeCoinMeshes,
  updateCollectibleInstances,
} from './coins.js'
import {
  BLOCK,
  GRID_N,
  LEVEL5_ANCHORS,
  LEVEL5_WORLD_BOUND,
  STREET_W,
} from './level5City.js'
import { LEVEL5_WALLET_COIN_COUNT } from './gameConstants.js'

export const LEVEL5_COIN_COUNT = LEVEL5_WALLET_COIN_COUNT

const MAX_PER_ROAD = 2
const MIN_GAP = 28
const NODE_CLEARANCE = 22
const BATTERY_CLEARANCE = 12
const PICKUP_R = 1.55
const PICKUP_R2 = PICKUP_R * PICKUP_R

const GAMEPLAY_NODES = [
  LEVEL5_ANCHORS.spawn,
  LEVEL5_ANCHORS.node1_circuit,
  LEVEL5_ANCHORS.node2_cable,
  LEVEL5_ANCHORS.node3_generator,
  LEVEL5_ANCHORS.stadium_win,
]

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
 * @param {{ x: number, z: number }[]} [batteryData]
 * @returns {{ x: number, z: number, spin: number, collected: boolean }[]}
 */
export function buildLevel5CoinData(batteryData = []) {
  const list = []
  const half = GRID_N / 2
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
    if (list.length >= LEVEL5_COIN_COUNT) return false
    if (Math.abs(x) > LEVEL5_WORLD_BOUND - 6) return false
    if (Math.abs(z) > LEVEL5_WORLD_BOUND - 6) return false
    if (
      GAMEPLAY_NODES.some((node) => Math.hypot(x - node.x, z - node.z) < NODE_CLEARANCE)
    ) {
      return false
    }
    if (batteryData.some((b) => Math.hypot(x - b.x, z - b.z) < BATTERY_CLEARANCE)) {
      return false
    }
    if (list.some((c) => Math.hypot(c.x - x, c.z - z) < MIN_GAP)) return false
    list.push({ x, z, spin: Math.random() * Math.PI * 2, collected: false })
    return true
  }

  for (const road of roads) {
    if (list.length >= LEVEL5_COIN_COUNT) break
    let onThis = 0
    const sides = shuffle([-1, 1])
    const alongs = []
    for (let attempt = 0; attempt < 24 && alongs.length < 6; attempt++) {
      const t = minT + span * (0.1 + Math.random() * 0.8)
      if (alongs.every((a) => Math.abs(a - t) >= MIN_GAP * 0.7)) alongs.push(t)
    }
    shuffle(alongs)
    for (const t of alongs) {
      if (onThis >= MAX_PER_ROAD || list.length >= LEVEL5_COIN_COUNT) break
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
 * @param {{ x: number, z: number, collected: boolean }[]} coinData
 * @param {number} px
 * @param {number} pz
 */
export function collectLevel5CoinsNearPlayer(coinData, px, pz) {
  let picked = 0
  for (const coin of coinData) {
    if (coin.collected) continue
    const dx = px - coin.x
    const dz = pz - coin.z
    if (dx * dx + dz * dz > PICKUP_R2) continue
    coin.collected = true
    picked++
  }
  return picked
}

export function resetLevel5Coins(coinData, coinMeshes) {
  for (const coin of coinData) coin.collected = false
  if (coinMeshes) updateCollectibleInstances(coinMeshes, coinData, 0)
}

export function createLevel5CoinMeshes(coinData, textureLoader) {
  return createCoinMeshes(coinData, textureLoader)
}

export { disposeCoinMeshes, updateCollectibleInstances }
