// level2ObstacleHazards.js — Level 2 oncoming hazard cars (random spawn, like level 1 taxis).

import {
  getLevel2HazardCarTemplates,
  isLevel2HazardCarsReady,
  whenLevel2HazardCarsReady,
} from './level2HazardCarCache.js'

export function createLevel2ObstacleAssetLoader(handlers = {}) {
  let cancelled = false
  let started = false

  const ensureLoaded = () => {
    if (started || cancelled) return
    started = true
    whenLevel2HazardCarsReady(() => {
      if (!cancelled) handlers.onReady?.()
    })
  }

  return {
    ensureLoaded,
    getTemplates() {
      return getLevel2HazardCarTemplates()
    },
    isReady() {
      return isLevel2HazardCarsReady()
    },
    cancel() {
      cancelled = true
    },
    dispose() {
      cancelled = true
    },
  }
}
