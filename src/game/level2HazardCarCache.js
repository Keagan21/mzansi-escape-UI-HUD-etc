// level2HazardCarCache.js — Cached Level 2 oncoming hazard cars (shared Draco decoder).

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { LEVEL2_HAZARD_CARS } from './level2ObstacleAssets.js'
import { prepareHazardCarModel } from './modelPrep.js'
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
/** @type {Set<() => void>} */
const readyListeners = new Set()

function notifyReadyListeners() {
  if (templates.size === 0) return
  const pending = [...readyListeners]
  readyListeners.clear()
  for (const fn of pending) {
    fn()
  }
}

/**
 * @param {string} carId
 * @returns {Promise<import('three').Object3D | null>}
 */
export function loadLevel2HazardCarTemplate(carId) {
  const cached = templates.get(carId)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(carId)
  if (pending) return pending

  const def = LEVEL2_HAZARD_CARS.find((c) => c.id === carId)
  if (!def) return Promise.resolve(null)

  const promise = new Promise((resolve) => {
    gltfLoader.load(
      def.url,
      (gltf) => {
        inflight.delete(carId)
        try {
          const template = prepareHazardCarModel(gltf.scene, carId)
          template.userData.level2CarId = carId
          templates.set(carId, template)
          notifyReadyListeners()
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level2HazardCar] Failed to prepare model', carId, err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight.delete(carId)
        if (import.meta.env.DEV) {
          console.warn('[Level2HazardCar] Failed to load GLB', carId, def.url, err)
        }
        resolve(null)
      }
    )
  })

  inflight.set(carId, promise)
  return promise
}

/** @returns {Promise<void>} */
export function preloadAllLevel2HazardCars() {
  return Promise.all(
    LEVEL2_HAZARD_CARS.map(({ id }) => loadLevel2HazardCarTemplate(id))
  ).then(() => {})
}

/** @returns {import('three').Object3D[]} */
export function getLevel2HazardCarTemplates() {
  return LEVEL2_HAZARD_CARS.map(({ id }) => templates.get(id)).filter(Boolean)
}

export function isLevel2HazardCarsReady() {
  return getLevel2HazardCarTemplates().length > 0
}

/** @param {() => void} onReady */
export function whenLevel2HazardCarsReady(onReady) {
  if (isLevel2HazardCarsReady()) {
    onReady()
    return
  }
  readyListeners.add(onReady)
  preloadAllLevel2HazardCars()
}

export function disposeLevel2HazardCarCache() {
  for (const template of templates.values()) {
    disposeObject3D(template)
  }
  templates.clear()
  inflight.clear()
  readyListeners.clear()
}
