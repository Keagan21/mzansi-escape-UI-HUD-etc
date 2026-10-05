// level8City.js — Compact Soweto storm map: ridge route, canal, rising water, landmarks.

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL8_WATER_ZONES } from './level8Water.js'

export const LEVEL8_HALF_X = 80
export const LEVEL8_HALF_Z = 110

export const LEVEL8_WORLD_BOUNDS = {
  minX: -LEVEL8_HALF_X + 1,
  maxX: LEVEL8_HALF_X - 1,
  minZ: -LEVEL8_HALF_Z + 1,
  maxZ: LEVEL8_HALF_Z - 1,
}

export const LEVEL8_ANCHORS = {
  spawn: { x: 0, z: 96 },
  clinic: { x: 48, z: 40 },
  school: { x: -40, z: -8 },
  spaza: { x: 28, z: -52 },
  crate: { x: 52, z: -40 },
  home: { x: -34, z: -96 },
}

export const LEVEL8_CHECKPOINTS = [
  { id: 'start', x: 0, z: 96 },
  { id: 'clinic', x: 48, z: 40 },
  { id: 'school', x: -40, z: -8 },
  { id: 'spaza', x: 28, z: -52 },
]

/** Corner Shell garages — not every block, only landmark T-junctions. */
export const LEVEL8_SHELL_SPOTS = [
  { id: 'north-gate', x: 18, z: 84, ry: -Math.PI / 2 },
  { id: 'clinic-t', x: 18, z: 28, ry: 0 },
  { id: 'school-t', x: -18, z: 8, ry: Math.PI / 2 },
  { id: 'home-south', x: 18, z: -98, ry: -Math.PI / 2 },
]

/** Engen on the west side so Shell stays east. */
export const LEVEL8_ENGEN_SPOTS = [
  { id: 'nw-gate', x: -18, z: 84, ry: Math.PI / 2 },
  { id: 'school-west', x: -18, z: -22, ry: Math.PI / 2 },
]

/** One KFC on Chris Hani Drive — a landmark, not every corner. */
export const LEVEL8_KFC_SPOTS = [{ id: 'hani', x: -38, z: 70, ry: Math.PI / 2 }]

/**
 * Named streets the HUD and boards send you down.
 * `alongZ` true = north–south (Vilakazi). False = east–west.
 */
export const LEVEL8_STREETS = [
  { id: 'vilakazi', name: 'Vilakazi Ridge', x: 0, z: 0, w: 18, d: 210, alongZ: true, paint: false },
  { id: 'hani', name: 'Chris Hani Drive', x: -34, z: 70, w: 52, d: 12, alongZ: false, paint: true },
  { id: 'clinic', name: 'Clinic Road', x: 36, z: 40, w: 56, d: 12, alongZ: false, paint: true },
  { id: 'school', name: 'School Road', x: -36, z: -8, w: 56, d: 14, alongZ: false, paint: true },
  { id: 'spaza', name: 'Spaza Lane', x: 34, z: -52, w: 52, d: 12, alongZ: false, paint: true },
]

export function navStreetGuide(beats) {
  if (!beats.clinic) {
    return { street: 'Clinic Road', turn: 'EAST off Vilakazi Ridge (past Shell)' }
  }
  if (!beats.school) {
    return { street: 'School Road', turn: 'WEST off Vilakazi Ridge (past Engen)' }
  }
  if (!beats.crate) {
    return { street: 'Spaza Lane', turn: 'EAST off Vilakazi Ridge' }
  }
  if (!beats.spaza) {
    return { street: 'Spaza Lane', turn: 'back to the spaza on this street' }
  }
  return { street: 'Vilakazi Ridge', turn: 'SOUTH, then WEST to Home (off the road)' }
}

export const LEVEL8_CHECKPOINT_RADIUS = 8
export const LEVEL8_INTERACT_RADIUS = 10
export const LEVEL8_WIN_RADIUS = 10
export const LEVEL8_MAX_SOAKINGS = 3
export const LEVEL8_SOAK_BONUS_MS = 12000
export const LEVEL8_ALL_TIPS_BONUS_MS = 8000

