// level8Decor.js — Street vendors (corridor shops) + optional house/vendor GLBs.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import {
  areBuildingsReady,
  cloneBuildingTemplate,
  ensureBuildingsLoaded,
} from '../BuildingFactory.js'
import { LEVEL8_ANCHORS, LEVEL8_SHELL_SPOTS, LEVEL8_ENGEN_SPOTS, LEVEL8_KFC_SPOTS } from './level8City.js'
import { disposeObject3D } from './threeDispose.js'

const OPTIONAL_DIR = '/Level8Assets'
const SHELL_URL = `${OPTIONAL_DIR}/shell3D.glb`
const ENGEN_URL = `${OPTIONAL_DIR}/engen3D.glb`
const KFC_URL = `${OPTIONAL_DIR}/KFC3D.glb`

/** Sidewalk stalls that do not sit on the yellow ridge. */
const VENDOR_SPOTS = [
  { x: 14, z: 102, ry: -Math.PI / 2, shop: 6, label: 'Spaza' },
  { x: -14, z: 102, ry: Math.PI / 2, shop: 7, label: 'Tuck' },
  { x: 14, z: 54, ry: -Math.PI / 2, shop: 0, label: 'Barber' },
  { x: -14, z: 12, ry: Math.PI / 2, shop: 5, label: 'Muthi' },
  { x: 14, z: -28, ry: -Math.PI / 2, shop: 2, label: 'Phones' },
  { x: -14, z: -68, ry: Math.PI / 2, shop: 4, label: 'Internet' },
  { x: 14, z: 78, ry: -Math.PI / 2, shop: 3, label: 'Shop' },
]

const OPTIONAL_HOUSES = [
  { file: 'House1.glb', x: 22, z: 88, ry: -Math.PI / 2 },
  { file: 'House2.glb', x: -22, z: 64, ry: Math.PI / 2 },
  { file: 'House3.glb', x: 22, z: 10, ry: -Math.PI / 2 },
  { file: 'House4.glb', x: -22, z: -44, ry: Math.PI / 2 },
  { file: 'House5.glb', x: 22, z: -78, ry: -Math.PI / 2 },
  { file: 'House6.glb', x: -22, z: 30, ry: Math.PI / 2 },
]

const OPTIONAL_VENDORS = [
  { file: 'Vendor1.glb', x: 12, z: 86, ry: -0.4 },
  { file: 'Vendor2.glb', x: -12, z: 74, ry: 0.5 },
  { file: 'StreetVendor.glb', x: 12, z: -46, ry: -0.2 },
  { file: 'VendorCart.glb', x: -12, z: -20, ry: 0.3 },
]

const OPTIONAL_LANDMARKS = [
  { file: 'Clinic.glb', x: LEVEL8_ANCHORS.clinic.x, z: LEVEL8_ANCHORS.clinic.z, ry: 0 },
  { file: 'School.glb', x: LEVEL8_ANCHORS.school.x, z: LEVEL8_ANCHORS.school.z, ry: 0 },
  { file: 'Spaza.glb', x: LEVEL8_ANCHORS.spaza.x, z: LEVEL8_ANCHORS.spaza.z, ry: 0 },
  { file: 'Home.glb', x: LEVEL8_ANCHORS.home.x, z: LEVEL8_ANCHORS.home.z, ry: 0 },
]

function makeLoader() {
  const loader = new GLTFLoader()
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  loader.setDRACOLoader(draco)
  return loader
}

function groundAndScale(root, maxAxis = 8) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  root.scale.multiplyScalar(maxAxis / maxDim)
  root.updateMatrixWorld(true)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.y -= b2.min.y
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return root
}

function brandSignTexture(label, bg, fg) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = fg
  ctx.fillRect(16, 16, 480, 224)
  ctx.fillStyle = bg
  ctx.font = 'bold 96px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 256, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Sit a garage on the ground at township scale without flattening the canopy. */
function prepareShellStation(root) {
  root.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(root)
  let size = box.getSize(new THREE.Vector3())
  if (size.y >= size.x && size.y >= size.z) {
    root.rotation.x += Math.PI / 2
    root.updateMatrixWorld(true)
    box = new THREE.Box3().setFromObject(root)
    size = box.getSize(new THREE.Vector3())
  }
  const long = Math.max(size.x, size.z, 0.001)
  const s = 14 / long
  root.scale.multiplyScalar(s)
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  root.position.y -= grounded.min.y
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      o.frustumCulled = false
    }
  })
  return root
}

