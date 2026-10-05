// level3Coins.js — Street-scattered rand coins for Level 3 open world.

import {
  createCoinMeshes,
  disposeCoinMeshes,
  updateCollectibleInstances,
} from './coins.js'
import {
  BLOCK,
  computeParkStationPlacement,
  GRID_N,
  LEVEL3_WORLD_BOUND,
  STREET_W,
} from './level3City.js'

/** Coins required at Park Station before the bus will take you. */
export const LEVEL3_BUS_FARE = 10

/** Total coins across the CBD. Spread so the fare cannot come from one street. */
export const LEVEL3_COIN_COUNT = 48

/** Hard cap per road so a straight-line sprint cannot finish the fare. */
const MAX_PER_ROAD = 2
const MIN_GAP = 28
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
 * Place coins on many NS and EW streets, at most two per road, on opposite
 * sidewalks so running the centre line of one street cannot vacuum them all.
 * @returns {{ x: number, z: number, spin: number, collected: boolean }[]}
 */
export function buildLevel3CoinData() {
  const list = []
  const half = GRID_N / 2
  const park = computeParkStationPlacement()
  const spawnZ = 60
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
    if (list.length >= LEVEL3_COIN_COUNT) return false
    if (Math.abs(x) > LEVEL3_WORLD_BOUND - 6) return false
    if (Math.abs(z) > LEVEL3_WORLD_BOUND - 6) return false
    if (Math.hypot(x - park.x, z - park.z) < 30) return false
    if (Math.hypot(x, z - spawnZ) < 16) return false
    if (list.some((c) => Math.hypot(c.x - x, c.z - z) < MIN_GAP)) return false
    list.push({
      x,
      z,
      spin: Math.random() * Math.PI * 2,
      collected: false,
    })
    return true
  }

  for (const road of roads) {
    if (list.length >= LEVEL3_COIN_COUNT) break
    const spawnStreet = road.axis === 'ns' && Math.abs(road.coord) < 1
    const cap = spawnStreet ? 1 : MAX_PER_ROAD
    let onThis = 0
    const sides = shuffle([-1, 1])
    const alongs = []
    for (let attempt = 0; attempt < 24 && alongs.length < 6; attempt++) {
      const t = minT + span * (0.1 + Math.random() * 0.8)
      if (alongs.every((a) => Math.abs(a - t) >= MIN_GAP * 0.7)) alongs.push(t)
    }
    shuffle(alongs)
    for (const t of alongs) {
      if (onThis >= cap || list.length >= LEVEL3_COIN_COUNT) break
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
 * Open-world XZ pickup (no corridor Z-sweep).
 * @param {{ x: number, z: number, collected: boolean }[]} coinData
 * @param {number} px
 * @param {number} pz
 * @returns {number}
 */
export function collectLevel3CoinsNearPlayer(coinData, px, pz) {
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

/**
 * @param {{ x: number, z: number, spin: number, collected: boolean }[]} coinData
 */
export function resetLevel3Coins(coinData, coinMeshes) {
  for (const coin of coinData) coin.collected = false
  if (coinMeshes) updateCollectibleInstances(coinMeshes, coinData, 0)
}

/**
 * @param {{ x: number, z: number, spin: number }[]} coinData
 * @param {import('three').TextureLoader} textureLoader
 */
export function createLevel3CoinMeshes(coinData, textureLoader) {
  return createCoinMeshes(coinData, textureLoader)
}

export { disposeCoinMeshes, updateCollectibleInstances }
