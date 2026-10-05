// level5StadiumAssets.js — Cape Town Stadium GLB for Level 5 win landmark.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

// Must stay a literal `new URL(..., import.meta.url)` so Vite bundles the GLB.
export const CAPE_TOWN_STADIUM_MODEL = new URL(
  '../../Characters/Level5Assets/CapeTownStadium.glb',
  import.meta.url
).href

/** Longest horizontal axis in world units — matches the old procedural ~42×32 pad. */
export const CAPE_TOWN_STADIUM_TARGET_SIZE = 48

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
export function prepareCapeTownStadiumModel(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxHoriz = Math.max(size.x, size.z, 0.001)
  root.scale.setScalar(CAPE_TOWN_STADIUM_TARGET_SIZE / maxHoriz)

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
export function loadCapeTownStadiumTemplate() {
  if (template && cachedTargetSize === CAPE_TOWN_STADIUM_TARGET_SIZE) {
    return Promise.resolve(template)
  }
  if (template && cachedTargetSize !== CAPE_TOWN_STADIUM_TARGET_SIZE) {
    disposeCapeTownStadiumCache()
  }
  if (inflight) return inflight

  inflight = new Promise((resolve) => {
    gltfLoader.load(
      CAPE_TOWN_STADIUM_MODEL,
      (gltf) => {
        inflight = null
        try {
          template = prepareCapeTownStadiumModel(gltf.scene)
          cachedTargetSize = CAPE_TOWN_STADIUM_TARGET_SIZE
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level5] Failed to prepare CapeTownStadium.glb', err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight = null
        if (import.meta.env.DEV) {
          console.warn('[Level5] Failed to load CapeTownStadium.glb', err)
        }
        resolve(null)
      }
    )
  })

  return inflight
}

export function preloadCapeTownStadium() {
  return loadCapeTownStadiumTemplate()
}

/** @returns {THREE.Object3D | null} */
export function cloneCapeTownStadiumInstance() {
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

export function disposeCapeTownStadiumCache() {
  if (template) {
    disposeObject3D(template)
    template = null
  }
  inflight = null
  cachedTargetSize = null
}
