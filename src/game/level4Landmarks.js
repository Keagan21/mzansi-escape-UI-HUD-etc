// level4Landmarks.js — Optional Level 4 GLBs with procedural fallbacks.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL4_ANCHORS } from './level4City.js'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

// Must stay a literal `new URL(..., import.meta.url)` so Vite bundles the GLB.
const TABLE_MOUNTAIN_URL = new URL(
  '../../Characters/Level4Assets/TableMountain.glb',
  import.meta.url
).href

/** Height in world units. Mesh is roughly cubic — keep this modest so it stays outside the city. */
export const TABLE_MOUNTAIN_SIZE = 90
/** Degrees around Y. 180 = the face you preferred. */
export const TABLE_MOUNTAIN_YAW_DEG = 180

/**
 * Load a public-path GLB if present. Missing files keep the procedural mesh.
 * @param {string} publicPath
 * @param {(root: THREE.Object3D) => void} onLoad
 */
export function tryLoadLevel4Glb(publicPath, onLoad) {
  const url = `${import.meta.env.BASE_URL}${publicPath.replace(/^\//, '')}`
  gltfLoader.load(
    url,
    (gltf) => {
      onLoad(gltf.scene)
    },
    undefined,
    () => {
      if (import.meta.env.DEV) {
        console.info('[Level4] Optional GLB missing, using procedural mesh:', publicPath)
      }
    }
  )
}

/**
 * Same centering as Level 3 monuments: scale, ground, wrap in a pivot so yaw
 * spins the mass in place instead of orbiting an export origin.
 *
 * @param {THREE.Object3D} root
 * @param {'height' | 'longest'} fitMode
 * @param {number} targetSize
 * @returns {THREE.Group}
 */
function prepareHorizonModel(root, fitMode, targetSize) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = false
    o.receiveShadow = false
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const divisor =
    fitMode === 'longest'
      ? Math.max(size.x, size.y, size.z, 0.001)
      : Math.max(size.y, 0.001)
  root.scale.setScalar(targetSize / divisor)
  root.updateMatrixWorld(true)
  const scaled = new THREE.Box3().setFromObject(root)
  const center = scaled.getCenter(new THREE.Vector3())
  root.position.set(-center.x, -scaled.min.y, -center.z)

  const pivot = new THREE.Group()
  pivot.add(root)
  return pivot
}

/**
 * Table Mountain as a fixed far landmark (Mandela Bridge), not camera-follow.
 * Spawn camera looks +Z, so it sits past the north world bound.
 *
 * @param {THREE.Scene} scene
 */
export function createTableMountainHorizon(scene) {
  const group = new THREE.Group()
  group.name = 'table-mountain-horizon'
  group.visible = false
  group.position.set(LEVEL4_ANCHORS.tableMountain.x, 0, LEVEL4_ANCHORS.tableMountain.z)
  scene.add(group)

  let cancelled = false

  gltfLoader.load(
    TABLE_MOUNTAIN_URL,
    (gltf) => {
      if (cancelled) return
      const model = prepareHorizonModel(gltf.scene, 'height', TABLE_MOUNTAIN_SIZE)
      model.name = 'table-mountain-pivot'
      model.rotation.y = THREE.MathUtils.degToRad(TABLE_MOUNTAIN_YAW_DEG)
      group.add(model)
      if (import.meta.env.DEV) {
        const bounds = new THREE.Box3().setFromObject(model)
        const dims = bounds.getSize(new THREE.Vector3())
        console.log('[Level4] Table Mountain horizon', {
          anchor: LEVEL4_ANCHORS.tableMountain,
          size: `${dims.x.toFixed(0)} x ${dims.y.toFixed(0)} x ${dims.z.toFixed(0)}`,
          yawDeg: TABLE_MOUNTAIN_YAW_DEG,
        })
      }
    },
    undefined,
    (err) => {
      if (import.meta.env.DEV) {
        console.warn('[Level4] Failed to load TableMountain.glb', err)
      }
    }
  )

  return {
    group,
    /**
     * Visibility only — world position stays fixed so the city never sinks into it.
     * @param {THREE.Camera} _camera
     * @param {boolean} hide
     * @param {boolean} active
     */
    sync(_camera, hide, active) {
      group.visible = Boolean(active) && !hide
    },
    dispose() {
      cancelled = true
      scene.remove(group)
      disposeObject3D(group)
    },
  }
}

/**
 * @param {THREE.Object3D} root
 * @param {number} targetHeight
 */
export function groundAndFitHeight(root, targetHeight) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const s = targetHeight / Math.max(size.y, 0.001)
  root.scale.multiplyScalar(s)
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  const center = grounded.getCenter(new THREE.Vector3())
  root.position.x -= center.x
  root.position.z -= center.z
  root.position.y -= grounded.min.y
}

export function disposeLandmarkGroup(group) {
  disposeObject3D(group)
}