const HOUSE_PALETTE = [0xc45c26, 0xd9a441, 0x6b8f3c, 0xc4a574, 0x4a6fa5, 0xb85c38]
const GRAFFITI = [
  { x: -16, z: 86, text: 'HIGH GROUND', color: '#ffe14a' },
  { x: 18, z: 28, text: "DON'T WADE", color: '#ffffff' },
  { x: -18, z: -70, text: 'STAY ON THE RIDGE', color: '#7ee0ff' },
]

const RIDGE_HOUSES = [
  { x: 18, z: 78, nx: -1, nz: 0 },
  { x: -18, z: 50, nx: 1, nz: 0 },
  { x: 18, z: 8, nx: -1, nz: 0 },
  { x: -18, z: -48, nx: 1, nz: 0 },
  { x: 16, z: -88, nx: -1, nz: 0 },
]

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function wetGroundTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#3d3a36'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 700; i++) {
    const v = 40 + Math.random() * 50
    ctx.fillStyle = `rgba(${v}, ${v - 4}, ${v - 10}, ${0.15 + Math.random() * 0.25})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2 + Math.random() * 4)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(28, 36)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function waterTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1a4a62'
  ctx.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 128; y += 6) {
    ctx.strokeStyle = `rgba(180, 230, 255, ${0.12 + (y % 12) * 0.02})`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(32, y + 4, 96, y - 4, 128, y)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 10)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function corrugatedTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  for (let x = 0; x < 64; x++) {
    const v = 140 + Math.sin((x / 64) * Math.PI * 8) * 40
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`
    ctx.fillRect(x, 0, 1, 64)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function textPanelTexture(text, { bg, fg, font, width = 1024, height = 256 }) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = parseInt(font, 10)
  const family = font.replace(/^\s*\d+px\s*/, '')
  ctx.font = `bold ${size}px ${family}`
  while (ctx.measureText(text).width > width * 0.9 && size > 18) {
    size -= 4
    ctx.font = `bold ${size}px ${family}`
  }
  ctx.fillText(text, width / 2, height / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function graffitiTexture(text, color) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 320
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1b1c20'
  ctx.fillRect(0, 0, 1024, 320)
  ctx.save()
  ctx.translate(512, 160)
  ctx.rotate(-0.03)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 92px Impact, "Arial Black", sans-serif'
  ctx.lineWidth = 10
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.strokeText(text, 0, 0)
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0)
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function bakedBox(w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  if (ry) g.rotateY(ry)
  g.translate(x, y, z)
  return g
}

function overlapsReserved(x, z, hw, hd) {
  const boxes = [
    { x: 0, z: 96, hw: 24, hd: 18 },
    { x: 0, z: 0, hw: 11, hd: 112 },
    { x: 36, z: 40, hw: 30, hd: 12 },
    { x: -36, z: -8, hw: 30, hd: 16 },
    { x: 34, z: -52, hw: 30, hd: 14 },
    { x: 52, z: -40, hw: 10, hd: 8 },
    { x: -26, z: -94, hw: 16, hd: 14 },
    { x: 70, z: 0, hw: 12, hd: 112 },
    { x: -32, z: 70, hw: 28, hd: 10 },
    ...LEVEL8_SHELL_SPOTS.map((s) => ({ x: s.x, z: s.z, hw: 12, hd: 12 })),
    ...LEVEL8_ENGEN_SPOTS.map((s) => ({ x: s.x, z: s.z, hw: 12, hd: 12 })),
    ...LEVEL8_KFC_SPOTS.map((s) => ({ x: s.x, z: s.z, hw: 12, hd: 12 })),
  ]
  return boxes.some(
    (b) => Math.abs(x - b.x) < hw + b.hw && Math.abs(z - b.z) < hd + b.hd
  )
}

/**
 * @param {THREE.Scene} scene
 */
