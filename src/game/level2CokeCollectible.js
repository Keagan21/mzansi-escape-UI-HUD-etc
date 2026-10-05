// level2CokeCollectible.js — Level 2 Coke bottle GLB load.

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { prepareCokeCollectibleModel } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

export const COKE_MODEL = '/coke.glb'

/**
 * @param {{ onReady?: () => void, onError?: () => void }} handlers
 */
export function createCokeCollectibleAssetLoader(handlers = {}) {
  let cancelled = false
  let started = false
  /** @type {import('three').Object3D | null} */
  let template = null
  let loadError = false
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(DRACO_DECODER)
  loader.setDRACOLoader(dracoLoader)

  const ensureLoaded = () => {
    if (started || cancelled) return
    started = true
    loader.load(
      COKE_MODEL,
      (gltf) => {
        if (cancelled) return
        template = prepareCokeCollectibleModel(gltf.scene)
        handlers.onReady?.()
      },
      undefined,
      (err) => {
        if (cancelled) return
        loadError = true
        started = false
        if (import.meta.env.DEV) {
          console.warn(
            '[CokeCollectible] Failed to load coke.glb',
            err
          )
        }
        handlers.onError?.()
      }
    )
  }

  return {
    ensureLoaded,
    getTemplate() {
      return template
    },
    hadError() {
      return loadError
    },
    cancel() {
      cancelled = true
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
