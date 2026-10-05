// level4McDonaldsAssets.js — McDonald's restaurant GLB placed in the Level 4 city.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

// Must stay a literal `new URL(..., import.meta.url)` so Vite bundles the GLB.
export const MCDONALDS_MODEL = new URL(
  '../../Characters/Level4Assets/McDonalds.glb',
  import.meta.url
).href

/** Longest horizontal axis in world units. */
export const MCDONALDS_TARGET_SIZE = 16

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/** @type {THREE.Object3D | null} */
let template = null
/** @type {Promise<THREE.Object3D | null> | null} */
let inflight = null

/**
 * Scale to the street footprint, ground to y=0, centre horizontally.
 * @param {THREE.Object3D} root
 */
export function prepareMcDonaldsModel(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxHoriz = Math.max(size.x, size.z, 0.001)
  root.scale.setScalar(MCDONALDS_TARGET_SIZE / maxHoriz)

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
export function loadMcDonaldsTemplate() {
  if (template) return Promise.resolve(template)
  if (inflight) return inflight

  inflight = new Promise((resolve) => {
    gltfLoader.load(
      MCDONALDS_MODEL,
      (gltf) => {
        inflight = null
        try {
          template = prepareMcDonaldsModel(gltf.scene)
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level4] Failed to prepare McDonalds.glb', err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight = null
        if (import.meta.env.DEV) {
          console.warn('[Level4] Failed to load McDonalds.glb', err)
        }
        resolve(null)
      }
    )
  })

  return inflight
}

/** @returns {THREE.Object3D | null} */
export function cloneMcDonaldsInstance() {
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

export function disposeMcDonaldsCache() {
  if (template) {
    disposeObject3D(template)
    template = null
  }
  inflight = null
}
