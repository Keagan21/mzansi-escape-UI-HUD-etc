// potholes.js — Random pothole placement data for the static road mesh.

import * as THREE from 'three'
import {
  LANES,
  LOW_SPEC_RENDERING,
  POTHOLE_COUNT,
  POTHOLE_HALF_X,
  POTHOLE_HALF_Z,
  POTHOLE_MAX_TRIES,
  POTHOLE_Z_FAR,
  POTHOLE_Z_NEAR,
} from './gameConstants.js'

/**
 * Random pothole placements; spacing in Z on the same lane to reduce overlap.
 * @returns {{ x: number, z: number, halfX: number, halfZ: number }[]}
 */
export function buildPotholeData() {
  const list = []
  const byLaneZ = { 0: [], 1: [], 2: [] }
  const halfX = POTHOLE_HALF_X
  const halfZ = POTHOLE_HALF_Z
  const minGap = 5.2

  for (let n = 0; n < POTHOLE_MAX_TRIES && list.length < POTHOLE_COUNT; n++) {
    const lane = (Math.random() * 3) | 0
    const z = POTHOLE_Z_FAR + Math.random() * (POTHOLE_Z_NEAR - POTHOLE_Z_FAR)
    const x = LANES[lane] + (Math.random() - 0.5) * 0.55
    const zList = byLaneZ[lane]
    if (zList.some((zz) => Math.abs(zz - z) < minGap)) continue
    zList.push(z)
    list.push({ x, z, halfX, halfZ })
  }
  return list
}

const _potholeQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0)
)
const _potholePos = new THREE.Vector3()
const _potholeScl = new THREE.Vector3()
const _potholeMatrix = new THREE.Matrix4()

/**
 * Instanced pothole discs + rims (two draw calls instead of one mesh per hole).
 * @returns {{ group: THREE.Group, discs: THREE.InstancedMesh, rims: THREE.InstancedMesh, potholeMat: THREE.Material, potholeRimMat: THREE.Material }}
 */
export function createPotholeMeshes(potholeData) {
  const count = potholeData.length
  const segments = LOW_SPEC_RENDERING ? 16 : 22
  const potholeMat = new THREE.MeshStandardMaterial({
    color: 0x16161c,
    roughness: 0.95,
    metalness: 0.06,
  })
  const potholeRimMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0d,
    roughness: 0.92,
    metalness: 0.04,
  })
  const discs = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, segments),
    potholeMat,
    count
  )
  const rims = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.38, 1, segments),
    potholeRimMat,
    count
  )
  discs.receiveShadow = true
  rims.receiveShadow = true

  for (let i = 0; i < count; i++) {
    const ph = potholeData[i]
    _potholePos.set(ph.x, 0.012, ph.z)
    _potholeScl.set(ph.halfX, ph.halfZ, 1)
    _potholeMatrix.compose(_potholePos, _potholeQuat, _potholeScl)
    discs.setMatrixAt(i, _potholeMatrix)
    _potholePos.set(ph.x, 0.014, ph.z)
    _potholeMatrix.compose(_potholePos, _potholeQuat, _potholeScl)
    rims.setMatrixAt(i, _potholeMatrix)
  }
  discs.instanceMatrix.needsUpdate = true
  rims.instanceMatrix.needsUpdate = true

  const group = new THREE.Group()
  group.add(discs, rims)
  return { group, discs, rims, potholeMat, potholeRimMat }
}

export function disposePotholeMeshes({ discs, rims, potholeMat, potholeRimMat }) {
  discs.geometry.dispose()
  rims.geometry.dispose()
  potholeMat.dispose()
  potholeRimMat.dispose()
}
