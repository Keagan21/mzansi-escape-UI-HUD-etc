// level1TaxiCache.js — Cached Level 1 taxi GLB (shared Draco decoder, survives level switches).

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { TAXI_MODEL } from './characterAssets.js'
import { prepareTaxiModel } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/** @type {import('three').Object3D | null} */
let template = null
/** @type {Promise<import('three').Object3D | null> | null} */
let inflight = null

/** @returns {Promise<import('three').Object3D | null>} */
export function loadTaxiTemplate() {
  if (template) return Promise.resolve(template)
  if (inflight) return inflight

  inflight = new Promise((resolve) => {
    gltfLoader.load(
      TAXI_MODEL,
      (gltf) => {
        inflight = null
        try {
          template = prepareTaxiModel(gltf.scene)
          resolve(template)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Level1Taxi] Failed to prepare taxi model', err)
          }
          resolve(null)
        }
      },
      undefined,
      (err) => {
        inflight = null
        if (import.meta.env.DEV) {
          console.warn('[Level1Taxi] Failed to load taxi GLB', TAXI_MODEL, err)
        }
        resolve(null)
      }
    )
  })

  return inflight
}

export function preloadTaxi() {
  return loadTaxiTemplate()
}

export function getTaxiTemplate() {
  return template
}

export function isTaxiReady() {
  return template != null
}

/** @param {() => void} onReady */
export function whenTaxiReady(onReady) {
  if (template) {
    onReady()
    return
  }
  loadTaxiTemplate().then((t) => {
    if (t) onReady()
  })
}

export function disposeTaxiCache() {
  if (template) {
    disposeObject3D(template)
    template = null
  }
  inflight = null
}