export function buildSowetoStormCity(scene) {
  const group = new THREE.Group()
  group.name = 'level8-city'
  /** @type {{ x: number, z: number, hw: number, hd: number, h: number, active?: boolean }[]} */
  const colliders = []
  const rand = mulberry32(8080)

  const addSolid = (x, z, hw, hd, h, pad = 0.12) => {
    colliders.push({ x, z, hw: hw + pad, hd: hd + pad, h, active: true })
  }

  const groundTex = wetGroundTexture()
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(LEVEL8_HALF_X * 2 + 80, LEVEL8_HALF_Z * 2 + 80),
    new THREE.MeshStandardMaterial({ color: 0x4a463f, map: groundTex, roughness: 0.92 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  const ridge = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 210),
    new THREE.MeshStandardMaterial({
      color: 0x5a5348,
      roughness: 0.88,
      metalness: 0.04,
    })
  )
  ridge.rotation.x = -Math.PI / 2
  ridge.position.set(0, 0.04, 0)
  ridge.receiveShadow = true
  group.add(ridge)

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffe566 })
  for (let z = 90; z > -100; z -= 10) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 4.2), dashMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(0, 0.06, z)
    group.add(dash)
  }

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x5a5348,
    roughness: 0.88,
    metalness: 0.04,
  })
  const whiteDash = new THREE.MeshBasicMaterial({ color: 0xf4f1ea })
  for (const street of LEVEL8_STREETS) {
    if (!street.paint) continue
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(street.w, street.d), asphaltMat)
    deck.rotation.x = -Math.PI / 2
    deck.position.set(street.x, 0.045, street.z)
    deck.receiveShadow = true
    group.add(deck)
    if (street.alongZ) {
      for (let z = street.z - street.d / 2 + 4; z < street.z + street.d / 2 - 2; z += 10) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3.6), whiteDash)
        dash.rotation.x = -Math.PI / 2
        dash.position.set(street.x, 0.06, z)
        group.add(dash)
      }
    } else {
      for (let x = street.x - street.w / 2 + 4; x < street.x + street.w / 2 - 2; x += 10) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.3), whiteDash)
        dash.rotation.x = -Math.PI / 2
        dash.position.set(x, 0.06, street.z)
        group.add(dash)
      }
    }
  }

  const addStreetBlade = (x, z, ry, name) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 3.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.45, roughness: 0.4 })
    )
    pole.position.set(x, 1.55, z)
    pole.castShadow = true
    const tex = textPanelTexture(name, {
      bg: '#1b5e20',
      fg: '#fffde7',
      font: '64px Arial, sans-serif',
      width: 1024,
      height: 220,
    })
    const blade = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.72),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.28,
        side: THREE.DoubleSide,
      })
    )
    blade.position.set(x, 2.85, z)
    blade.rotation.y = ry
    group.add(pole, blade)
  }

  const addMissionBoard = (x, z, ry, title, sub) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 2.6, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 })
    )
    post.position.set(x, 1.3, z)
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f9a825'
    ctx.fillRect(0, 0, 1024, 512)
    ctx.fillStyle = '#1b1c20'
    ctx.fillRect(18, 18, 988, 476)
    ctx.fillStyle = '#f9a825'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 92px Arial, sans-serif'
    ctx.fillText(title, 512, 180)
    ctx.font = 'bold 56px Arial, sans-serif'
    ctx.fillStyle = '#fff8e1'
    ctx.fillText(sub, 512, 340)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.8),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      })
    )
    board.position.set(x, 2.55, z)
    board.rotation.y = ry
    group.add(post, board)
  }

  addStreetBlade(12.4, 90, 0, 'VILAKAZI RIDGE')
  addStreetBlade(-12.4, 72, Math.PI / 2, 'CHRIS HANI DRIVE')
  addStreetBlade(12.4, 42, Math.PI / 2, 'CLINIC ROAD')
  addStreetBlade(-12.4, -6, -Math.PI / 2, 'SCHOOL ROAD')
  addStreetBlade(12.4, -50, Math.PI / 2, 'SPAZA LANE')
  addStreetBlade(12.4, -80, 0, 'VILAKAZI RIDGE')

  addMissionBoard(12.6, 88, 0, 'TO CLINIC', 'EAST → Clinic Road')
  addMissionBoard(-12.6, 88, 0, 'TO KFC / ENGEN', 'WEST ← Chris Hani Drive')
  addMissionBoard(12.6, 50, 0, 'CLINIC', 'Turn EAST onto Clinic Road')
  addMissionBoard(-12.6, 2, 0, 'SCHOOL', 'Turn WEST onto School Road')
  addMissionBoard(12.6, -42, 0, 'SPAZA', 'Turn EAST onto Spaza Lane')
  addMissionBoard(-12.6, -76, 0, 'HOME', 'WEST off Vilakazi Ridge')

  const fenceTex = corrugatedTexture()
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x6a6a6a,
    map: fenceTex,
    metalness: 0.35,
    roughness: 0.7,
  })
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x6f7278,
    map: fenceTex,
    metalness: 0.45,
    roughness: 0.55,
  })
  const houseMats = HOUSE_PALETTE.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.04 })
  )
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.8 })
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x87c8e8,
    emissive: 0xffc070,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  })

  const fenceGeos = []
  const roofGeos = []
  const houseGeos = HOUSE_PALETTE.map(() => [])
  const doorGeos = []
  const windowGeos = []

  const addHouse = (x, z, w, d, h, pal) => {
    houseGeos[pal].push(bakedBox(w, h, d, x, h / 2, z))
    roofGeos.push(bakedBox(w + 0.5, 0.28, d + 0.5, x, h + 0.12, z))
    doorGeos.push(bakedBox(1.1, 1.8, 0.12, x, 0.9, z + d / 2 + 0.04))
    windowGeos.push(bakedBox(0.9, 0.7, 0.08, x - w * 0.28, h * 0.62, z + d / 2 + 0.05))
    windowGeos.push(bakedBox(0.9, 0.7, 0.08, x + w * 0.28, h * 0.62, z + d / 2 + 0.05))
    addSolid(x, z, w / 2, d / 2, h)
  }

  fenceGeos.push(bakedBox(LEVEL8_HALF_X * 2 + 2, 2.6, 1, 0, 1.3, LEVEL8_HALF_Z + 0.5))
  fenceGeos.push(bakedBox(LEVEL8_HALF_X * 2 + 2, 2.6, 1, 0, 1.3, -LEVEL8_HALF_Z - 0.5))
  fenceGeos.push(bakedBox(1, 2.6, LEVEL8_HALF_Z * 2 + 2, LEVEL8_HALF_X + 0.5, 1.3, 0))
  fenceGeos.push(bakedBox(1, 2.6, LEVEL8_HALF_Z * 2 + 2, -LEVEL8_HALF_X - 0.5, 1.3, 0))
  addSolid(0, LEVEL8_HALF_Z + 0.5, LEVEL8_HALF_X + 1, 0.6, 2.6)
  addSolid(0, -LEVEL8_HALF_Z - 0.5, LEVEL8_HALF_X + 1, 0.6, 2.6)
  addSolid(LEVEL8_HALF_X + 0.5, 0, 0.6, LEVEL8_HALF_Z + 1, 2.6)
  addSolid(-LEVEL8_HALF_X - 0.5, 0, 0.6, LEVEL8_HALF_Z + 1, 2.6)

  for (let gx = -66; gx <= 50; gx += 20) {
    for (let gz = 92; gz >= -96; gz -= 20) {
      if (overlapsReserved(gx, gz, 7.5, 7.5)) continue
      const w = 8 + rand() * 4
      const d = 7 + rand() * 3.5
      const h = 3 + rand() * 1.4
      addHouse(gx, gz, w, d, h, (rand() * HOUSE_PALETTE.length) | 0)
      if (rand() > 0.55) {
        fenceGeos.push(bakedBox(w + 3.2, 1.8, 0.12, gx, 0.9, gz + d / 2 + 1.6))
      }
    }
  }

  const addMerged = (geos, mat, { cast = true, receive = true } = {}) => {
    if (!geos.length) return null
    const merged = mergeGeometries(geos, false)
    for (const g of geos) g.dispose()
    if (!merged) return null
    const mesh = new THREE.Mesh(merged, mat)
    mesh.castShadow = cast
    mesh.receiveShadow = receive
    group.add(mesh)
    return mesh
  }
  addMerged(fenceGeos, fenceMat)
  addMerged(roofGeos, roofMat)
  houseGeos.forEach((geos, i) => addMerged(geos, houseMats[i]))
  addMerged(doorGeos, doorMat, { cast: false })
  addMerged(windowGeos, windowMat, { cast: false })

  const porchLights = []
  const porchMat = new THREE.MeshBasicMaterial({ color: 0xffe082 })
  for (const s of RIDGE_HOUSES) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), porchMat)
    bulb.position.set(s.x + s.nx * 0.4, 2.5, s.z + s.nz * 0.4)
    group.add(bulb)
    const light = new THREE.PointLight(0xffe082, 0.55, 11, 1.5)
    light.position.set(s.x + s.nx * 1.1, 2.3, s.z + s.nz * 1.1)
    group.add(light)
    porchLights.push(light)
  }

  for (const g of GRAFFITI) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 2.8, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.95 })
    )
    slab.position.set(g.x, 1.4, g.z)
    group.add(slab)
    const tex = graffitiTexture(g.text, g.color)
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(7.8, 2.5),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.22,
        roughness: 0.9,
      })
    )
    plane.position.set(g.x, 1.4, g.z + 0.16)
    group.add(plane)
  }

  const addLandmark = (anchor, opts) => {
    const root = new THREE.Group()
    root.position.set(anchor.x, 0, anchor.z)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(opts.w, opts.h, opts.d),
      new THREE.MeshStandardMaterial({ color: opts.color, roughness: 0.72 })
    )
    body.position.y = opts.h / 2
    body.castShadow = true
    body.receiveShadow = true
    root.add(body)
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(opts.w + 0.6, 0.28, opts.d + 0.6),
      new THREE.MeshStandardMaterial({ color: opts.roof, roughness: 0.55 })
    )
    roof.position.y = opts.h + 0.12
    root.add(roof)
    const tex = textPanelTexture(opts.label, {
      bg: opts.signBg,
      fg: opts.signFg,
      font: '72px Arial, sans-serif',
      width: 1024,
      height: 180,
    })
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.w * 0.85, 1.6),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.45,
      })
    )
    sign.position.set(0, opts.h - 0.9, opts.d / 2 + 0.08)
    root.add(sign)
    group.add(root)
    addSolid(anchor.x, anchor.z, opts.w / 2, opts.d / 2, opts.h)
    return { root, tex }
  }

  const clinic = addLandmark(LEVEL8_ANCHORS.clinic, {
    w: 14,
    h: 4.2,
    d: 10,
    color: 0xf4f1ea,
    roof: 0xc62828,
    label: 'SOWETO CLINIC',
    signBg: '#ffffff',
    signFg: '#c62828',
  })
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0xc62828,
    emissive: 0xc62828,
    emissiveIntensity: 0.55,
  })
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.2, 0.12), crossMat)
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 0.12), crossMat)
  crossV.position.set(-4.2, 2.4, 5.08)
  crossH.position.set(-4.2, 2.4, 5.08)
  clinic.root.add(crossV, crossH)

  addLandmark(LEVEL8_ANCHORS.school, {
    w: 16,
    h: 4.4,
    d: 11,
    color: 0xe8d48a,
    roof: 0x1565c0,
    label: 'PRIMARY SCHOOL',
    signBg: '#1565c0',
    signFg: '#fff59d',
  })

  addLandmark(LEVEL8_ANCHORS.spaza, {
    w: 9,
    h: 3.6,
    d: 8,
    color: 0xffc107,
    roof: 0xef6c00,
    label: 'SPAZA SHOP',
    signBg: '#ef6c00',
    signFg: '#fff8e1',
  })

  const home = addLandmark(LEVEL8_ANCHORS.home, {
    w: 11,
    h: 4,
    d: 9,
    color: 0xd7a35a,
    roof: 0x5d4037,
    label: 'HOME',
    signBg: '#5d4037',
    signFg: '#ffe082',
  })
  const homeLight = new THREE.PointLight(0xfff0c0, 1.15, 18, 1.3)
  homeLight.position.set(0, 3.4, 6)
  home.root.add(homeLight)
  const homeBeacon = new THREE.Mesh(
    new THREE.RingGeometry(9.2, 10, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffe566,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  homeBeacon.rotation.x = -Math.PI / 2
  homeBeacon.position.y = 0.07
  home.root.add(homeBeacon)

  const crateGroup = new THREE.Group()
  crateGroup.position.set(LEVEL8_ANCHORS.crate.x, 0.45, LEVEL8_ANCHORS.crate.z)
  const crateMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x8d6e3d, roughness: 0.85 })
  )
  crateMesh.castShadow = true
  crateGroup.add(crateMesh)
  const crateGlow = new THREE.PointLight(0xffcc66, 0.5, 6, 2)
  crateGlow.position.y = 0.5
  crateGroup.add(crateGlow)
  group.add(crateGroup)

  const waterTex = waterTexture()
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2a7ea8,
    map: waterTex,
    transparent: true,
    opacity: 0.72,
    roughness: 0.2,
    metalness: 0.15,
    depthWrite: false,
  })
  const waterMeshes = LEVEL8_WATER_ZONES.map((zone) => {
    const w = zone.maxX - zone.minX
    const d = zone.maxZ - zone.minZ
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat.clone())
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set((zone.minX + zone.maxX) / 2, -0.4, (zone.minZ + zone.maxZ) / 2)
    mesh.visible = zone.minStage === 0
    group.add(mesh)
    return { mesh, zone, targetY: zone.minStage === 0 ? zone.height * 0.42 : -0.4 }
  })

  const rainGeo = new THREE.BufferGeometry()
  const rainCount = 900
  const rainPos = new Float32Array(rainCount * 3)
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 160
    rainPos[i * 3 + 1] = Math.random() * 22
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 220
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({
      color: 0xb8d4e8,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  )
  group.add(rain)

  const paperGroup = new THREE.Group()
  paperGroup.name = 'level8-papers'
  const paperGeo = new THREE.PlaneGeometry(0.28, 0.38)
  const paperMats = [0xf5f0e6, 0xe8dcc8, 0xfff8e1, 0xd7d2c8].map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.95,
        side: THREE.DoubleSide,
      })
  )
  const papers = Array.from({ length: 86 }, () => {
    const mesh = new THREE.Mesh(paperGeo, paperMats[(Math.random() * paperMats.length) | 0])
    mesh.position.set((Math.random() - 0.5) * 78, 0.06 + Math.random() * 0.35, (Math.random() - 0.5) * 200)
    mesh.rotation.set(Math.random(), Math.random() * 6, Math.random())
    paperGroup.add(mesh)
    return {
      mesh,
      vx: 2 + Math.random() * 6,
      vy: 1 + Math.random() * 3,
      spin: 1.5 + Math.random() * 4,
    }
  })
  group.add(paperGroup)

  const ringGeo = new THREE.RingGeometry(
    LEVEL8_CHECKPOINT_RADIUS - 0.7,
    LEVEL8_CHECKPOINT_RADIUS,
    48
  )
  const checkpointRings = new Map()
  for (const cp of LEVEL8_CHECKPOINTS) {
    const mesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0x7ee0ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(cp.x, 0.06, cp.z)
    group.add(mesh)
    checkpointRings.set(cp.id, { mesh, target: 0.3 })
  }

  scene.add(group)
  let pulseT = 0
  let rainHeavy = false
  let waterStage = 0

  const applyWaterStage = (stage) => {
    waterStage = stage
    for (const item of waterMeshes) {
      const on = stage >= item.zone.minStage
      item.mesh.visible = on
      item.targetY = on ? item.zone.height * 0.42 : -0.45
    }
  }
  applyWaterStage(0)

  return {
    group,
    colliders,
    crateGroup,
    setWaterStage: applyWaterStage,
    getWaterStage: () => waterStage,
    setRainHeavy(on) {
      rainHeavy = on
    },
    setCrateCarrying(carrying) {
      crateGroup.visible = !carrying
      if (!carrying) {
        crateGroup.position.set(LEVEL8_ANCHORS.crate.x, 0.45, LEVEL8_ANCHORS.crate.z)
      }
    },
    setCheckpointActive(id, active) {
      const ring = checkpointRings.get(id)
      if (ring) ring.target = active ? 0 : 0.3
    },
    resetCheckpoints() {
      for (const ring of checkpointRings.values()) {
        ring.target = 0.3
        ring.mesh.material.opacity = 0.3
        ring.mesh.visible = true
      }
    },
    /** @param {number} dt */
    update(dt) {
      pulseT += dt
      const k = Math.min(1, dt * 2.4)
      for (const ring of checkpointRings.values()) {
        const mat = ring.mesh.material
        mat.opacity += (ring.target - mat.opacity) * k
        ring.mesh.visible = mat.opacity > 0.01
      }
      homeBeacon.material.opacity = 0.32 + Math.sin(pulseT * 2.2) * 0.12
      for (const light of porchLights) light.intensity = 0.45 + Math.sin(pulseT * 1.5) * 0.08
      for (const item of waterMeshes) {
        item.mesh.position.y += (item.targetY - item.mesh.position.y) * Math.min(1, dt * 1.6)
        const mat = item.mesh.material
        if (mat.map) {
          mat.map.offset.x = (pulseT * 0.04 * (item.zone.current?.x || 1)) % 1
          mat.map.offset.y = (pulseT * 0.08 * (item.zone.current?.z || 1)) % 1
        }
      }
      const attr = rain.geometry.attributes.position
      const fall = rainHeavy ? 28 : 14
      rain.material.opacity = rainHeavy ? 0.72 : 0.38
      rain.material.size = rainHeavy ? 0.16 : 0.11
      for (let i = 0; i < rainCount; i++) {
        attr.array[i * 3 + 1] -= fall * dt
        attr.array[i * 3] += dt * (rainHeavy ? 3.5 : 1.4)
        if (attr.array[i * 3 + 1] < 0) {
          attr.array[i * 3 + 1] = 18 + Math.random() * 6
          attr.array[i * 3] = (Math.random() - 0.5) * 160
          attr.array[i * 3 + 2] = (Math.random() - 0.5) * 220
        }
      }
      attr.needsUpdate = true
      const wind = rainHeavy ? 2.4 : 0.18
      for (const p of papers) {
        p.mesh.position.x += p.vx * dt * wind
        p.mesh.position.y +=
          rainHeavy
            ? Math.abs(Math.sin(pulseT * p.spin * 1.8)) * dt * p.vy * 2.6
            : Math.sin(pulseT * p.spin) * dt * p.vy * 0.12
        p.mesh.position.z += (rainHeavy ? 9.5 : 0.35) * dt
        p.mesh.rotation.x += dt * p.spin * wind
        p.mesh.rotation.y += dt * p.spin * 0.9 * wind
        p.mesh.rotation.z += dt * p.spin * 0.4 * wind
        if (rainHeavy) {
          if (p.mesh.position.y > 6.5) p.mesh.position.y = 0.08
        } else if (p.mesh.position.y < 0.06) {
          p.mesh.position.y = 0.06
        }
        if (p.mesh.position.x > 42) p.mesh.position.x = -42
        if (p.mesh.position.x < -42) p.mesh.position.x = 42
        if (p.mesh.position.z > 110) p.mesh.position.z = -110
      }
    },
    dispose() {
      scene.remove(group)
      ringGeo.dispose()
      rainGeo.dispose()
      paperGeo.dispose()
      for (const m of paperMats) m.dispose()
      disposeObject3D(group)
      groundTex.dispose()
      waterTex.dispose()
      fenceTex.dispose()
    },
  }
}
