// level4VodacomAssets.js — Vodacom Building GLB for Level 4 win destination.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

// Must stay a literal `new URL(..., import.meta.url)` so Vite bundles the GLB.
export const VODACOM_BUILDING_MODEL = new URL(
  '../../Characters/Level4Assets/VodacomBuilding.glb',
  import.meta.url
).href

/** Longest horizontal axis in world units — reads as a landmark without eating the approach. */
export const VODACOM_BUILDING_TARGET_SIZE = 28

/** Win when the player is this close to the building centre (world units). */
export const VODACOM_WIN_REACH = 12

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
export function prepareVodacomBuildingModel(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxHoriz = Math.max(size.x, size.z, 0.001)
  root.scale.setScalar(VODACOM_BUILDING_TARGET_SIZE / maxHoriz)

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
export function loadVodacomBuildingTemplate() {
  if (template && cachedTargetSize === VODACOM_BUILDING_TARGET_SIZE) {
    return Promise.resolve(template)
  }
  if (template && cachedTargetSize !== VODACOM_BUILDING_TARGET_SIZE) {
    disposeVodacomBuildingCache()
  }
  if (inflight) return inflight

  inflight = new Promise((resolve) => {
    gltfLoader.load(
      VODACOM_BUILDING_MODEL,
      (gltf) => {
        inflight = null
        try {
          template = prepareVodacomBuildingModel(gltf.scene)
          cachedTargetSize = VODACOM_BUILDING_TARGET_SIZE
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level4] Failed to prepare VodacomBuilding.glb', err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight = null
        if (import.meta.env.DEV) {
          console.warn('[Level4] Failed to load VodacomBuilding.glb', err)
        }
        resolve(null)
      }
    )
  })

  return inflight
}

export function preloadVodacomBuilding() {
  return loadVodacomBuildingTemplate()
}

/** @returns {THREE.Object3D | null} */
export function cloneVodacomBuildingInstance() {
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

export function disposeVodacomBuildingCache() {
  if (template) {
    disposeObject3D(template)
    template = null
  }
  inflight = null
  cachedTargetSize = null
}
