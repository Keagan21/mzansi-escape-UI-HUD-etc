// level8Water.js — Rising flood zones, currents, and soak tests for Level 8.

export const LEVEL8_SHALLOW_MIN = 0.25
export const LEVEL8_DEEP_MIN = 0.7
export const LEVEL8_SHALLOW_SPEED = 0.55
export const LEVEL8_SOAK_HOLD = 1.2
export const LEVEL8_CURRENT_SOAK_HOLD = 0.8
export const LEVEL8_WASH_SECONDS = 1.2
export const LEVEL8_CURRENT_PUSH = 5.2
export const LEVEL8_RAIN_WINDOW_S = 240

/**
 * AABB flood patches. `minStage` is when the patch becomes wet.
 * `current` is a ground-plane push (x, z).
 * @type {{ id: string, minX: number, maxX: number, minZ: number, maxZ: number, minStage: number, height: number, current?: { x: number, z: number } }[]}
 */
export const LEVEL8_WATER_ZONES = [
  {
    id: 'canal',
    minX: 62,
    maxX: 78,
    minZ: -92,
    maxZ: 92,
    minStage: 0,
    height: 0.95,
    current: { x: 0, z: 4.5 },
  },
  {
    id: 'lowA',
    minX: 14,
    maxX: 74,
    minZ: 12,
    maxZ: 26,
    minStage: 1,
    height: 0.82,
    current: { x: 3.8, z: 0 },
  },
  {
    id: 'lowB',
    minX: -74,
    maxX: -14,
    minZ: -38,
    maxZ: -22,
    minStage: 2,
    height: 0.85,
    current: { x: -3.4, z: 0 },
  },
  {
    id: 'swellEast',
    minX: 12,
    maxX: 60,
    minZ: -80,
    maxZ: -64,
    minStage: 3,
    height: 0.9,
    current: { x: -1.2, z: 3.2 },
  },
  {
    id: 'swellWest',
    minX: -60,
    maxX: -12,
    minZ: -80,
    maxZ: -64,
    minStage: 3,
    height: 0.9,
    current: { x: 1.2, z: 3.2 },
  },
]

/** @param {typeof LEVEL8_WATER_ZONES[0]} zone @param {number} x @param {number} z */
function inZone(zone, x, z) {
  return x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} stage
 */
export function sampleWater(x, z, stage) {
  let height = 0
  let currentX = 0
  let currentZ = 0
  let inCurrent = false
  for (const zone of LEVEL8_WATER_ZONES) {
    if (stage < zone.minStage || !inZone(zone, x, z)) continue
    if (zone.height > height) height = zone.height
    if (zone.current) {
      currentX += zone.current.x
      currentZ += zone.current.z
      inCurrent = true
    }
  }
  return {
    height,
    currentX,
    currentZ,
    inCurrent,
    shallow: height >= LEVEL8_SHALLOW_MIN && height < LEVEL8_DEEP_MIN,
    deep: height >= LEVEL8_DEEP_MIN,
  }
}

export function createSoakTracker() {
  let deepT = 0
  let currentT = 0
  let washT = 0
  return {
    /** @param {ReturnType<typeof sampleWater>} sample @param {number} dt */
    tick(sample, dt) {
      if (washT > 0) {
        washT = Math.max(0, washT - dt)
        return { soaking: true, washed: washT <= 0, washT }
      }
      if (sample.deep) deepT += dt
      else deepT = 0
      if (sample.inCurrent && sample.height >= LEVEL8_SHALLOW_MIN) currentT += dt
      else currentT = 0
      const trip =
        deepT >= LEVEL8_SOAK_HOLD ||
        (sample.inCurrent && currentT >= LEVEL8_CURRENT_SOAK_HOLD && sample.height >= LEVEL8_DEEP_MIN)
      if (trip) {
        washT = LEVEL8_WASH_SECONDS
        deepT = 0
        currentT = 0
        return { soaking: true, washed: false, washT }
      }
      return { soaking: false, washed: false, washT: 0 }
    },
    reset() {
      deepT = 0
      currentT = 0
      washT = 0
    },
    isWashing() {
      return washT > 0
    },
  }
}
