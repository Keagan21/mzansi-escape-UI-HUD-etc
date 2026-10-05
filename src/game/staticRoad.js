// staticRoad.js — Asphalt, grass, lane markings, rails (buildStaticRoad).

import * as THREE from 'three'
import {
  LANES,
  LEVEL_END_Z,
  ROAD_LEN,
  ROAD_VISUAL_EXTENSION,
  ROAD_W,
} from './gameConstants.js'
import { buildNextLevelSign } from './roadSign.js'
import { buildBillboards, CORRIDOR_BILLBOARD_ADS } from './level3Billboards.js'

export function buildStaticRoad(group, m) {
  const y = 0
  const h = 0.035
  const lineY = y + 0.02
  const L = ROAD_LEN
  const ext = ROAD_VISUAL_EXTENSION
  const totalLen = L + ext
  /** Matches asphalt / grass shift so markings cover the full extended road. */
  const roadCenterZ = -ext / 2
  const roadZMin = roadCenterZ - totalLen / 2
  const roadZMax = roadCenterZ + totalLen / 2

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, totalLen),
    m.asphalt
  )
  road.rotation.x = -Math.PI / 2
  road.position.set(0, y, roadCenterZ)
  road.receiveShadow = true
  group.add(road)

  const grassW = 32
  for (const s of [-1, 1]) {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(grassW, totalLen + 2),
      m.grass
    )
    g.rotation.x = -Math.PI / 2
    g.position.set(
      s * (ROAD_W / 2 + grassW / 2 + 0.01),
      y - 0.015,
      roadCenterZ
    )
    g.receiveShadow = true
    group.add(g)
  }

  for (const x of [-(ROAD_W / 2) + 0.2, ROAD_W / 2 - 0.2]) {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, h, totalLen - 0.4),
      m.line
    )
    w.position.set(x, lineY, roadCenterZ)
    group.add(w)
  }

  const dashZStep = 4.2
  const dashLen = 1.6
  const dashHalfLen = dashLen / 2
  const dashXs = [-1.16, 1.16]
  const dashZs = []
  for (
    let z = roadZMin + dashHalfLen + 0.2;
    z <= roadZMax - dashHalfLen - 0.2;
    z += dashZStep
  ) {
    dashZs.push(z)
  }
  const dashCount = dashXs.length * dashZs.length
  const dashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, h, dashLen),
    m.line,
    dashCount
  )
  const dashDummy = new THREE.Object3D()
  let dashIndex = 0
  for (const x of dashXs) {
    for (const z of dashZs) {
      dashDummy.position.set(x, lineY, z)
      dashDummy.updateMatrix()
      dashes.setMatrixAt(dashIndex++, dashDummy.matrix)
    }
  }
  dashes.instanceMatrix.needsUpdate = true
  dashes.castShadow = false
  dashes.receiveShadow = false
  group.add(dashes)

  for (const lx of [LANES[0] - 0.45, LANES[2] + 0.45]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, totalLen - 2),
      m.rail
    )
    rail.position.set(lx, 0.07, roadCenterZ)
    group.add(rail)
  }

  const signWorldZ = LEVEL_END_Z + 28
  const signLocalZ = signWorldZ + ROAD_LEN / 2
  buildNextLevelSign(group, { localZ: signLocalZ, side: 1, text: 'Next Level 2' })

  // Tall ads on the grass behind the shop line so they read over rooftops
  // as the player runs / drives the full 2 km corridor.
  const highwayX = ROAD_W / 2 + 9.2
  /** @type {{ x: number, z: number, rotationY: number }[]} */
  const highwaySpots = []
  let boardI = 0
  for (let worldZ = -48; worldZ > LEVEL_END_Z + 60; worldZ -= 150) {
    const side = boardI % 2 === 0 ? 1 : -1
    highwaySpots.push({
      x: side * highwayX,
      z: worldZ + ROAD_LEN / 2,
      rotationY: 0,
    })
    boardI += 1
  }
  const roadBillboards = buildBillboards(group, highwaySpots, CORRIDOR_BILLBOARD_ADS, {
    name: 'road-billboards',
    variant: 'city',
    emissive: 0.5,
  })
  group.userData.roadBillboards = roadBillboards
}
