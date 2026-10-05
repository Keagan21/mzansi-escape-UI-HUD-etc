// level3Ambient.js — Joburg CBD ambient pedestrians + street traffic (decor only).

import { BLOCK } from './level3City.js'
import { createCityAmbientLife } from './cityAmbientLife.js'

/** Sidewalk, curb, and travel-lane offsets for STREET_W = 14. */
const SW = 8
const CURB = 5.5
const LANE = 3.5

/**
 * Ambient life concentrated on main avenues near spawn (z≈60) and Park Station approach.
 * @param {import('three').Object3D} parent
 * @param {{ addCollider?: (c: object) => void }} [opts]
 */
export function createLevel3Ambient(parent, opts = {}) {
  return createCityAmbientLife(parent, {
    name: 'level3-ambient',
    addCollider: opts.addCollider,
    walkers: [
      { kind: 'adult', char: 'test-skater-m', pts: [[SW, 92], [SW, 46], [SW, 0]] },
      { kind: 'adult', char: 'test-skater-f', pts: [[-SW, 100], [-SW, 60], [-SW, 20]] },
      { kind: 'adult', char: 'test-criminal', pts: [[SW, 70], [SW, 46], [BLOCK + SW, 46]] },
      { kind: 'kid', char: 'kid', pts: [[-SW, 80], [-SW, 46], [-BLOCK - SW, 46]] },
      { kind: 'adult', char: 'athletic-lady', pts: [[SW, 30], [SW, -20], [SW, -60]] },
      { kind: 'adult', char: 'micheale', pts: [[-SW, 10], [-SW, -40], [-SW, -80]] },
      { kind: 'adult', char: 'mousy', pts: [[8, BLOCK], [BLOCK - SW, BLOCK], [BLOCK * 2 - SW, BLOCK]] },
      { kind: 'kid', char: 'kid', pts: [[-8, 0], [-BLOCK + SW, 0], [-BLOCK * 2 + SW, 0]] },
      { kind: 'adult', char: 'test-cyborg-f', pts: [[SW, -BLOCK], [SW, -BLOCK * 2], [BLOCK + SW, -BLOCK * 2]] },
      { kind: 'adult', char: 'test-skater-m', pts: [[BLOCK + SW, 92], [BLOCK + SW, 46], [BLOCK + SW, 0]] },
      { kind: 'kid', char: 'kid', pts: [[-BLOCK - SW, 70], [-BLOCK - SW, 20], [-BLOCK - SW, -20]] },
      { kind: 'adult', char: 'athletic-lady', pts: [[-SW, BLOCK * 2], [SW, BLOCK * 2], [BLOCK - SW, BLOCK * 2]] },
      { kind: 'adult', char: 'micheale', pts: [[BLOCK * 2 + SW, 46], [BLOCK * 2 + SW, 0], [BLOCK * 2 + SW, -46]] },
    ],
    standing: [
      { kind: 'adult', char: 'test-skater-f', x: SW + 1.2, z: 62, ry: -1.2 },
      { kind: 'adult', char: 'mousy', x: -SW - 1.2, z: 58, ry: 1.4 },
      { kind: 'adult', char: 'athletic-lady', x: SW + 1.4, z: 46 + 10, ry: Math.PI },
      { kind: 'adult', char: 'micheale', x: -SW - 1.4, z: 46 - 8, ry: 0.4 },
      { kind: 'kid', char: 'kid', x: SW + 1.1, z: 28, ry: 2.2 },
      { kind: 'adult', char: 'test-criminal', x: -SW - 1.3, z: 8, ry: -2.5 },
      { kind: 'adult', char: 'test-cyborg-f', x: BLOCK + SW + 1.2, z: 50, ry: -0.8 },
      { kind: 'kid', char: 'kid', x: -BLOCK - SW - 1.1, z: 42, ry: 1.1 },
    ],
    parkedCars: [
      { id: 'polo', source: 'player', x: CURB, z: 78, ry: 0 },
      { id: 'gusheshe', source: 'player', x: -CURB, z: 52, ry: Math.PI },
      { id: 'jmpd', source: 'player', x: CURB, z: 20, ry: 0 },
      { id: 'car', source: 'player', x: -CURB, z: -10, ry: Math.PI },
      { id: 'hilux', source: 'player', x: CURB, z: -52, ry: 0 },
      { id: 'mercedes', source: 'player', x: BLOCK + CURB, z: 40, ry: 0 },
      { id: 'mazda', source: 'hazard', x: 18, z: BLOCK + CURB, ry: Math.PI / 2 },
      { id: 'suzuki', source: 'hazard', x: -CURB, z: BLOCK * 2 - 8, ry: Math.PI },
      { id: 'cherry', source: 'hazard', x: -BLOCK - CURB, z: 30, ry: Math.PI },
      { id: 'raptor', source: 'player', x: CURB, z: -BLOCK - 20, ry: 0 },
    ],
    movingCars: [
      {
        id: 'polo',
        source: 'player',
        pts: [[LANE, 138], [LANE, -138]],
        speed: 7.2,
      },
      {
        id: 'gusheshe',
        source: 'player',
        pts: [[-LANE, -138], [-LANE, 138]],
        speed: 6.6,
      },
      {
        id: 'hilux',
        source: 'player',
        pts: [[BLOCK + LANE, 120], [BLOCK + LANE, -100]],
        speed: 6.9,
      },
      {
        id: 'mazda',
        source: 'hazard',
        pts: [[-BLOCK - LANE, -100], [-BLOCK - LANE, 120]],
        speed: 6.1,
      },
      {
        id: 'jmpd',
        source: 'player',
        pts: [[-120, BLOCK + LANE], [120, BLOCK + LANE]],
        speed: 7.0,
      },
      {
        id: 'suzuki',
        source: 'hazard',
        pts: [[120, -LANE], [-120, -LANE]],
        speed: 5.8,
      },
      {
        id: 'car',
        source: 'player',
        pts: [[-90, -BLOCK + LANE], [90, -BLOCK + LANE]],
        speed: 6.4,
      },
      {
        id: 'cherry',
        source: 'hazard',
        pts: [[BLOCK * 2 + LANE, 80], [BLOCK * 2 + LANE, -60]],
        speed: 5.9,
      },
    ],
  })
}
