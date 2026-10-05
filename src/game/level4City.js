// level4City.js — Procedural Cape Town Day Zero open-world city.

import * as THREE from 'three'
import {
  clonePowerStationInstance,
  loadPowerStationTemplate,
} from './level4PowerStationAssets.js'
import {
  cloneVodacomBuildingInstance,
  loadVodacomBuildingTemplate,
} from './level4VodacomAssets.js'
import { cloneMcDonaldsInstance, loadMcDonaldsTemplate } from './level4McDonaldsAssets.js'
import { disposeGeometries, disposeObject3D } from './threeDispose.js'

export const BLOCK = 46
export const STREET_W = 14
export const GRID_N = 12

/** Square edge the player is clamped to. */
export const LEVEL4_WORLD_BOUND = Math.floor((GRID_N / 2) * BLOCK - 2)

export const LEVEL4_ANCHORS = {
  spawn: { x: 0, z: 80 },
  deWaal: { x: BLOCK * 2.2, z: -BLOCK * 0.5 },
  newlands: { x: -BLOCK * 2.4, z: -BLOCK * 2.8 },
  steenbras: { x: BLOCK * 3.5, z: -BLOCK * 4.2 },
  tableMountain: { x: 0, z: LEVEL4_WORLD_BOUND + 180 },
  /** Win destination — middle of the block, clear of the crossing. */
  vodacom: { x: -BLOCK * 3.5, z: BLOCK * 1.5 },
  /** Lot beside the street ahead of spawn, off the roadway. */
  mcdonalds: { x: BLOCK * 0.5, z: BLOCK * 2.5 },
}

const boKaapPalette = [
  0xe27d9a, 0x3eb6b0, 0xf2d04b, 0x4a8fd4, 0xf08a4b, 0xc45c8a, 0x7bc67e, 0xf5f0e4,
]

/**
 * @typedef {{
 *   x: number
 *   z: number
 *   hw: number
 *   hd: number
 *   h: number
 *   id?: string
 *   active?: boolean
 * }} BuildingCollider
 */

function crackedGroundTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#c4a06a'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(140, 90, 40, ${0.08 + Math.random() * 0.12})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 40 + Math.random() * 80, 18)
  }
  ctx.strokeStyle = 'rgba(70, 42, 18, 0.55)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 70; i++) {
    ctx.beginPath()
    const x = Math.random() * 256
    const y = Math.random() * 256
    ctx.moveTo(x, y)
    ctx.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(48, 48)
  tex.anisotropy = 4
  return tex
}

const doorWoodMat = new THREE.MeshStandardMaterial({
  color: 0x3d2918,
  roughness: 0.7,
  metalness: 0.08,
})
const doorStepMat = new THREE.MeshStandardMaterial({ color: 0xc8b8a0, roughness: 0.9 })
const paneMat = new THREE.MeshStandardMaterial({
  color: 0x7ec8e8,
  roughness: 0.15,
  metalness: 0.2,
  emissive: 0x1a3040,
  emissiveIntensity: 0.15,
})
const paneFrameMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.55 })
const roofMat = new THREE.MeshStandardMaterial({ color: 0xeee6d6, roughness: 0.85 })

const BO_KAAP_TEX_POOL = 8
const CBD_TEX_POOL = 8
/** @type {THREE.CanvasTexture[]} */
const boKaapTexPool = []
/** @type {THREE.CanvasTexture[]} */
const cbdTexPool = []
/** @type {Map<number, THREE.Material[]>} */
const boKaapMatByColor = new Map()

/**
 * @param {{
 *   cols: number
 *   rows: number
 *   wall: string
 *   frame: string
 *   glassLit: string
 *   glassDark: string
 *   litChance: number
 * }} spec
 */