function makeShellGarage() {
  const g = new THREE.Group()
  g.name = 'shell-kit'
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.45, metalness: 0.15 })
  const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5, metalness: 0.12 })
  const grey = new THREE.MeshStandardMaterial({ color: 0xdee0e4, roughness: 0.72 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.9 })

  const pad = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), dark)
  pad.rotation.x = -Math.PI / 2
  pad.position.y = 0.03
  pad.receiveShadow = true

  const shop = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.2, 5.5), grey)
  shop.position.set(0, 2.1, -3.2)
  shop.castShadow = true
  shop.receiveShadow = true

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 0.32, 11), yellow)
  canopy.position.set(0, 5.15, 1.4)
  canopy.castShadow = true

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.7, 0.22), red)
  fascia.position.set(0, 4.85, 6.85)

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.1, 0.28), yellow)
  postL.position.set(-6.2, 2.55, 5.6)
  const postR = postL.clone()
  postR.position.x = 6.2

  const pumpMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.55, metalness: 0.2 })
  const pumps = [-3.2, 0, 3.2].map((x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.55, 0.55), pumpMat)
    p.position.set(x, 0.78, 2.2)
    p.castShadow = true
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.18, 0.58), red)
    cap.position.set(x, 1.62, 2.2)
    g.add(p, cap)
    return p
  })
  void pumps

  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.4, 1.7), red)
  pylon.position.set(-7.4, 4.2, 5.8)
  pylon.castShadow = true
  const tex = brandSignTexture('SHELL', '#dd2c00', '#ffd54f')
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.85),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.55,
    })
  )
  sign.position.set(-7.18, 7.1, 5.8)

  g.add(pad, shop, canopy, fascia, postL, postR, pylon, sign)
  return g
}

function makeEngenGarage() {
  const g = new THREE.Group()
  g.name = 'engen-kit'
  const green = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.45, metalness: 0.12 })
  const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5, metalness: 0.1 })
  const grey = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.72 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.9 })
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), dark)
  pad.rotation.x = -Math.PI / 2
  pad.position.y = 0.03
  pad.receiveShadow = true
  const shop = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.0, 5.4), grey)
  shop.position.set(0, 2.0, -3.2)
  shop.castShadow = true
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 0.32, 11), green)
  canopy.position.set(0, 5.15, 1.4)
  canopy.castShadow = true
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.7, 0.22), red)
  fascia.position.set(0, 4.85, 6.85)
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.4, 1.7), green)
  pylon.position.set(-7.4, 4.2, 5.8)
  const tex = brandSignTexture('ENGEN', '#1b5e20', '#ffffff')
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.85),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.55,
    })
  )
  sign.position.set(-7.18, 7.1, 5.8)
  const pumpMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.55, metalness: 0.2 })
  for (const x of [-3.2, 0, 3.2]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.55, 0.55), pumpMat)
    p.position.set(x, 0.78, 2.2)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.18, 0.58), red)
    cap.position.set(x, 1.62, 2.2)
    g.add(p, cap)
  }
  g.add(pad, shop, canopy, fascia, pylon, sign)
  return g
}

function makeKfcStore() {
  const g = new THREE.Group()
  g.name = 'kfc-kit'
  const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.55 })
  const white = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.7 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.85 })
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), dark)
  pad.rotation.x = -Math.PI / 2
  pad.position.y = 0.03
  const body = new THREE.Mesh(new THREE.BoxGeometry(11, 4.4, 8), white)
  body.position.set(0, 2.2, 0)
  body.castShadow = true
  const roof = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 8.8), red)
  roof.position.set(0, 4.55, 0)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.7, 0.12), red)
  stripe.position.set(0, 3.4, 4.06)
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.2, 1.8), red)
  pylon.position.set(6.6, 4.1, 4.2)
  const tex = brandSignTexture('KFC', '#c62828', '#ffffff')
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.9),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.5,
    })
  )
  sign.position.set(6.88, 7.0, 4.2)
  g.add(pad, body, roof, stripe, pylon, sign)
  return g
}

