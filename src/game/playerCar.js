// playerCar.js — Procedural fallback car mesh and motion for level 2.

import * as THREE from 'three'
import { PLAYER_CAR_FACING_Y } from './gameConstants.js'

const BODY_COLOR = 0xd62828
const CABIN_COLOR = 0x1d1d24
const TRIM_COLOR = 0xf4f4f0
const WHEEL_COLOR = 0x111116

/**
 * @returns {THREE.Group}
 */
export function createPlayerCar() {
  const car = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({
    color: BODY_COLOR,
    roughness: 0.42,
    metalness: 0.18,
  })
  const cabinMat = new THREE.MeshStandardMaterial({
    color: CABIN_COLOR,
    roughness: 0.55,
    metalness: 0.12,
  })
  const trimMat = new THREE.MeshStandardMaterial({
    color: TRIM_COLOR,
    roughness: 0.35,
    metalness: 0.05,
  })
  const wheelMat = new THREE.MeshStandardMaterial({
    color: WHEEL_COLOR,
    roughness: 0.9,
    metalness: 0.05,
  })

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 2.45), bodyMat)
  body.position.y = 0.36
  body.castShadow = true

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.38, 1.15), cabinMat)
  cabin.position.set(0, 0.72, -0.12)
  cabin.castShadow = true

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.72), trimMat)
  hood.position.set(0, 0.58, 0.78)
  hood.castShadow = true

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.14, 0.18), trimMat)
  bumper.position.set(0, 0.24, 1.28)
  bumper.castShadow = true

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16)
  const wheelOffsets = [
    [-0.62, 0.22, 0.78],
    [0.62, 0.22, 0.78],
    [-0.62, 0.22, -0.78],
    [0.62, 0.22, -0.78],
  ]
  for (const [x, y, z] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, y, z)
    wheel.castShadow = true
    car.add(wheel)
  }

  car.add(body, cabin, hood, bumper)
  car.rotation.y = PLAYER_CAR_FACING_Y
  return car
}

/**
 * @param {number} t
 * @param {boolean} moving
 */
export function carMotionOffset(t, moving) {
  if (!moving) return 0
  return 0.02 * Math.sin(t * 18)
}