function makeWindowTexture(spec) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = spec.wall
  ctx.fillRect(0, 0, c.width, c.height)
  const cw = c.width / spec.cols
  const ch = c.height / spec.rows
  const inset = spec.cols <= 3 ? 6 : 2
  for (let y = 0; y < spec.rows; y++) {
    for (let x = 0; x < spec.cols; x++) {
      ctx.fillStyle = spec.frame
      ctx.fillRect(x * cw + inset * 0.4, y * ch + inset * 0.4, cw - inset * 0.8, ch - inset * 0.8)
      ctx.fillStyle = Math.random() < spec.litChance ? spec.glassLit : spec.glassDark
      ctx.fillRect(x * cw + inset, y * ch + inset, cw - inset * 2, ch - inset * 2)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 2
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeBoKaapFacadeTex() {
  return makeWindowTexture({
    cols: 2,
    rows: 3,
    wall: '#ffffff',
    frame: '#f7f3ea',
    glassLit: '#ffe7a8',
    glassDark: '#3d6a88',
    litChance: 0.35,
  })
}

function makeCbdFacadeTex() {
  return makeWindowTexture({
    cols: 5,
    rows: 10,
    wall: '#2a2824',
    frame: '#1a1816',
    glassLit: '#ffd98a',
    glassDark: '#2c333c',
    litChance: 0.22,
  })
}

function pickPooledTexture(pool, limit, factory) {
  if (pool.length < limit) {
    const tex = factory()
    pool.push(tex)
    return tex
  }
  return pool[(Math.random() * pool.length) | 0]
}

/** Box faces: +x, -x, +y, -y, +z, -z */
function makeBoxFacadeMaterials(wallHex, capHex, tex, repeatX, repeatY) {
  const map = tex.clone()
  map.repeat.set(repeatX, repeatY)
  map.needsUpdate = true
  const wall = new THREE.MeshStandardMaterial({
    color: wallHex,
    map,
    roughness: 0.82,
    metalness: 0.05,
  })
  const cap = new THREE.MeshStandardMaterial({
    color: capHex,
    roughness: 0.9,
    metalness: 0.03,
  })
  return [wall, wall, cap, cap, wall, wall]
}

function streetFacing(cx, cz) {
  const nearestX = Math.round(cx / BLOCK) * BLOCK
  const nearestZ = Math.round(cz / BLOCK) * BLOCK
  const dx = cx - nearestX
  const dz = cz - nearestZ
  if (Math.abs(dx) <= Math.abs(dz)) {
    const sign = dx === 0 ? 1 : Math.sign(dx)
    return { nx: sign, nz: 0 }
  }
  const sign = dz === 0 ? 1 : Math.sign(dz)
  return { nx: 0, nz: sign }
}

function addQueuePerson(parent, x, z, hueShift) {
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.85, 4, 8),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08 + hueShift * 0.04, 0.25, 0.28 + hueShift * 0.1),
      roughness: 0.9,
    })
  )
  body.position.set(x, 0.85, z)
  body.castShadow = true
  parent.add(body)
}

/**
 * Swap the Steenbras procedural hut for CapeTownPowerStation.glb.
 * Keeps a box hut if the GLB fails to load (same optional-asset pattern as Table Mountain).
 * @param {THREE.Group} pad
 * @param {number} x
 * @param {number} z
 * @param {(cx: number, cz: number, w: number, d: number, h: number, id?: string) => BuildingCollider} registerCollider
 */
function attachSteenbrasPowerStation(pad, x, z, registerCollider) {
  const hold = new THREE.Group()
  hold.name = 'steenbras-power-station'
  // Behind the load-puzzle deck (deck sits at local +Z on the pad).
  hold.position.set(0, 0, -3.2)
  pad.add(hold)

  let cancelled = false
  pad.userData.cancelPowerStationLoad = () => {
    cancelled = true
  }

  const addFallbackHut = () => {
    const hutMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 5, 7),
      new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 0.85 })
    )
    hutMesh.name = 'steenbras-hut-fallback'
    hutMesh.position.set(0, 2.7, 0)
    hutMesh.castShadow = true
    hold.add(hutMesh)
    registerCollider(x - 2, z - 5.2, 8, 7, 5)
  }

  loadPowerStationTemplate().then(() => {
    if (cancelled) return
    const model = clonePowerStationInstance()
    if (!model) {
      addFallbackHut()
      return
    }
    model.name = 'cape-town-power-station'
    hold.add(model)
    hold.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    registerCollider(center.x, center.z, size.x, size.z, size.y)

    if (import.meta.env.DEV) {
      console.log('[Level4] Cape Town Power Station placed', {
        anchor: { x, z },
        footprint: `${size.x.toFixed(1)} x ${size.z.toFixed(1)}`,
        height: size.y.toFixed(1),
      })
    }
  })
}

