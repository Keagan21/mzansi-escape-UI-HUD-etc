// level4Ambient.js — Cape Town ambient pedestrians + street traffic (decor only).

import { BLOCK, LEVEL4_ANCHORS } from './level4City.js'
import { createCityAmbientLife } from './cityAmbientLife.js'

/** Sidewalk, curb, and travel-lane offsets for STREET_W = 14. */
const SW = 8
const CURB = 5.5
const LANE = 3.5

const spawnZ = LEVEL4_ANCHORS.spawn.z

/**
 * Ambient life near spawn and streets toward De Waal / Vodacom.
 * @param {import('three').Object3D} parent
 * @param {{ addCollider?: (c: object) => void }} [opts]
 */
export function createLevel4Ambient(parent, opts = {}) {
  return createCityAmbientLife(parent, {
    name: 'level4-ambient',
    addCollider: opts.addCollider,
    walkers: [
      { kind: 'adult', char: 'test-skater-m', pts: [[SW, spawnZ + 20], [SW, spawnZ - 20], [SW, 20]] },
      { kind: 'adult', char: 'test-skater-f', pts: [[-SW, spawnZ + 10], [-SW, 40], [-SW, 0]] },
      { kind: 'adult', char: 'athletic-lady', pts: [[SW, 60], [SW, 0], [SW, -BLOCK]] },
      { kind: 'kid', char: 'kid', pts: [[-SW, 70], [-SW, BLOCK], [-BLOCK - SW, BLOCK]] },
      { kind: 'adult', char: 'micheale', pts: [[SW, -20], [BLOCK + SW, -20], [BLOCK * 2 + SW, -20]] },
      { kind: 'adult', char: 'mousy', pts: [[-SW, -40], [-BLOCK - SW, -40], [-BLOCK * 2 - SW, -40]] },
      { kind: 'adult', char: 'test-criminal', pts: [[-BLOCK - SW, spawnZ], [-BLOCK - SW, BLOCK], [-BLOCK - SW, 0]] },
      { kind: 'kid', char: 'kid', pts: [[BLOCK + SW, spawnZ - 10], [BLOCK + SW, 40], [BLOCK + SW, -10]] },
      { kind: 'adult', char: 'test-cyborg-f', pts: [[8, -BLOCK * 2], [BLOCK - SW, -BLOCK * 2], [BLOCK * 2 - SW, -BLOCK * 2]] },
      { kind: 'adult', char: 'test-skater-m', pts: [[-SW, BLOCK * 2], [SW, BLOCK * 2], [BLOCK - SW, BLOCK * 2]] },
      { kind: 'adult', char: 'athletic-lady', pts: [[BLOCK * 2 + SW, 20], [BLOCK * 2 + SW, -BLOCK], [BLOCK * 2 + SW, -BLOCK * 2]] },
      { kind: 'kid', char: 'kid', pts: [[-BLOCK * 2 - SW, 60], [-BLOCK * 2 - SW, 0], [-BLOCK * 2 - SW, -BLOCK]] },
    ],
    standing: [
      { kind: 'adult', char: 'mousy', x: SW + 1.2, z: spawnZ - 4, ry: -1.1 },
      { kind: 'adult', char: 'micheale', x: -SW - 1.2, z: spawnZ + 2, ry: 1.3 },
      { kind: 'adult', char: 'athletic-lady', x: SW + 1.4, z: 46, ry: Math.PI },
      { kind: 'kid', char: 'kid', x: -SW - 1.1, z: 36, ry: 0.6 },
      { kind: 'adult', char: 'test-skater-f', x: BLOCK + SW + 1.2, z: 20, ry: -0.9 },
      { kind: 'adult', char: 'test-criminal', x: -BLOCK - SW - 1.3, z: 10, ry: 2.1 },
      { kind: 'adult', char: 'test-cyborg-f', x: SW + 1.3, z: -BLOCK + 8, ry: 2.8 },
    ],
    parkedCars: [
      { id: 'polo', source: 'player', x: CURB, z: spawnZ - 12, ry: 0 },
      { id: 'gusheshe', source: 'player', x: -CURB, z: spawnZ + 8, ry: Math.PI },
      { id: 'hilux', source: 'player', x: CURB, z: 40, ry: 0 },
      { id: 'mercedes', source: 'player', x: -CURB, z: 10, ry: Math.PI },
      { id: 'jmpd', source: 'player', x: BLOCK + CURB, z: 30, ry: 0 },
      { id: 'car', source: 'player', x: -BLOCK - CURB, z: 50, ry: Math.PI },
      { id: 'mazda', source: 'hazard', x: 22, z: CURB, ry: Math.PI / 2 },
      { id: 'suzuki', source: 'hazard', x: CURB, z: -BLOCK - 10, ry: 0 },
      { id: 'cherry', source: 'hazard', x: -CURB, z: -BLOCK * 2 + 12, ry: Math.PI },
    ],
    movingCars: [
      {
        id: 'polo',
        source: 'player',
        pts: [[LANE, 140], [LANE, -140]],
        speed: 7.0,
      },
      {
        id: 'gusheshe',
        source: 'player',
        pts: [[-LANE, -140], [-LANE, 140]],
        speed: 6.5,
      },
      {
        id: 'hilux',
        source: 'player',
        pts: [[BLOCK + LANE, 100], [BLOCK + LANE, -120]],
        speed: 6.8,
      },
      {
        id: 'mazda',
        source: 'hazard',
        pts: [[-BLOCK - LANE, -100], [-BLOCK - LANE, 110]],
        speed: 6.0,
      },
      {
        id: 'jmpd',
        source: 'player',
        pts: [[-100, BLOCK + LANE], [100, BLOCK + LANE]],
        speed: 6.9,
      },
      {
        id: 'suzuki',
        source: 'hazard',
        pts: [[100, -LANE], [-100, -LANE]],
        speed: 5.7,
      },
      {
        id: 'urus',
        source: 'player',
        pts: [[-80, -BLOCK + LANE], [80, -BLOCK + LANE]],
        speed: 7.4,
      },
    ],
  })
}
