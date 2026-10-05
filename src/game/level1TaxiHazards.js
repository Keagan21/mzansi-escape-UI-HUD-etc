// level1TaxiHazards.js — Level 1 taxi GLB (cached; not disposed when switching to level 2).

import {
  getTaxiTemplate,
  isTaxiReady,
  whenTaxiReady,
} from './level1TaxiCache.js'

/**
 * @param {{ onReady?: () => void, onError?: () => void }} handlers
 */
export function createLevel1TaxiAssetLoader(handlers = {}) {
  let cancelled = false

  const ensureLoaded = () => {
    if (cancelled) return
    whenTaxiReady(() => {
      if (cancelled) return
      if (isTaxiReady()) handlers.onReady?.()
      else handlers.onError?.()
    })
  }

  if (isTaxiReady()) {
    queueMicrotask(() => {
      if (!cancelled) handlers.onReady?.()
    })
  }

  return {
    cancel() {
      cancelled = true
    },
    ensureLoaded,
    getTemplate() {
      return getTaxiTemplate()
    },
    hadError() {
      return !isTaxiReady()
    },
    dispose() {
      cancelled = true
    },
  }
}