/**
 * Place VodacomBuilding.glb at the Level 4 win pad (replaces the procedural V&A hut).
 * @param {THREE.Group} pad
 * @param {number} x
 * @param {number} z
 * @param {(cx: number, cz: number, w: number, d: number, h: number, id?: string) => BuildingCollider} registerCollider
 */
function attachVodacomBuilding(pad, x, z, registerCollider) {
  const hold = new THREE.Group()
  hold.name = 'vodacom-building'
  hold.position.set(0, 0, 0)
  pad.add(hold)

  let cancelled = false
  pad.userData.cancelVodacomLoad = () => {
    cancelled = true
  }

  const addFallbackHut = () => {
    const hutMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 5, 7),
      new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 0.85 })
    )
    hutMesh.name = 'vodacom-hut-fallback'
    hutMesh.position.set(0, 2.7, 0)
    hutMesh.castShadow = true
    hold.add(hutMesh)
    registerCollider(x, z, 8, 7, 5)
  }

  loadVodacomBuildingTemplate().then(() => {
    if (cancelled) return
    const model = cloneVodacomBuildingInstance()
    if (!model) {
      addFallbackHut()
      return
    }
    model.name = 'vodacom-building-mesh'
    hold.add(model)
    hold.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    registerCollider(center.x, center.z, size.x, size.z, size.y)

    if (import.meta.env.DEV) {
      console.log('[Level4] Vodacom Building placed', {
        anchor: { x, z },
        footprint: `${size.x.toFixed(1)} x ${size.z.toFixed(1)}`,
        height: size.y.toFixed(1),
      })
    }
  })
}

/**
 * Place McDonalds.glb on an open city block near the start.
 * @param {THREE.Object3D} parent
 * @param {number} x
 * @param {number} z
 * @param {(cx: number, cz: number, w: number, d: number, h: number, id?: string) => BuildingCollider} registerCollider
 */
function attachMcDonalds(parent, x, z, registerCollider) {
  const hold = new THREE.Group()
  hold.name = 'mcdonalds'
  hold.position.set(x, 0, z)
  parent.add(hold)

  let cancelled = false
  hold.userData.cancelLoad = () => {
    cancelled = true
  }

  loadMcDonaldsTemplate().then(() => {
    if (cancelled) return
    const model = cloneMcDonaldsInstance()
    if (!model) {
      if (import.meta.env.DEV) console.warn('[Level4] McDonalds model missing')
      return
    }
    model.name = 'mcdonalds-mesh'
    hold.add(model)
    hold.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    registerCollider(center.x, center.z, size.x, size.z, size.y)
    if (import.meta.env.DEV) {
      console.log('[Level4] McDonalds placed', {
        anchor: { x, z },
        footprint: `${size.x.toFixed(1)} x ${size.z.toFixed(1)}`,
        height: size.y.toFixed(1),
      })
    }
  })
}

/**
 * @param {THREE.Scene} scene
 * @returns {{
 *   group: THREE.Group
 *   colliders: BuildingCollider[]
 *   setGateOpen: (id: string, open: boolean) => void
 *   setFloodVisible: (on: boolean) => void
 *   setWaterRibbonVisible: (on: boolean) => void
 *   dispose: () => void
 * }}
 */
