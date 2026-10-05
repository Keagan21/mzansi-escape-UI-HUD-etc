// modelPrep.js — Scale/orient player, taxi, and Soweto tower GLB roots.

import * as THREE from 'three'
import {
  COKE_MAX_AXIS,
  PLAYER_CAR_MAX_AXIS,
  PLAYER_FACING_Y,
  OBSTACLE_MAX_AXIS,
  TAXI_MAX_AXIS,
} from './gameConstants.js'

export function preparePlayerModel(root) {
  const extras = []
  root.traverse((o) => {
    if (o.isCamera || o.isLight) extras.push(o)
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  for (const extra of extras) extra.parent?.remove(extra)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const h = size.y
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const targetH = 1.7
  const s = h > 0.01 ? targetH / h : targetH / maxDim
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  root.rotation.set(0, PLAYER_FACING_Y, 0)
  return root
}

/**
 * Level 3 Mixamo amaphara — grounded, ~player height, no runner yaw flip.
 * Strip cameras/lights Mixamo sometimes embeds in the FBX.
 */
export function prepareThugModel(root) {
  const extras = []
  root.traverse((o) => {
    if (o.isCamera || o.isLight) extras.push(o)
    if (o.isMesh) {
      o.visible = true
      o.frustumCulled = false
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  for (const extra of extras) extra.parent?.remove(extra)

  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const h = size.y
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const targetH = 1.75
  const s = h > 0.01 ? targetH / h : targetH / maxDim
  root.scale.setScalar(s)
  root.updateMatrixWorld(true)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  root.rotation.set(0, 0, 0)
  root.updateMatrixWorld(true)
  return root
}

/** Level 3 open-world player — no runner 180° flip; yaw is driven at runtime. */
export function prepareOpenWorldPlayerModel(root) {
  const extras = []
  root.traverse((o) => {
    if (o.isCamera || o.isLight) extras.push(o)
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  for (const extra of extras) extra.parent?.remove(extra)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const h = size.y
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const targetH = 1.7
  const s = h > 0.01 ? targetH / h : targetH / maxDim
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  root.rotation.set(0, 0, 0)
  return root
}

export function prepareTaxiModel(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const s = TAXI_MAX_AXIS / maxDim
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  return root
}

function simplifyCarMaterial(mat) {
  if (!mat) return mat
  const simplified = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: mat.map ?? null,
    normalMap: mat.normalMap ?? null,
    roughness: 0.58,
    metalness: 0.12,
    emissive: new THREE.Color(0x2a2a2a),
    emissiveIntensity: 0.14,
  })
  if (simplified.map) {
    simplified.map.colorSpace = THREE.SRGBColorSpace
    simplified.map.needsUpdate = true
  }
  if (simplified.normalMap) simplified.normalMap.colorSpace = THREE.NoColorSpace
  simplified.side = THREE.DoubleSide
  simplified.transparent = false
  simplified.opacity = 1
  simplified.depthWrite = true
  simplified.depthTest = true
  return simplified
}

function alignPlayerCarToRoad(root) {
  root.rotation.set(0, 0, 0)
  root.updateMatrixWorld(true)

  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3())
  if (size.x > size.z * 1.05) root.rotateY(Math.PI / 2)

  const mesh = root.getObjectByProperty('isMesh', true)
  if (!mesh) return

  root.updateMatrixWorld(true)
  const worldNose = new THREE.Vector3(0, 0, 1)
  mesh.getWorldQuaternion(_carAlignQuat)
  worldNose.applyQuaternion(_carAlignQuat)
  if (worldNose.z > 0) root.rotateY(Math.PI)
}

const _carAlignQuat = new THREE.Quaternion()

// Yaw that makes the player car face down the road (-Z).
// Polo-style exports face +Z; Hilux / Raptor / Mercedes / Urus face -Z.
// Hazard traffic uses the opposite yaw so those cars drive toward the player.
const CAR_CONFIG = {
  polo: { yaw: Math.PI },
  gusheshe: { yaw: Math.PI },
  jmpd: { yaw: Math.PI },
  cherry: { yaw: Math.PI },
  mazda: { yaw: Math.PI },
  suzuki: { yaw: Math.PI },
  hilux: { yaw: 0 },
  raptor: { yaw: 0 },
  mercedes: { yaw: 0 },
  urus: { yaw: 0, drop: ['Wheel006Material007'] },
}

const normMeshName = (s) => (s || '').replace(/[^a-z0-9]/gi, '')

function collectCarScene(source) {
  const model = new THREE.Group()
  if (source?.isScene) {
    while (source.children.length > 0) model.add(source.children[0])
  } else if (source) {
    model.add(source)
  }
  return model
}

function dropNamedMeshes(model, names) {
  if (!names?.length) return
  const toRemove = []
  model.traverse((o) => {
    if (!o.isMesh) return
    if (names.some((d) => normMeshName(o.name).includes(d))) toRemove.push(o)
  })
  for (const o of toRemove) o.parent?.remove(o)
}

function tuneCarMeshes(model) {
  model.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    o.visible = true
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    const tuned = mats.map((mat) => simplifyCarMaterial(mat))
    o.material = Array.isArray(o.material) ? tuned : tuned[0]
    for (const mat of tuned) {
      if (!mat) continue
      mat.visible = true
      mat.needsUpdate = true
    }
  })
}

/**
 * Measured orientation: yaw lives on an inner group so gameplay can
 * rotate the outer root without turning the car sideways.
 */
function prepareConfiguredCar(source, cfg, maxAxis, yaw) {
  const model = collectCarScene(source)
  dropNamedMeshes(model, cfg.drop)
  tuneCarMeshes(model)

  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(maxAxis / Math.max(size.x, size.y, size.z, 0.001))

  model.rotation.y = yaw
  model.updateMatrixWorld(true)

  box.setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)

  const root = new THREE.Group()
  root.add(model)
  root.updateMatrixWorld(true)
  return root
}

function prepareLegacyPlayerCar(source) {
  const root = collectCarScene(source)
  tuneCarMeshes(root)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  root.scale.setScalar(PLAYER_CAR_MAX_AXIS / maxDim)
  root.updateMatrixWorld(true)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y + 0.04, 0)
  alignPlayerCarToRoad(root)
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  root.position.y = -grounded.min.y + 0.04
  root.updateMatrixWorld(true)
  return root
}

