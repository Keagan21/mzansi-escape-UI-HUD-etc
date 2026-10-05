// level3Monuments.js — Fixed-horizon JHB CBD landmark GLBs for Level 3.
//
// Why this is a separate module from the Soweto tower loader in
// useRoadSceneEngine.js: those towers track the camera's Z every frame
// (`sowetoTowers.position.z = camera.position.z - 170`) because levels 1/2
// are endless-scroll corridors — "horizon" there means "always N units
// ahead of you." Level 3 is a free-roam open world with no scroll, so a
// camera-following horizon doesn't make sense here. These monuments sit at
// permanent world-space coordinates, far outside LEVEL3_WORLD_BOUND, and
// never move — the player just sees them in the distance no matter where
// they walk, same as a real skyline.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

// These must stay as literal `new URL(..., import.meta.url)` expressions:
// Vite's asset-import-meta-url plugin only resolves statically analyzable
// paths. Building the URL from a variable inside the loop below silently
// drops the GLB from the production bundle and 404s at runtime.
const TELKOM_TOWER_URL = new URL(
  '../../Characters/Level3Assets/TelkomTower.glb',
  import.meta.url
).href
const VODACOM_TOWER_URL = new URL(
  '../../Characters/Level3Assets/VodacomTower.glb',
  import.meta.url
).href
const MANDELA_BRIDGE_URL = new URL(
  '../../Characters/Level3Assets/MandelaBridge.glb',
  import.meta.url
).href

/**
 * One entry per monument GLB.
 *
 * - `url` is a pre-resolved asset URL (see the note above).
 * - `fitMode` picks which axis drives the scale. All three models export at
 *   roughly unit size, so raw placement would make them invisible.
 *   'height' normalizes on Y and suits the two towers. 'longest' normalizes
 *   on the largest axis and is required for Mandela Bridge: it exports 0.30
 *   wide x 0.34 tall x 1.14 long, so height-fitting it to 180 would scale it
 *   531x and leave a 603-unit-long bridge spanning the entire map
 *   (LEVEL3_WORLD_BOUND is 320).
 * - `targetSize` is the world-unit size of whichever axis `fitMode` selects.
 *   BLOCK is 46 and the tallest procedural CBD tower is 220, so 150-200
 *   reads as a landmark without dwarfing the skyline.
 * - `x`/`z` is the fixed anchor. The player spawns facing +Z toward Park
 *   Station (x -101, z 207), so these sit further along +Z to frame the
 *   destination. Distance matters: scene fog is FogExp2 at density 0.0022,
 *   which hazes ~58% at 420 units and washes out entirely past ~600.
 * - `rotationY` (radians) turns the model about its own centre.
 * - `clearance` is the radius the procedural far-skyline scatter must leave
 *   free, roughly the model's footprint half-width plus margin, so a
 *   background box doesn't grow through the middle of a landmark.
 */
const MONUMENT_DEFS = [
  {
    name: 'TelkomTower',
    url: TELKOM_TOWER_URL,
    fitMode: 'height',
    targetSize: 200,
    x: -260,
    z: 330,
    rotationY: 0,
    clearance: 45,
  },
  {
    name: 'VodacomTower',
    url: VODACOM_TOWER_URL,
    fitMode: 'height',
    targetSize: 170,
    x: 175,
    z: 305,
    rotationY: 0,
    clearance: 75,
  },
  {
    name: 'MandelaBridge',
    url: MANDELA_BRIDGE_URL,
    fitMode: 'longest',
    // A bridge is long but low, so it needs more span than the towers need
    // height before it reads through the fog — at 150 it vanished into the
    // haze band near the ground. 240 also matches the real proportion
    // against a 200-unit Telkom Tower.
    targetSize: 240,
    x: -60,
    z: 370,
    // Long axis is Z as exported; turn it broadside so it reads as a span.
    rotationY: Math.PI / 2,
    clearance: 140,
  },
]

/**
 * Anchor + clearance radius for each monument, so buildJoburgCbdCity can skip
 * scattering filler buildings on top of them.
 */
export const MONUMENT_ANCHORS = MONUMENT_DEFS.map(({ x, z, clearance }) => ({
  x,
  z,
  clearance,
}))

/**
 * Normalizes an arbitrary GLB export to a known size, grounds it to y=0 and
 * centres it horizontally, then returns a pivot wrapping the result.
 *
 * The pivot matters: re-centring by offsetting the model's own position
 * would be undone the moment a caller set rotation.y, because Three composes
 * as translate * rotate * scale — the rotation would swing the offset
 * content around the model origin instead of spinning it in place. Rotating
 * the pivot instead turns the model about its own centre.
 *
 * @param {THREE.Object3D} root
 * @param {'height' | 'longest'} fitMode
 * @param {number} targetSize
 * @returns {THREE.Group}
 */
function prepareMonumentModel(root, fitMode, targetSize) {
  root.traverse((o) => {
    if (!o.isMesh) return
    // Level 3's sun shadow camera is a +/-400 box, so monuments anchored out
    // here fall outside it — casting would cost shadow-map fill for nothing.
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
  pivot.updateMatrixWorld(true)
  return pivot
}

/**
 * Loads and places the fixed CBD monuments. Call once from
 * buildJoburgCbdCity and pass the same `group` you return from that
 * function, so the monuments inherit its visible/hidden toggling and get
 * cleaned up by the same dispose() call.
 *
 * No colliders are registered: these sit well beyond LEVEL3_WORLD_BOUND, so
 * the player can never walk into them.
 *
 * @param {THREE.Group} cityGroup
 * @returns {{ group: THREE.Group, dispose: () => void }}
 */
export function buildCbdMonuments(cityGroup) {
  const group = new THREE.Group()
  group.name = 'level3-monuments'
  cityGroup.add(group)

  let cancelled = false

  for (const def of MONUMENT_DEFS) {
    gltfLoader.load(
      def.url,
      (gltf) => {
        if (cancelled) return
        const model = prepareMonumentModel(gltf.scene, def.fitMode, def.targetSize)
        model.position.set(def.x, 0, def.z)
        model.rotation.y = def.rotationY ?? 0
        group.add(model)
        if (import.meta.env.DEV) {
          const bounds = new THREE.Box3().setFromObject(model)
          const dims = bounds.getSize(new THREE.Vector3())
          console.log('[Level3] Monument placed', def.name, {
            anchor: { x: def.x, z: def.z },
            distance: Math.hypot(def.x, def.z).toFixed(0),
            size: `${dims.x.toFixed(0)} x ${dims.y.toFixed(0)} x ${dims.z.toFixed(0)}`,
          })
        }
      },
      undefined,
      (err) => {
        if (import.meta.env.DEV) {
          console.warn('[Level3] Failed to load monument GLB', def.name, err)
        }
      }
    )
  }

  return {
    group,
    dispose() {
      cancelled = true
      cityGroup.remove(group)
      disposeObject3D(group)
    },
  }
}
