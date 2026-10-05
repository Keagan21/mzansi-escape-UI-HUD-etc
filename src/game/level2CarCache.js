// level2CarCache.js — Cached Level 2 player car GLBs (shared Draco decoder, no dispose-on-switch).

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { LEVEL2_PLAYER_CARS } from './level2CarAssets.js'
import { clonePlayerCarInstance, preparePlayerCarModel } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/** @type {Map<string, import('three').Object3D>} */
const templates = new Map()
/** @type {Map<string, Promise<import('three').Object3D | null>>} */
const inflight = new Map()

/**
 * @param {string} carId
 * @returns {Promise<import('three').Object3D | null>}
 */
export function loadLevel2CarTemplate(carId) {
  const cached = templates.get(carId)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(carId)
  if (pending) return pending

  const def = LEVEL2_PLAYER_CARS.find((c) => c.id === carId)
  if (!def) return Promise.resolve(null)

  const promise = new Promise((resolve) => {
    gltfLoader.load(
      def.url,
      (gltf) => {
        inflight.delete(carId)
        try {
          const template = preparePlayerCarModel(gltf.scene, carId)
          template.userData.level2CarId = carId
          templates.set(carId, template)
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level2Car] Failed to prepare model', carId, err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight.delete(carId)
        if (import.meta.env.DEV) {
          console.warn('[Level2Car] Failed to load GLB', carId, def.url, err)
        }
        resolve(null)
      }
    )
  })

  inflight.set(carId, promise)
  return promise
}

export function preloadAllLevel2Cars() {
  for (const { id } of LEVEL2_PLAYER_CARS) {
    loadLevel2CarTemplate(id)
  }
}

/** @param {string} carId */
export function preloadLevel2Car(carId) {
  return loadLevel2CarTemplate(carId)
}

/** @param {string} carId */
export function getLevel2CarTemplate(carId) {
  return templates.get(carId) ?? null
}

/** @param {string} carId */
export function isLevel2CarLoading(carId) {
  return inflight.has(carId)
}

/** @param {string} carId */
export function isLevel2CarCached(carId) {
  return templates.has(carId)
}

/** @param {string} carId */
export function createLevel2CarInstance(carId) {
  const template = templates.get(carId)
  return template ? clonePlayerCarInstance(template) : null
}

/**
 * @param {string} carId
 * @param {(template: import('three').Object3D | null) => void} onReady
 */
export function whenLevel2CarReady(carId, onReady) {
  const cached = templates.get(carId)
  if (cached) {
    onReady(cached)
    return
  }
  loadLevel2CarTemplate(carId).then(onReady)
}

export function disposeLevel2CarCache() {
  for (const template of templates.values()) {
    disposeObject3D(template)
  }
  templates.clear()
  inflight.clear()
}
