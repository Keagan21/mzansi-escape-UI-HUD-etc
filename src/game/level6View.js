// Shared Level 6 camera zoom. The buttons write it; the follow camera reads it every frame.

export const LEVEL6_VIEW_STEPS = [
  { scale: 0.7, fov: 60 },
  { scale: 1, fov: 60 },
  { scale: 1.45, fov: 60 },
  { scale: 1.95, fov: 60 },
]

const DEFAULT_INDEX = 1

function viewState() {
  const shared = globalThis
  if (!shared.__mzansiLevel6View) shared.__mzansiLevel6View = { index: DEFAULT_INDEX }
  return shared.__mzansiLevel6View
}

export function getLevel6ViewIndex() {
  const max = LEVEL6_VIEW_STEPS.length - 1
  const index = Math.max(0, Math.min(max, viewState().index))
  viewState().index = index
  return index
}

export function getLevel6ViewStep() {
  return LEVEL6_VIEW_STEPS[getLevel6ViewIndex()]
}

/** @param {number} next */
export function setLevel6ViewIndex(next) {
  const max = LEVEL6_VIEW_STEPS.length - 1
  viewState().index = Math.max(0, Math.min(max, next))
  return viewState().index
}

export function zoomLevel6Out() {
  return setLevel6ViewIndex(getLevel6ViewIndex() + 1)
}

export function zoomLevel6In() {
  return setLevel6ViewIndex(getLevel6ViewIndex() - 1)
}
