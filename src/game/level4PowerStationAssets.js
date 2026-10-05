// level4PowerStationAssets.js — Cape Town Power Station GLB for Steenbras (Level 4).

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

// Must stay a literal `new URL(..., import.meta.url)` so Vite bundles the GLB.
export const POWER_STATION_MODEL = new URL(
  '../../Characters/Level4Assets/CapeTownPowerStation.glb',
  import.meta.url
).href

/** Longest horizontal axis in world units — fits the Steenbras pad without covering the load deck. */
export const POWER_STATION_TARGET_SIZE = 16

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/** @type {THREE.Object3D | null} */
let template = null
/** @type {Promise<THREE.Object3D | null> | null} */
let inflight = null
/** @type {number | null} */
let cachedTargetSize = null

/**
 * Scale to target footprint, ground to y=0, centre horizontally.
 * @param {THREE.Object3D} root
 */
export function preparePowerStationModel(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxHoriz = Math.max(size.x, size.z, 0.001)
  root.scale.setScalar(POWER_STATION_TARGET_SIZE / maxHoriz)

  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  const center = grounded.getCenter(new THREE.Vector3())
  root.position.x -= center.x
  root.position.z -= center.z
  root.position.y -= grounded.min.y
  root.updateMatrixWorld(true)

  return root
}

/** @returns {Promise<THREE.Object3D | null>} */
export function loadPowerStationTemplate() {
  if (template && cachedTargetSize === POWER_STATION_TARGET_SIZE) {
    return Promise.resolve(template)
  }
  if (template && cachedTargetSize !== POWER_STATION_TARGET_SIZE) {
    disposePowerStationCache()
  }
  if (inflight) return inflight

  inflight = new Promise((resolve) => {
    gltfLoader.load(
      POWER_STATION_MODEL,
      (gltf) => {
        inflight = null
        try {
          template = preparePowerStationModel(gltf.scene)
          cachedTargetSize = POWER_STATION_TARGET_SIZE
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level4] Failed to prepare CapeTownPowerStation.glb', err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight = null
        if (import.meta.env.DEV) {
          console.warn('[Level4] Failed to load CapeTownPowerStation.glb', err)
        }
        resolve(null)
      }
    )
  })

  return inflight
}

export function preloadPowerStation() {
  return loadPowerStationTemplate()
}

/** @returns {THREE.Object3D | null} */
export function clonePowerStationInstance() {
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

export function disposePowerStationCache() {
  if (template) {
    disposeObject3D(template)
    template = null
  }
  inflight = null
  cachedTargetSize = null
}