export function buildCapeTownCity(scene) {
  const group = new THREE.Group()
  group.name = 'level4-city'
  /** @type {BuildingCollider[]} */
  const colliders = []

  const skyTop = new THREE.Color(0xffe8c4)
  const skyBottom = new THREE.Color(0xc4a882)
  const skyGeo = new THREE.SphereGeometry(1800, 32, 32)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: skyTop }, bottom: { value: skyBottom } },
    vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec3 vPos; uniform vec3 top; uniform vec3 bottom;
      void main(){
        float h = normalize(vPos).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottom, top, pow(h, 0.85)), 1.0);
      }`,
  })
  group.add(new THREE.Mesh(skyGeo, skyMat))

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3000, 3000),
    new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      map: crackedGroundTexture(),
      roughness: 1,
    })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1 })
  for (let i = -GRID_N / 2; i <= GRID_N / 2; i++) {
    const x = i * BLOCK
    const roadX = new THREE.Mesh(
      new THREE.PlaneGeometry(STREET_W, GRID_N * BLOCK + STREET_W),
      roadMat
    )
    roadX.rotation.x = -Math.PI / 2
    roadX.position.set(x, 0.03, 0)
    roadX.receiveShadow = true
    group.add(roadX)

    const roadZ = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_N * BLOCK + STREET_W, STREET_W),
      roadMat
    )
    roadZ.rotation.x = -Math.PI / 2
    roadZ.position.set(0, 0.03, x)
    roadZ.receiveShadow = true
    group.add(roadZ)
  }

  const buildingGroup = new THREE.Group()
  group.add(buildingGroup)

  const registerCollider = (cx, cz, w, d, h, id) => {
    /** @type {BuildingCollider} */
    const entry = { x: cx, z: cz, hw: w / 2 + 0.5, hd: d / 2 + 0.5, h, active: true }
    if (id) entry.id = id
    colliders.push(entry)
    return entry
  }

  function addBoKaapOpenings(cx, cz, w, d, h) {
    const { nx, nz } = streetFacing(cx, cz)
    const lift = 0.04
    const doorW = Math.min(0.95, w * 0.28)
    const doorH = 2.05
    const along = nx !== 0 ? d : w
    const shift = (Math.random() - 0.5) * along * 0.22
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), doorWoodMat)
    const step = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.25, 0.12, 0.35), doorStepMat)
    const placeOnFront = (mesh, y, localX, extraOut = 0) => {
      if (nx !== 0) {
        mesh.position.set(cx + nx * (w / 2 + lift + extraOut), y, cz + localX)
        mesh.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2
      } else {
        mesh.position.set(cx + localX, y, cz + nz * (d / 2 + lift + extraOut))
        mesh.rotation.y = nz > 0 ? 0 : Math.PI
      }
      mesh.castShadow = true
      buildingGroup.add(mesh)
    }
    placeOnFront(door, doorH / 2, shift)
    placeOnFront(step, 0.06, shift, 0.12)

    const paneW = Math.min(0.85, w * 0.22)
    const paneH = 0.95
    const side = along * 0.28
    const windowXs = [shift - side, shift + side].filter((x) => Math.abs(x) < along * 0.42)
    for (const wx of windowXs) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(paneW + 0.1, paneH + 0.1, 0.05), paneFrameMat)
      const pane = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.04), paneMat)
      placeOnFront(frame, 3.15, wx)
      placeOnFront(pane, 3.15, wx, 0.02)
      if (h > 7.2) {
        const frame2 = new THREE.Mesh(new THREE.BoxGeometry(paneW + 0.1, paneH + 0.1, 0.05), paneFrameMat)
        const pane2 = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.04), paneMat)
        placeOnFront(frame2, 5.05, wx)
        placeOnFront(pane2, 5.05, wx, 0.02)
      }
    }
  }

  function buildBoKaapHouse(cx, cz, w, d) {
    const h = 5.5 + Math.random() * 3.5
    const color = boKaapPalette[(Math.random() * boKaapPalette.length) | 0]
    let mats = boKaapMatByColor.get(color)
    if (!mats) {
      mats = makeBoxFacadeMaterials(
        color,
        color,
        pickPooledTexture(boKaapTexPool, BO_KAAP_TEX_POOL, makeBoKaapFacadeTex),
        1,
        1
      )
      boKaapMatByColor.set(color, mats)
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)
    mesh.position.set(cx, h / 2, cz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    buildingGroup.add(mesh)
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.45, d + 0.4),
      roofMat
    )
    roof.position.set(cx, h + 0.2, cz)
    buildingGroup.add(roof)
    addBoKaapOpenings(cx, cz, w, d, h)
    registerCollider(cx, cz, w, d, h)
  }

  function buildCbdBlock(cx, cz, w, d) {
    const h = 10 + Math.random() * 12
    const tex = pickPooledTexture(cbdTexPool, CBD_TEX_POOL, makeCbdFacadeTex)
    const rx = Math.max(1, Math.round(w / 10))
    const ry = Math.max(2, Math.round(h / 5))
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      makeBoxFacadeMaterials(0xe8d5b5, 0xb8a078, tex, rx, ry)
    )
    mesh.position.set(cx, h / 2, cz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    buildingGroup.add(mesh)
    registerCollider(cx, cz, w, d, h)
  }

  const skipNear = (bx, bz, ax, az, r) => Math.hypot(bx - ax, bz - az) < r

  const half = GRID_N / 2
  for (let ix = -half; ix < half; ix++) {
    for (let iz = -half; iz < half; iz++) {
      const bx = (ix + 0.5) * BLOCK
      const bz = (iz + 0.5) * BLOCK
      if (skipNear(bx, bz, LEVEL4_ANCHORS.spawn.x, LEVEL4_ANCHORS.spawn.z, 28)) continue
      if (skipNear(bx, bz, LEVEL4_ANCHORS.deWaal.x, LEVEL4_ANCHORS.deWaal.z, 36)) continue
      if (skipNear(bx, bz, LEVEL4_ANCHORS.newlands.x, LEVEL4_ANCHORS.newlands.z, 32)) continue
      if (skipNear(bx, bz, LEVEL4_ANCHORS.steenbras.x, LEVEL4_ANCHORS.steenbras.z, 32)) continue
      if (skipNear(bx, bz, LEVEL4_ANCHORS.vodacom.x, LEVEL4_ANCHORS.vodacom.z, 32)) continue
      if (skipNear(bx, bz, LEVEL4_ANCHORS.mcdonalds.x, LEVEL4_ANCHORS.mcdonalds.z, 30)) continue

      const usable = BLOCK - STREET_W - 4
      const boKaap = bz > 20 && bx < 40
      if (boKaap) {
        const nSplit = 2 + ((Math.random() * 2) | 0)
        const lotW = usable / nSplit
        for (let s = 0; s < nSplit; s++) {
          const lx = bx - usable / 2 + lotW * (s + 0.5)
          const lw = lotW * 0.82
          const ld = usable * (0.4 + Math.random() * 0.35)
          const lz = bz + (Math.random() - 0.5) * (usable - ld) * 0.4
          buildBoKaapHouse(lx, lz, lw, ld)
        }
      } else {
        buildCbdBlock(bx, bz, usable * 0.72, usable * 0.72)
      }
    }
  }

  const mountainGroup = new THREE.Group()
  mountainGroup.name = 'table-mountain'
  mountainGroup.position.set(
    LEVEL4_ANCHORS.tableMountain.x,
    0,
    LEVEL4_ANCHORS.tableMountain.z
  )
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 34, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0xb8a090, roughness: 1 })
  )
  basin.name = 'table-basin'
  basin.position.set(0, 3, 18)
  mountainGroup.add(basin)
  group.add(mountainGroup)

  const queueGroup = new THREE.Group()
  queueGroup.name = 'dry-queue'
  const tap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.4 })
  )
  tap.position.set(-8, 0.7, 68)
  queueGroup.add(tap)
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.1, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xc45c2a })
  )
  sign.position.set(-8, 2.1, 68)
  queueGroup.add(sign)
  for (let i = 0; i < 8; i++) {
    addQueuePerson(queueGroup, -8 + (i % 2) * 0.7, 64 - i * 1.35, i)
  }
  group.add(queueGroup)

  function buildNodePad(name, x, z, color, labelY = 6, { hut = true } = {}) {
    const pad = new THREE.Group()
    pad.name = name
    pad.position.set(x, 0, z)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.4, 18),
      new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
    )
    base.position.y = 0.2
    base.receiveShadow = true
    pad.add(base)
    if (hut) {
      const hutMesh = new THREE.Mesh(
        new THREE.BoxGeometry(8, 5, 7),
        new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 0.85 })
      )
      hutMesh.position.set(0, 2.7, -2)
      hutMesh.castShadow = true
      pad.add(hutMesh)
      registerCollider(x - 2, z - 2, 8, 7, 5)
    }
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, labelY, 8),
      new THREE.MeshBasicMaterial({ color: 0x7ee0ff, transparent: true, opacity: 0.7 })
    )
    beacon.position.y = labelY / 2 + 1
    beacon.name = `${name}-beacon`
    pad.add(beacon)
    group.add(pad)
    return pad
  }

  buildNodePad('node-newlands', LEVEL4_ANCHORS.newlands.x, LEVEL4_ANCHORS.newlands.z, 0x7a8f5a, 6, {
    hut: false,
  })
  const steenbrasPad = buildNodePad(
    'node-steenbras',
    LEVEL4_ANCHORS.steenbras.x,
    LEVEL4_ANCHORS.steenbras.z,
    0x3d4a62,
    6,
    { hut: false }
  )
  attachSteenbrasPowerStation(
    steenbrasPad,
    LEVEL4_ANCHORS.steenbras.x,
    LEVEL4_ANCHORS.steenbras.z,
    registerCollider
  )
  const vodacomPad = buildNodePad(
    'node-vodacom',
    LEVEL4_ANCHORS.vodacom.x,
    LEVEL4_ANCHORS.vodacom.z,
    0xe6007e,
    8,
    { hut: false }
  )
  attachVodacomBuilding(
    vodacomPad,
    LEVEL4_ANCHORS.vodacom.x,
    LEVEL4_ANCHORS.vodacom.z,
    registerCollider
  )
  attachMcDonalds(group, LEVEL4_ANCHORS.mcdonalds.x, LEVEL4_ANCHORS.mcdonalds.z, registerCollider)

  const deWaal = new THREE.Group()
  deWaal.name = 'node-dewaal'
  deWaal.position.set(LEVEL4_ANCHORS.deWaal.x, 0, LEVEL4_ANCHORS.deWaal.z)
  const flood = new THREE.Mesh(
    new THREE.CircleGeometry(16, 28),
    new THREE.MeshStandardMaterial({
      color: 0x3a8eb8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.15,
      metalness: 0.2,
    })
  )
  flood.rotation.x = -Math.PI / 2
  flood.position.y = 0.12
  flood.name = 'dewaal-flood'
  flood.raycast = () => {}
  deWaal.add(flood)
  group.add(deWaal)

  const ribbon = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, Math.hypot(LEVEL4_ANCHORS.deWaal.x, LEVEL4_ANCHORS.deWaal.z - 80)),
    new THREE.MeshStandardMaterial({
      color: 0x4ec4e8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
    })
  )
  ribbon.rotation.x = -Math.PI / 2
  const midX = LEVEL4_ANCHORS.deWaal.x * 0.5
  const midZ = (LEVEL4_ANCHORS.deWaal.z + 80) * 0.5
  ribbon.position.set(midX, 0.08, midZ)
  ribbon.rotation.z = Math.atan2(
    LEVEL4_ANCHORS.deWaal.x - 0,
    LEVEL4_ANCHORS.spawn.z - LEVEL4_ANCHORS.deWaal.z
  )
  ribbon.name = 'water-ribbon'
  ribbon.visible = false
  group.add(ribbon)

  const ribbon2 = new THREE.Mesh(
    new THREE.PlaneGeometry(
      4.2,
      Math.hypot(
        LEVEL4_ANCHORS.newlands.x - LEVEL4_ANCHORS.spawn.x,
        LEVEL4_ANCHORS.newlands.z - LEVEL4_ANCHORS.spawn.z
      )
    ),
    new THREE.MeshStandardMaterial({
      color: 0x4ec4e8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
    })
  )
  ribbon2.rotation.x = -Math.PI / 2
  ribbon2.position.set(
    (LEVEL4_ANCHORS.newlands.x + LEVEL4_ANCHORS.spawn.x) * 0.5,
    0.09,
    (LEVEL4_ANCHORS.newlands.z + LEVEL4_ANCHORS.spawn.z) * 0.5
  )
  ribbon2.rotation.z = Math.atan2(
    LEVEL4_ANCHORS.newlands.x - LEVEL4_ANCHORS.spawn.x,
    LEVEL4_ANCHORS.spawn.z - LEVEL4_ANCHORS.newlands.z
  )
  ribbon2.name = 'water-ribbon-newlands'
  ribbon2.visible = false
  group.add(ribbon2)

  function buildGate(id, x, z, rotY) {
    const gate = new THREE.Group()
    gate.name = id
    gate.position.set(x, 0, z)
    gate.rotation.y = rotY
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(14, 2.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x8a3a28, roughness: 0.7 })
    )
    bar.position.y = 1.1
    bar.castShadow = true
    gate.add(bar)
    const postL = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 3.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x4a2a18 })
    )
    postL.position.set(-6.5, 1.6, 0)
    gate.add(postL)
    const postR = postL.clone()
    postR.position.x = 6.5
    gate.add(postR)
    group.add(gate)
    const col = registerCollider(x, z, 14, 2.4, 3.2, id)
    return { gate, col }
  }

  const newlandsGate = buildGate(
    'gate-newlands',
    (LEVEL4_ANCHORS.newlands.x + LEVEL4_ANCHORS.spawn.x) * 0.55,
    (LEVEL4_ANCHORS.newlands.z + LEVEL4_ANCHORS.spawn.z) * 0.55,
    Math.atan2(
      LEVEL4_ANCHORS.newlands.x - LEVEL4_ANCHORS.spawn.x,
      LEVEL4_ANCHORS.newlands.z - LEVEL4_ANCHORS.spawn.z
    )
  )
  const steenbrasGate = buildGate(
    'gate-steenbras',
    (LEVEL4_ANCHORS.steenbras.x + LEVEL4_ANCHORS.deWaal.x) * 0.5,
    (LEVEL4_ANCHORS.steenbras.z + LEVEL4_ANCHORS.deWaal.z) * 0.55,
    0.4
  )

  scene.add(group)

  const setGateOpen = (id, open) => {
    for (const c of colliders) {
      if (c.id === id) c.active = !open
    }
    const obj = group.getObjectByName(id)
    if (obj) obj.visible = !open
  }

  return {
    group,
    colliders,
    setGateOpen,
    setFloodVisible(on) {
      const f = group.getObjectByName('dewaal-flood')
      if (f) f.visible = on
    },
    setWaterRibbonVisible(on) {
      const r = group.getObjectByName('water-ribbon')
      if (r) r.visible = on
    },
    setNewlandsRibbonVisible(on) {
      const r = group.getObjectByName('water-ribbon-newlands')
      if (r) r.visible = on
    },
    setReservoirFilled(on) {
      const b = group.getObjectByName('table-basin')
      if (b?.material) {
        b.material.color.setHex(on ? 0x3aa7d4 : 0xb8a090)
      }
    },
    dispose() {
      void newlandsGate
      void steenbrasGate
      const steenbras = group.getObjectByName('node-steenbras')
      steenbras?.userData.cancelPowerStationLoad?.()
      const vodacom = group.getObjectByName('node-vodacom')
      vodacom?.userData.cancelVodacomLoad?.()
      group.getObjectByName('mcdonalds')?.userData.cancelLoad?.()
      scene.remove(group)
      disposeObject3D(group)
      disposeGeometries(group)
    },
  }
}
