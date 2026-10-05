// level2PlayerCar.js — Level 2 player car GLB load (isolated from level 1 assets).

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { clonePlayerCarInstance, preparePlayerCarModel } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

/**
 * @param {string} modelUrl
 * @param {{ onReady?: () => void, onError?: () => void }} handlers
 */
export function createLevel2PlayerCarAssetLoader(modelUrl, handlers = {}) {
  let cancelled = false
  /** @type {import('three').Object3D | null} */
  let template = null
  let loadError = false
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(DRACO_DECODER)
  loader.setDRACOLoader(dracoLoader)

  loader.load(
    modelUrl,
    (gltf) => {
      if (cancelled) return
      template = preparePlayerCarModel(gltf.scene)
      handlers.onReady?.()
    },
    undefined,
    () => {
      if (cancelled) return
      loadError = true
      handlers.onError?.()
    }
  )

  return {
    cancel() {
      cancelled = true
    },
    getTemplate() {
      return template
    },
    createInstance() {
      return template ? clonePlayerCarInstance(template) : null
    },
    hadError() {
      return loadError
    },
    dispose() {
      cancelled = true
      if (template) {
        disposeObject3D(template)
        template = null
      }
      dracoLoader.dispose()
    },
  }
}
