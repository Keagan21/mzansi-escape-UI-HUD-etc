// corridorManager.js — Scrolling corridor segments, poles, wires, shadow pooling.

import * as THREE from 'three'
import { getRandomBuilding } from '../BuildingFactory.js'
import {
  CORRIDOR_SEGMENT_LEN,
  CORRIDOR_SEGMENTS_PER_SIDE,
  LANES,
  ROAD_W,
  STATIC_SHADOW_ACTIVE_RANGE,
} from './gameConstants.js'
import { CORRIDOR_BILLBOARD_ADS, createBillboard } from './level3Billboards.js'
import { disposeObject3D } from './threeDispose.js'

function createCorridorSegment(side, materials, laneWidth, theme, billboardAd) {
  const segment = new THREE.Group()
  const sideSign = side < 0 ? -1 : 1
  const buildingX = sideSign * (laneWidth * 1.5 + 4)
  const poleX = sideSign * (Math.abs(buildingX) - 3)
  const secondaryBuildingOffsetZ = 7
  const shadowMeshes = []
  /** @type {THREE.Mesh[]} */
  const billboardPanels = []

  const primaryBuilding = getRandomBuilding(theme)
  primaryBuilding.position.set(buildingX, 0, 0)
  primaryBuilding.traverse((obj) => {
    if (obj.isMesh) shadowMeshes.push(obj)
  })
  segment.add(primaryBuilding)

  const secondaryBuilding = getRandomBuilding(theme)
  secondaryBuilding.position.set(buildingX, 0, secondaryBuildingOffsetZ)
  secondaryBuilding.traverse((obj) => {
    if (obj.isMesh) shadowMeshes.push(obj)
  })
  segment.add(secondaryBuilding)

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 7, 12),
    materials.pole
  )
  pole.position.set(poleX, 3.5, 0)
  pole.castShadow = true
  segment.add(pole)

  const crossbar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.5, 10),
    materials.pole
  )
  crossbar.rotation.z = Math.PI / 2
  crossbar.position.set(poleX, 6.15, 0)
  crossbar.castShadow = true
  segment.add(crossbar)

  const poleTopLocal = new THREE.Vector3(poleX, 6.95, 0)
  const wireTo = poleTopLocal.clone()
  wireTo.z -= CORRIDOR_SEGMENT_LEN
  const wireMid = poleTopLocal.clone().lerp(wireTo, 0.5)
  wireMid.y -= 0.55
  const wire = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([poleTopLocal, wireMid, wireTo]),
    materials.wire
  )
  segment.add(wire)

  if (billboardAd) {
    const board = createBillboard(billboardAd, { variant: 'roadside', lights: false, emissive: 0.48 })
    // Angle toward oncoming traffic so the face reads down the corridor,
    // instead of sitting edge-on to the chase camera.
    board.position.set(sideSign * (ROAD_W / 2 + 1.65), 0, 3.5)
    board.rotation.y = sideSign > 0 ? -Math.PI / 2 + 0.9 : Math.PI / 2 - 0.9
    segment.add(board)
    const panel = board.userData.billboardPanel
    if (panel) billboardPanels.push(panel)
  }

  segment.userData.shadowMeshes = shadowMeshes
  segment.userData.billboardPanels = billboardPanels
  segment.userData.shadowsEnabled = true
  return segment
}

export function createCorridorManager(scene, materials, theme = 'soweto') {
  const laneWidth = Math.abs(LANES[1] - LANES[0])
  const group = new THREE.Group()
  scene.add(group)

  const sideData = {
    left: { segments: [], side: -1 },
    right: { segments: [], side: 1 },
  }

  const initialZs = []
  for (let i = 0; i < CORRIDOR_SEGMENTS_PER_SIDE; i++) {
    if (i < 4) initialZs.push(-i * CORRIDOR_SEGMENT_LEN)
    else initialZs.push((i - 3) * CORRIDOR_SEGMENT_LEN)
  }

  const setupSide = (target) => {
    for (let i = 0; i < CORRIDOR_SEGMENTS_PER_SIDE; i++) {
      const adOffset = target.side < 0 ? 0 : 6
      const ad =
        i % 2 === 1
          ? CORRIDOR_BILLBOARD_ADS[(i + adOffset) % CORRIDOR_BILLBOARD_ADS.length]
          : null
      const seg = createCorridorSegment(target.side, materials, laneWidth, theme, ad)
      seg.position.z = initialZs[i]
      group.add(seg)
      target.segments.push(seg)
    }
  }

  setupSide(sideData.left)
  setupSide(sideData.right)

  const updateSide = (target, scrollSpeed, dt, playerZ) => {
    if (scrollSpeed !== 0) {
      for (const seg of target.segments) seg.position.z += scrollSpeed * dt
    }
    if (scrollSpeed > 0) {
      for (const seg of target.segments) {
        if (seg.position.z > playerZ + CORRIDOR_SEGMENT_LEN * 2) {
          let minZ = Infinity
          for (const s of target.segments) minZ = Math.min(minZ, s.position.z)
          seg.position.z = minZ - CORRIDOR_SEGMENT_LEN
        }
      }
    } else if (scrollSpeed < 0) {
      for (const seg of target.segments) {
        if (seg.position.z < playerZ - CORRIDOR_SEGMENT_LEN * 6) {
          let maxZ = -Infinity
          for (const s of target.segments) maxZ = Math.max(maxZ, s.position.z)
          seg.position.z = maxZ + CORRIDOR_SEGMENT_LEN
        }
      }
    }

    for (const from of target.segments) {
      const shadowsOn =
        Math.abs(from.position.z - playerZ) < STATIC_SHADOW_ACTIVE_RANGE
      if (from.userData.shadowsEnabled !== shadowsOn) {
        from.userData.shadowsEnabled = shadowsOn
        for (const mesh of from.userData.shadowMeshes) {
          mesh.castShadow = shadowsOn
        }
      }
    }
  }

  let boardPulseT = 0

  return {
    group,
    laneWidth,
    roadEdgeX: ROAD_W / 2,
    reset() {
      for (let i = 0; i < CORRIDOR_SEGMENTS_PER_SIDE; i++) {
        sideData.left.segments[i].position.z = initialZs[i]
        sideData.right.segments[i].position.z = initialZs[i]
      }
    },
    update(scrollSpeed, dt, playerZ) {
      updateSide(sideData.left, scrollSpeed, dt, playerZ)
      updateSide(sideData.right, scrollSpeed, dt, playerZ)
      boardPulseT += dt
      const pulse = 0.42 + Math.sin(boardPulseT * 1.5) * 0.08
      for (const side of [sideData.left, sideData.right]) {
        for (const seg of side.segments) {
          for (const panel of seg.userData.billboardPanels ?? []) {
            panel.material.emissiveIntensity = pulse
          }
        }
      }
    },
    dispose() {
      disposeObject3D(group)
      scene.remove(group)
    },
  }
}