export function preparePlayerCarModel(source, carId = null) {
  const cfg = carId ? CAR_CONFIG[carId] : null
  if (cfg) return prepareConfiguredCar(source, cfg, PLAYER_CAR_MAX_AXIS, cfg.yaw)
  return prepareLegacyPlayerCar(source)
}

export function prepareCokeCollectibleModel(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      // Scaled GLB bounds are often far from the mesh origin, so default
      // frustum culling hides bottles while XZ pickup still works.
      o.frustumCulled = false
      o.visible = true
    }
  })
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const s = COKE_MAX_AXIS / maxDim
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  root.userData.floatHalfY = (grounded.max.y - grounded.min.y) * 0.5
  return root
}

/** Spawnable Coke bottle copy for road collectibles. */
export function cloneCokeCollectibleInstance(template) {
  const inst = template.clone(true)
  inst.traverse((o) => {
    if (!o.isMesh) return
    if (o.geometry) o.geometry = o.geometry.clone()
    if (Array.isArray(o.material)) {
      o.material = o.material.map((m) => m.clone())
    } else if (o.material) {
      o.material = o.material.clone()
    }
    o.frustumCulled = false
    o.visible = true
  })
  inst.userData.floatHalfY = template.userData.floatHalfY
  inst.visible = true
  return inst
}

export function prepareObstacleModel(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const s = OBSTACLE_MAX_AXIS / maxDim
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  return root
}

/** Oncoming Level 2 hazard car — scaled and oriented to drive toward the player. */
export function prepareHazardCarModel(source, carId = null) {
  const cfg = (carId && CAR_CONFIG[carId]) || { yaw: 0 }
  const yaw = (cfg.yaw + Math.PI) % (2 * Math.PI)
  return prepareConfiguredCar(source, cfg, OBSTACLE_MAX_AXIS, yaw)
}

/** Spawnable taxi copy with its own geometry/materials so one despawn cannot break others. */
export function cloneTaxiInstance(template) {
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

/** Spawnable obstacle copy with its own geometry/materials. */
export function cloneObstacleInstance(template) {
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

/** Player car copy for the active player mesh. */
export function clonePlayerCarInstance(template) {
  const inst = template.clone(true)
  inst.traverse((o) => {
    if (!o.isMesh) return
    if (o.geometry) o.geometry = o.geometry.clone()
    if (Array.isArray(o.material)) {
      o.material = o.material.map((m) => m.clone())
    } else if (o.material) {
      o.material = o.material.clone()
    }
    o.visible = true
  })
  inst.visible = true
  inst.updateMatrixWorld(true)
  return inst
}

export function prepareSowetoTowerModel(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false
      o.receiveShadow = false
    }
  })
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const h = Math.max(size.y, 0.001)
  const s = 75 / h
  root.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  return root
}
