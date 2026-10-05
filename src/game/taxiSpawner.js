// taxiSpawner.js — Spawn a taxi instance ahead of the player on a lane.

import { cloneTaxiInstance } from './modelPrep.js'
import {
  LANES,
  TAXI_SPAWN_AHEAD_MAX,
  TAXI_SPAWN_AHEAD_MIN,
  TAXI_YAW_Y,
} from './gameConstants.js'

export function spawnTaxi(scene, template, playerZ, existing) {
  const lane = (Math.random() * 3) | 0
  let z = playerZ - TAXI_SPAWN_AHEAD_MIN - Math.random() * (TAXI_SPAWN_AHEAD_MAX - TAXI_SPAWN_AHEAD_MIN)
  for (let k = 0; k < 8; k++) {
    const clash = existing.some((t) => {
      const tz = t.group.position.z
      return Math.abs(tz - z) < 18 && t.lane === lane
    })
    if (!clash) break
    z = playerZ - TAXI_SPAWN_AHEAD_MIN - Math.random() * 20
  }
  const inst = cloneTaxiInstance(template)
  inst.position.set(LANES[lane], 0, z)
  inst.rotation.set(0, TAXI_YAW_Y, 0)
  scene.add(inst)
  return { group: inst, lane, passed: false }
}
