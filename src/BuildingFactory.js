import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

const BUILDING_URLS = [
  '/BarberShop.glb',
  '/BrickWall.glb',
  '/CellPhoneRepairShop.glb',
  '/GenericBuilding.glb',
  '/InternetCafe.glb',
  '/MuthiShop.glb',
  '/SpazaShop.glb',
  '/TuckShop.glb',
]

const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
loader.setDRACOLoader(dracoLoader)
const TARGET_SIZE = new THREE.Vector3(6, 9, 3)

/** @type {THREE.Group[]} */
let preparedTemplates = []
/** @type {Promise<THREE.Group[]> | null} */
let loadPromise = null

function prepareBuildingTemplate(root) {
  root.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const minY = bounds.min.y
  const scale = Math.min(
    TARGET_SIZE.x / Math.max(size.x, 0.001),
    TARGET_SIZE.y / Math.max(size.y, 0.001),
    TARGET_SIZE.z / Math.max(size.z, 0.001)
  )

  const container = new THREE.Group()
  const normalized = root.clone(true)
  normalized.position.set(-center.x, -minY, -center.z)
  normalized.scale.setScalar(scale)
  normalized.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
  container.add(normalized)
  return container
}

async function loadBuildingTemplates() {
  const templates = await Promise.all(
    BUILDING_URLS.map(async (url) => {
      const gltf = await loader.loadAsync(url)
      return prepareBuildingTemplate(gltf.scene)
    })
  )
  preparedTemplates = templates
  return templates
}

/** Decode corridor shop GLBs once; safe to call repeatedly. */
export function ensureBuildingsLoaded() {
  if (!loadPromise) {
    loadPromise = loadBuildingTemplates().catch((err) => {
      loadPromise = null
      throw err
    })
  }
  return loadPromise
}

export function getRandomBuilding(theme = 'soweto') {
  void theme
  if (preparedTemplates.length === 0) {
    throw new Error('Corridor buildings are not loaded yet; await ensureBuildingsLoaded()')
  }
  const i = (Math.random() * preparedTemplates.length) | 0
  return preparedTemplates[i].clone(true)
}

export function areBuildingsReady() {
  return preparedTemplates.length > 0
}

/** Clone a corridor shop by index (see BUILDING_URLS). */
export function cloneBuildingTemplate(index) {
  if (preparedTemplates.length === 0) return null
  const i = ((index % preparedTemplates.length) + preparedTemplates.length) % preparedTemplates.length
  return preparedTemplates[i].clone(true)
}

export const BUILDING_TEMPLATE_NAMES = [
  'BarberShop',
  'BrickWall',
  'CellPhoneRepairShop',
  'GenericBuilding',
  'InternetCafe',
  'MuthiShop',
  'SpazaShop',
  'TuckShop',
]
