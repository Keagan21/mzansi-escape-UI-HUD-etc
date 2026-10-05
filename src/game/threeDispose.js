// threeDispose.js — Dispose geometries/materials on Three.js object trees.

export function disposeGeometries(object) {
  object.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
  })
}

export function disposeObject3D(object) {
  object.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((d) => d.dispose())
      } else {
        obj.material.dispose()
      }
    }
  })
}