function placeBrandLots(group, colliders, spots, makeKit, namePrefix) {
  return spots.map((spot) => {
    const holder = new THREE.Group()
    holder.name = `level8-${namePrefix}-${spot.id}`
    holder.position.set(spot.x, 0, spot.z)
    holder.rotation.y = spot.ry
    holder.add(makeKit())
    group.add(holder)
    colliders.push({ x: spot.x, z: spot.z, hw: 9, hd: 8, h: 6, active: true })
    return holder
  })
}

function dressLots(loader, url, holders, cancelled, label) {
  void tryLoad(loader, url).then((scene) => {
    if (!scene || cancelled()) return
    let template
    try {
      template = prepareShellStation(scene)
    } catch (err) {
      if (import.meta.env.DEV) console.warn(`[Level8] Failed to prepare ${label}`, err)
      return
    }
    for (let i = 0; i < holders.length; i++) {
      if (cancelled()) return
      holders[i].add(i === 0 ? template : template.clone(true))
    }
  })
}

function tryLoad(loader, url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => {
        if (import.meta.env.DEV) console.warn('[Level8] Failed to load', url, err)
        resolve(null)
      }
    )
  })
}

/**
 * @param {THREE.Group} parent
 * @param {{ x: number, z: number, hw: number, hd: number, h: number, active?: boolean }[]} colliders
 */
export function createLevel8Decor(parent, colliders) {
  const group = new THREE.Group()
  group.name = 'level8-decor'
  parent.add(group)
  const loader = makeLoader()
  let cancelled = false

  const placeShop = (spot) => {
    const shop = cloneBuildingTemplate(spot.shop)
    if (!shop) return
    shop.position.set(spot.x, 0, spot.z)
    shop.rotation.y = spot.ry
    group.add(shop)
    colliders.push({ x: spot.x, z: spot.z, hw: 2.4, hd: 1.6, h: 4.5, active: true })
  }

  void ensureBuildingsLoaded()
    .then(() => {
      if (cancelled || !areBuildingsReady()) return
      for (const spot of VENDOR_SPOTS) placeShop(spot)
    })
    .catch(() => {})

  const placeOptional = async (list, maxAxis) => {
    for (const spot of list) {
      if (cancelled) return
      const scene = await tryLoad(loader, `${OPTIONAL_DIR}/${spot.file}`)
      if (!scene || cancelled) continue
      const root = groundAndScale(scene, maxAxis)
      const holder = new THREE.Group()
      holder.add(root)
      holder.position.set(spot.x, 0, spot.z)
      holder.rotation.y = spot.ry ?? 0
      group.add(holder)
      const box = new THREE.Box3().setFromObject(holder)
      const size = box.getSize(new THREE.Vector3())
      colliders.push({
        x: spot.x,
        z: spot.z,
        hw: Math.max(1.2, size.x / 2),
        hd: Math.max(1.2, size.z / 2),
        h: Math.max(2, size.y),
        active: true,
      })
    }
  }

  void placeOptional(OPTIONAL_HOUSES, 9)
  void placeOptional(OPTIONAL_VENDORS, 3.4)
  void placeOptional(OPTIONAL_LANDMARKS, 14)

  const shellHolders = placeBrandLots(group, colliders, LEVEL8_SHELL_SPOTS, makeShellGarage, 'shell')
  const engenHolders = placeBrandLots(group, colliders, LEVEL8_ENGEN_SPOTS, makeEngenGarage, 'engen')
  const kfcHolders = placeBrandLots(group, colliders, LEVEL8_KFC_SPOTS, makeKfcStore, 'kfc')
  const isCancelled = () => cancelled
  dressLots(loader, SHELL_URL, shellHolders, isCancelled, 'shell3D.glb')
  dressLots(loader, ENGEN_URL, engenHolders, isCancelled, 'engen3D.glb')
  dressLots(loader, KFC_URL, kfcHolders, isCancelled, 'KFC3D.glb')

  return {
    group,
    dispose() {
      cancelled = true
      parent.remove(group)
      disposeObject3D(group)
    },
  }
}
