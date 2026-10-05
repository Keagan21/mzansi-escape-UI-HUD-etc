// level3ParkStationAssets.js — Draco-compressed Park Station GLB for Level 3.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

export const PARK_STATION_MODEL = new URL(
  '../../Characters/Level3Assets/ParkStation.glb',
  import.meta.url
).href

/** World-space footprint target — ~0.8 city blocks (BLOCK=46); was 120, then 50. */
export const PARK_STATION_TARGET_SIZE = 36

/** Win when the player is this close to the station footprint edge (world units). */
export const PARK_STATION_WIN_REACH = 6

/**
 * Distance from a point to the nearest edge of an axis-aligned footprint.
 * @param {number} px
 * @param {number} pz
 * @param {number} cx
 * @param {number} cz
 * @param {number} hw
 * @param {number} hd
 */
export function distanceToFootprint(px, pz, cx, cz, hw, hd) {
  const dx = Math.max(0, Math.abs(px - cx) - hw)
  const dz = Math.max(0, Math.abs(pz - cz) - hd)
  return Math.hypot(dx, dz)
}

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/** @type {import('three').Object3D | null} */
let template = null
/** @type {Promise<import('three').Object3D | null> | null} */
let inflight = null
/** @type {number | null} */
let cachedTargetSize = null

/**
 * @param {import('three').Object3D} root
 */
export function prepareParkStationModel(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      o.frustumCulled = false
    }
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxHoriz = Math.max(size.x, size.z, 0.001)
  const s = PARK_STATION_TARGET_SIZE / maxHoriz
  root.scale.setScalar(s)
  root.position.set(0, 0, 0)
  root.updateMatrixWorld(true)

  const scaled = new THREE.Box3().setFromObject(root)
  const center = scaled.getCenter(new THREE.Vector3())
  root.position.x = -center.x
  root.position.z = -center.z
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  root.position.y = -grounded.min.y
  root.updateMatrixWorld(true)

  return root
}

/** @returns {Promise<import('three').Object3D | null>} */
export function loadParkStationTemplate() {
  if (template && cachedTargetSize === PARK_STATION_TARGET_SIZE) {
    return Promise.resolve(template)
  }
  if (template && cachedTargetSize !== PARK_STATION_TARGET_SIZE) {
    disposeParkStationCache()
  }
  if (inflight) return inflight

  inflight = new Promise((resolve) => {
    gltfLoader.load(
      PARK_STATION_MODEL,
      (gltf) => {
        inflight = null
        try {
          template = prepareParkStationModel(gltf.scene)
          cachedTargetSize = PARK_STATION_TARGET_SIZE
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level3] Failed to prepare Park Station model', err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight = null
        if (import.meta.env.DEV) {
          console.warn('[Level3] Failed to load Park Station GLB', PARK_STATION_MODEL, err)
        }
        resolve(null)
      }
    )
  })

  return inflight
}

export function preloadParkStation() {
  return loadParkStationTemplate()
}

/** @returns {import('three').Object3D | null} */
export function cloneParkStationInstance() {
  if (!template) return null
  const inst = template.clone(true)
  inst.traverse((o) => {
    if (!o.isMesh) return
    if (o.geometry) o.geometry = o.geometry.clone()
    if (Array.isArray(o.material)) {
      o.material = o.material.map((m) => m.clone())
    } else if (o.material) {
      o.material = o.material.clone()
    }
  })
  return inst
}

export function disposeParkStationCache() {
  if (template) {
    disposeObject3D(template)
    template = null
  }
  inflight = null
  cachedTargetSize = null
}
