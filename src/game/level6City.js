// level6City.js — Handcrafted Cape Flats night maze: RDP lots, zinc fences, sandy passages.

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { disposeObject3D } from './threeDispose.js'

/** Map is roughly 180 (x) by 280 (z); the player walks from +z (spawn) toward -z. */
export const LEVEL6_HALF_X = 90
export const LEVEL6_HALF_Z = 140

export const LEVEL6_WORLD_BOUNDS = {
  minX: -LEVEL6_HALF_X + 1,
  maxX: LEVEL6_HALF_X - 1,
  minZ: -LEVEL6_HALF_Z + 1,
  maxZ: LEVEL6_HALF_Z - 1,
}

export const LEVEL6_ANCHORS = {
  spawn: { x: 0, z: 120 },
  careCentre: { x: 5, z: -120 },
}

export const LEVEL6_CHECKPOINTS = [
  { id: 'start', x: 0, z: 120 },
  { id: 'midA', x: 55, z: 20 },
  { id: 'midB', x: -37, z: -30 },
  { id: 'final', x: 8, z: -95 },
]

export const LEVEL6_CHECKPOINT_RADIUS = 8

const FENCE_H = 2.2

/**
 * Perimeter + interior walls. `w` spans X and `d` spans Z (before `ry`).
 * Entries thinner than 1 unit render as a single zinc fence run; wider entries
 * are fenced lots filled with RDP houses. Every entry is a solid collider.
 * Zones: 1 = z 60..140, 2 = z -46..48, 3 = z -140..-58.
 * @type {{ x: number, z: number, w: number, h: number, d: number, ry: number }[]}
 */
export const LEVEL6_WALLS = [
  // Perimeter
  { x: 0, z: 140.5, w: 182, h: 2.6, d: 1, ry: 0 },
  { x: 0, z: -140.5, w: 182, h: 2.6, d: 1, ry: 0 },
  { x: 90.5, z: 0, w: 1, h: 2.6, d: 282, ry: 0 },
  { x: -90.5, z: 0, w: 1, h: 2.6, d: 282, ry: 0 },

  // Zone 1 — north strip. Kept thin so the chase camera (10 units behind spawn) stays in the lane.
  { x: -60, z: 136.5, w: 60, h: FENCE_H, d: 7, ry: 0 },
  { x: 0, z: 136.5, w: 44, h: FENCE_H, d: 7, ry: 0 },
  { x: 60, z: 136.5, w: 60, h: FENCE_H, d: 7, ry: 0 },
  // Zone 1 — row B (passages x -64, -20, 20, 56)
  { x: -79, z: 106, w: 22, h: FENCE_H, d: 20, ry: 0 },
  { x: -42, z: 106, w: 36, h: FENCE_H, d: 20, ry: 0 },
  { x: -12, z: 106, w: 12, h: FENCE_H, d: 20, ry: 0 },
  { x: 12, z: 106, w: 12, h: FENCE_H, d: 20, ry: 0 },
  { x: 38, z: 106, w: 28, h: FENCE_H, d: 20, ry: 0 },
  { x: 75, z: 106, w: 30, h: FENCE_H, d: 20, ry: 0 },
  // Zone 1 — row C (passages x -46, 0, 44)
  { x: -70, z: 78, w: 40, h: FENCE_H, d: 20, ry: 0 },
  { x: -23, z: 78, w: 38, h: FENCE_H, d: 20, ry: 0 },
  { x: 22, z: 78, w: 36, h: FENCE_H, d: 20, ry: 0 },
  { x: 69, z: 78, w: 42, h: FENCE_H, d: 20, ry: 0 },
  // Zone 1 / 2 divider (gaps at x -60 and x 56)
  { x: -77, z: 54, w: 26, h: FENCE_H, d: 12, ry: 0 },
  { x: -2, z: 54, w: 108, h: FENCE_H, d: 12, ry: 0 },
  { x: 75, z: 54, w: 30, h: FENCE_H, d: 12, ry: 0 },

  // Zone 2 — row D (courtyard x 36..68 around midA)
  { x: -75, z: 32, w: 30, h: FENCE_H, d: 16, ry: 0 },
  { x: -32, z: 32, w: 40, h: FENCE_H, d: 16, ry: 0 },
  { x: 16, z: 32, w: 40, h: FENCE_H, d: 16, ry: 0 },
  { x: 79, z: 32, w: 22, h: FENCE_H, d: 16, ry: 0 },
  // Zone 2 — row E (passages x -62, -20, 24)
  { x: -78, z: 6, w: 24, h: FENCE_H, d: 20, ry: 0 },
  { x: -41, z: 6, w: 34, h: FENCE_H, d: 20, ry: 0 },
  { x: 2, z: 6, w: 36, h: FENCE_H, d: 20, ry: 0 },
  { x: 34, z: 6, w: 12, h: FENCE_H, d: 20, ry: 0 },
  { x: 79, z: 6, w: 22, h: FENCE_H, d: 20, ry: 0 },
  // Zone 2 — row F (passages x -58, -37 (midB), 4, 48)
  { x: -76, z: -25, w: 28, h: FENCE_H, d: 26, ry: 0 },
  { x: -47.5, z: -25, w: 13, h: FENCE_H, d: 26, ry: 0 },
  { x: -16.5, z: -25, w: 33, h: FENCE_H, d: 26, ry: 0 },
  { x: 26, z: -25, w: 36, h: FENCE_H, d: 26, ry: 0 },
  { x: 71, z: -25, w: 38, h: FENCE_H, d: 26, ry: 0 },
  // Zone 2 / 3 divider (gaps at x -37 and x 48)
  { x: -65.5, z: -52, w: 49, h: FENCE_H, d: 12, ry: 0 },
  { x: 5.5, z: -52, w: 77, h: FENCE_H, d: 12, ry: 0 },
  { x: 71, z: -52, w: 38, h: FENCE_H, d: 12, ry: 0 },

  // Zone 3 — row G (passages x -56, -10, 28)
  { x: -75, z: -75, w: 30, h: FENCE_H, d: 18, ry: 0 },
  { x: -33, z: -75, w: 38, h: FENCE_H, d: 18, ry: 0 },
  { x: 9, z: -75, w: 30, h: FENCE_H, d: 18, ry: 0 },
  { x: 61, z: -75, w: 58, h: FENCE_H, d: 18, ry: 0 },
  // Zone 3 — lots flanking the Thuthuzela plaza
  { x: -58, z: -120, w: 64, h: FENCE_H, d: 40, ry: 0 },
  { x: 63, z: -120, w: 54, h: FENCE_H, d: 40, ry: 0 },

  // Loose fence runs (cover)
  { x: 62, z: 30, w: 12, h: FENCE_H, d: 0.4, ry: Math.PI / 2 },
  { x: 58, z: 2, w: 8, h: FENCE_H, d: 0.4, ry: 0 },
  { x: -16, z: -110, w: 8, h: FENCE_H, d: 0.4, ry: Math.PI / 2 },
  { x: 28, z: -110, w: 8, h: FENCE_H, d: 0.4, ry: Math.PI / 2 },
]

/** Rusted car hulks — low cover (block sight only while crouched). */
export const LEVEL6_CAR_HULKS = [
  { x: 64, z: 120, ry: 0 },
  { x: 8, z: 94.5, ry: 0 },
  { x: -75, z: 92, ry: 0 },
  { x: -30, z: 61.5, ry: 0 },
  { x: 62, z: 12, ry: Math.PI / 2 },
  { x: 0, z: -5.5, ry: 0 },
  { x: -20, z: -59.5, ry: 0 },
  { x: 20, z: -90, ry: 0 },
]
const CAR_HULK_H = 1.4

/** Green porch lights along the intended route (edge point + outward normal). */
const SAFE_HOUSES = [
  { x: 44, z: 116, nx: 0, nz: 1 },
  { x: 40, z: 80, nx: 1, nz: 0 },
  { x: 46, z: 60, nx: 0, nz: 1 },
  { x: 36, z: 30, nx: 1, nz: 0 },
  { x: -20, z: -12, nx: 0, nz: 1 },
  { x: -24, z: -66, nx: 0, nz: 1 },
]

const GRAFFITI = [
  { x: -12, z: 116, text: 'STOP GBV', color: '#ffe14a' },
  { x: 2, z: 16, text: "SHE IS SOMEONE'S DAUGHTER", color: '#ffffff' },
  { x: 50, z: -66, text: 'STOP GBV', color: '#ffffff' },
]

const HOUSE_PALETTE = [0xd4a57a, 0xb5c4a0, 0xc4b5a0, 0xa0b4c4]
const MAX_WINDOW_LIGHTS = 12

/**
 * @typedef {{
 *   x: number
 *   z: number
 *   hw: number
 *   hd: number
 *   h: number
 *   active?: boolean
 * }} Level6Collider
 */

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

/** Axis-aligned half extents for a wall entry (ry limited to 0 or pi/2). */
export function wallHalfExtents(wall) {
  const quarter = Math.abs(Math.round((wall.ry ?? 0) / (Math.PI / 2))) % 2 === 1
  return quarter ? { hw: wall.d / 2, hd: wall.w / 2 } : { hw: wall.w / 2, hd: wall.d / 2 }
}

function sandTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#8a7a60'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 900; i++) {
    const v = 90 + Math.random() * 60
    ctx.fillStyle = `rgba(${v + 30}, ${v + 18}, ${v - 8}, ${0.12 + Math.random() * 0.2})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(40, 60)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function corrugatedTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  for (let x = 0; x < 64; x++) {
    const v = 150 + Math.sin((x / 64) * Math.PI * 8) * 45
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`
    ctx.fillRect(x, 0, 1, 64)
  }
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(120, 70, 30, ${0.15 + Math.random() * 0.25})`
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 4 + Math.random() * 10, 3 + Math.random() * 8)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function textPanelTexture(text, { bg, fg, font, width = 1024, height = 358 }) {
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
  ctx.font = `${size}px ${family}`
  while (ctx.measureText(text).width > width * 0.9 && size > 16) {
    size -= 4
    ctx.font = `${size}px ${family}`
  }
  ctx.fillText(text, width / 2, height / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function graffitiTexture(text, color) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 358
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1b1c20'
  ctx.fillRect(0, 0, 1024, 358)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(60, 60, 70, ${Math.random() * 0.4})`
    ctx.fillRect(Math.random() * 1024, Math.random() * 358, 30 + Math.random() * 120, 6 + Math.random() * 20)
  }
  ctx.save()
  ctx.translate(512, 179)
  ctx.rotate(-0.04)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 150
  ctx.font = `bold ${size}px Impact, "Arial Black", sans-serif`
  while (ctx.measureText(text).width > 940 && size > 40) {
    size -= 6
    ctx.font = `bold ${size}px Impact, "Arial Black", sans-serif`
  }
  ctx.lineWidth = 10
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.strokeText(text, 0, 0)
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0)
  ctx.fillRect(-300, size * 0.55, 18, 50)
  ctx.fillRect(120, size * 0.55, 14, 34)
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Box geometry baked into world space, with UVs scaled so tiling textures repeat
 * with length instead of stretching.
 */
function bakedBox(w, h, d, x, y, z, ry = 0, uvScale = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  if (uvScale > 0) {
    const uv = g.attributes.uv
    const span = Math.max(w, d) / uvScale
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * span)
    uv.needsUpdate = true
  }
  if (ry) g.rotateY(ry)
  g.translate(x, y, z)
  return g
}

/**
 * @param {THREE.Scene} scene
 */
export function buildCapeFlatsCity(scene) {
  const group = new THREE.Group()
  group.name = 'level6-city'
  /** @type {Level6Collider[]} */
  const colliders = []
  /** Sight blockers for threat line-of-sight (same shape as colliders, with height). */
  /** @type {Level6Collider[]} */
  const blockers = []
  const rand = mulberry32(6060)

  const addSolid = (x, z, hw, hd, h, pad = 0.1) => {
    const entry = { x, z, hw: hw + pad, hd: hd + pad, h, active: true }
    colliders.push(entry)
    blockers.push({ x, z, hw, hd, h })
    return entry
  }

  // Ground: sandy lots and passages.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(LEVEL6_HALF_X * 2 + 160, LEVEL6_HALF_Z * 2 + 160),
    new THREE.MeshStandardMaterial({ color: 0x8a7a60, map: sandTexture(), roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x6a6a6a,
    map: corrugatedTexture(),
    metalness: 0.4,
    roughness: 0.7,
  })
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x6f7278,
    map: corrugatedTexture(),
    metalness: 0.5,
    roughness: 0.55,
  })
  const houseMats = HOUSE_PALETTE.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02 })
  )
  const windowLitMat = new THREE.MeshStandardMaterial({
    color: 0x2a1c10,
    emissive: 0xffa060,
    emissiveIntensity: 0.9,
    roughness: 0.4,
  })
  const windowDarkMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.3 })
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 })

  /** @type {THREE.BufferGeometry[]} */
  const fenceGeos = []
  /** @type {THREE.BufferGeometry[]} */
  const roofGeos = []
  /** @type {THREE.BufferGeometry[][]} */
  const houseGeos = HOUSE_PALETTE.map(() => [])
  /** @type {THREE.BufferGeometry[]} */
  const litWindowGeos = []
  /** @type {THREE.BufferGeometry[]} */
  const darkWindowGeos = []
  /** @type {THREE.BufferGeometry[]} */
  const doorGeos = []
  /** @type {{ x: number, y: number, z: number }[]} */
  const windowLightSpots = []

  /** Footprints the automatic house placement must avoid (safe houses). */
  const reserved = SAFE_HOUSES.map((s) => ({
    x: s.x - s.nx * 3,
    z: s.z - s.nz * 3,
    hw: s.nx !== 0 ? 2.6 : 3.2,
    hd: s.nz !== 0 ? 2.6 : 3.2,
  }))
  const overlapsReserved = (x, z, hw, hd) =>
    reserved.some((r) => Math.abs(x - r.x) < hw + r.hw && Math.abs(z - r.z) < hd + r.hd)

  /**
   * One RDP house. Windows go on the +z and -z faces so the chase camera
   * (looking toward -z) always sees lit facades.
   */
  const addHouse = (x, z, w, d, h, colorIdx, litChance = 0.45) => {
    houseGeos[colorIdx].push(bakedBox(w, h, d, x, h / 2, z))
    roofGeos.push(bakedBox(w + 0.5, 0.18, d + 0.5, x, h + 0.09, z, 0, 2))
    const winW = Math.min(1.1, w * 0.18)
    const winH = 0.9
    const winY = Math.min(h - 1.1, 1.9)
    for (const face of [1, -1]) {
      const fz = z + face * (d / 2 + 0.03)
      for (const off of [-w * 0.26, w * 0.26]) {
        const lit = rand() < litChance
        const geo = bakedBox(winW, winH, 0.06, x + off, winY, fz)
        if (lit) {
          litWindowGeos.push(geo)
          if (face === 1) windowLightSpots.push({ x: x + off, y: winY, z: fz + 1.2 })
        } else {
          darkWindowGeos.push(geo)
        }
      }
      if (face === 1) doorGeos.push(bakedBox(0.95, 1.95, 0.06, x, 0.975, fz))
    }
  }

  /** Fence ring + RDP houses packed inside the lot. */
  const buildLot = (wall) => {
    const { hw, hd } = wallHalfExtents(wall)
    const t = 0.18
    const x0 = wall.x
    const z0 = wall.z
    fenceGeos.push(bakedBox(hw * 2, wall.h, t, x0, wall.h / 2, z0 + hd - t / 2, 0, 1.5))
    fenceGeos.push(bakedBox(hw * 2, wall.h, t, x0, wall.h / 2, z0 - hd + t / 2, 0, 1.5))
    fenceGeos.push(bakedBox(t, wall.h, hd * 2, x0 + hw - t / 2, wall.h / 2, z0, 0, 1.5))
    fenceGeos.push(bakedBox(t, wall.h, hd * 2, x0 - hw + t / 2, wall.h / 2, z0, 0, 1.5))

    const inset = 1.4
    const innerW = hw * 2 - inset * 2
    const innerD = hd * 2 - inset * 2
    if (innerW < 4 || innerD < 4) return
    const alongX = innerW >= innerD
    const longLen = alongX ? innerW : innerD
    const shortLen = alongX ? innerD : innerW
    const rows = shortLen > 17 ? 2 : 1
    const cols = Math.max(1, Math.floor(longLen / 10))
    const segLong = longLen / cols
    const segShort = shortLen / rows
    for (let r = 0; r < rows; r++) {
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        if (rand() < 0.12) continue
        const houseLong = Math.min(9, segLong * (0.62 + rand() * 0.18))
        const houseShort = Math.min(8, segShort * (0.55 + rand() * 0.2))
        const cLong = -longLen / 2 + segLong * (cIdx + 0.5) + (rand() - 0.5) * (segLong - houseLong) * 0.6
        const cShort = -shortLen / 2 + segShort * (r + 0.5) + (rand() - 0.5) * (segShort - houseShort) * 0.5
        const hx = x0 + (alongX ? cLong : cShort)
        const hz = z0 + (alongX ? cShort : cLong)
        const w = alongX ? houseLong : houseShort
        const d = alongX ? houseShort : houseLong
        if (overlapsReserved(hx, hz, w / 2, d / 2)) continue
        const h = 3.2 + rand() * 0.8
        addHouse(hx, hz, w, d, h, (rand() * HOUSE_PALETTE.length) | 0)
      }
    }
  }

  for (const wall of LEVEL6_WALLS) {
    const { hw, hd } = wallHalfExtents(wall)
    addSolid(wall.x, wall.z, hw, hd, wall.h)
    if (Math.min(wall.w, wall.d) < 1.2) {
      fenceGeos.push(bakedBox(wall.w, wall.h, wall.d, wall.x, wall.h / 2, wall.z, wall.ry ?? 0, 1.5))
    } else {
      buildLot(wall)
    }
  }

  // Safe houses: small house + green porch light facing the route.
  const porchLights = []
  const porchBulbGeo = new THREE.SphereGeometry(0.16, 10, 8)
  const porchBulbMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 })
  for (const s of SAFE_HOUSES) {
    const cx = s.x - s.nx * 3
    const cz = s.z - s.nz * 3
    const w = s.nx !== 0 ? 4.4 : 5.6
    const d = s.nz !== 0 ? 4.4 : 5.6
    addHouse(cx, cz, w, d, 3.2, 1, 1)
    const bulb = new THREE.Mesh(porchBulbGeo, porchBulbMat)
    bulb.position.set(s.x + s.nx * 0.35, 2.55, s.z + s.nz * 0.35)
    group.add(bulb)
    const light = new THREE.PointLight(0x44ff88, 0.6, 10, 1.6)
    light.position.set(s.x + s.nx * 1.2, 2.4, s.z + s.nz * 1.2)
    group.add(light)
    porchLights.push(light)
  }

  // Warm window lights — capped so the forward renderer stays cheap.
  const step = Math.max(1, Math.floor(windowLightSpots.length / MAX_WINDOW_LIGHTS))
  for (let i = 0, n = 0; i < windowLightSpots.length && n < MAX_WINDOW_LIGHTS; i += step, n++) {
    const s = windowLightSpots[i]
    const light = new THREE.PointLight(0xffa060, 0.4, 12, 1.4)
    light.position.set(s.x, s.y, s.z)
    group.add(light)
  }

  // Car hulks.
  const hulkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95, metalness: 0.3 })
  const hulkGeos = []
  for (const car of LEVEL6_CAR_HULKS) {
    hulkGeos.push(bakedBox(4, CAR_HULK_H, 2, car.x, CAR_HULK_H / 2, car.z, car.ry))
    hulkGeos.push(bakedBox(2.2, 0.6, 1.8, car.x, CAR_HULK_H + 0.3, car.z, car.ry))
    const quarter = Math.abs(Math.round(car.ry / (Math.PI / 2))) % 2 === 1
    addSolid(car.x, car.z, quarter ? 1 : 2, quarter ? 2 : 1, CAR_HULK_H, 0.15)
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
  addMerged(litWindowGeos, windowLitMat, { cast: false })
  addMerged(darkWindowGeos, windowDarkMat, { cast: false })
  addMerged(doorGeos, doorMat, { cast: false })
  addMerged(hulkGeos, hulkMat)

  // Graffiti walls (story only) — dark slab bolted to the outside of the lot fence.
  for (const g of GRAFFITI) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.95 })
    )
    slab.position.set(g.x, 1.5, g.z + 0.16)
    slab.castShadow = true
    group.add(slab)
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2.8),
      new THREE.MeshStandardMaterial({
        map: graffitiTexture(g.text, g.color),
        roughness: 0.9,
        emissive: 0xffffff,
        emissiveIntensity: 0.18,
        emissiveMap: null,
      })
    )
    plane.material.emissiveMap = plane.material.map
    plane.position.set(g.x, 1.5, g.z + 0.33)
    group.add(plane)
  }

  // Thuthuzela Care Centre.
  const centre = new THREE.Group()
  centre.name = 'thuthuzela-care-centre'
  centre.position.set(LEVEL6_ANCHORS.careCentre.x, 0, LEVEL6_ANCHORS.careCentre.z)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(22, 4, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 })
  )
  body.position.y = 2
  body.castShadow = true
  body.receiveShadow = true
  centre.add(body)
  const centreRoof = new THREE.Mesh(
    new THREE.BoxGeometry(23, 0.3, 15),
    new THREE.MeshStandardMaterial({ color: 0x3c8f5c, roughness: 0.6 })
  )
  centreRoof.position.y = 4.15
  centre.add(centreRoof)
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x1fa85a,
    emissive: 0x1fa85a,
    emissiveIntensity: 0.6,
  })
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.12), crossMat)
  crossV.position.set(-7, 2.3, 7.06)
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.12), crossMat)
  crossH.position.set(-7, 2.3, 7.06)
  centre.add(crossV, crossH)
  const centreDoor = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x9fd8b8, emissive: 0xfff0cc, emissiveIntensity: 0.35 })
  )
  centreDoor.position.set(0, 1.3, 7.05)
  centre.add(centreDoor)
  const signTex = textPanelTexture('THUTHUZELA CARE CENTRE', {
    bg: '#ffffff',
    fg: '#138a47',
    font: '96px "IBM Plex Sans", Arial, sans-serif',
    width: 1024,
    height: 160,
  })
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 2.2),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.55 })
  )
  sign.position.set(3, 3.3, 7.08)
  centre.add(sign)
  for (const lx of [-3.2, 3.2]) {
    const lamp = new THREE.PointLight(0xfff0cc, 1.2, 16, 1.4)
    lamp.position.set(lx, 3, 8.4)
    centre.add(lamp)
  }
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(11.2, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  beaconRing.rotation.x = -Math.PI / 2
  beaconRing.position.y = 0.06
  centre.add(beaconRing)
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  beam.position.set(0, 13, 0)
  centre.add(beam)
  const labelTex = textPanelTexture('REACH SAFETY', {
    bg: 'rgba(8, 20, 14, 0.85)',
    fg: '#44ff88',
    font: '84px "IBM Plex Sans", Arial, sans-serif',
    width: 768,
    height: 128,
  })
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 2),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false })
  )
  label.position.set(0, 7.8, 0)
  centre.add(label)
  group.add(centre)
  addSolid(LEVEL6_ANCHORS.careCentre.x, LEVEL6_ANCHORS.careCentre.z, 11, 7, 4)

  // Checkpoint rings — faint until the player walks through, then fade away.
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x44ff88,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const ringGeo = new THREE.RingGeometry(LEVEL6_CHECKPOINT_RADIUS - 0.7, LEVEL6_CHECKPOINT_RADIUS, 56)
  /** @type {Map<string, { mesh: THREE.Mesh, target: number }>} */
  const checkpointRings = new Map()
  for (const cp of LEVEL6_CHECKPOINTS) {
    const mesh = new THREE.Mesh(ringGeo, ringMat.clone())
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(cp.x, 0.05, cp.z)
    mesh.renderOrder = 1
    group.add(mesh)
    checkpointRings.set(cp.id, { mesh, target: 0.28 })
  }

  scene.add(group)

  let pulseT = 0

  return {
    group,
    colliders,
    blockers,
    /** @param {string} id @param {boolean} active */
    setCheckpointActive(id, active) {
      const ring = checkpointRings.get(id)
      if (ring) ring.target = active ? 0 : 0.28
    },
    resetCheckpoints() {
      for (const ring of checkpointRings.values()) {
        ring.target = 0.28
        ring.mesh.material.opacity = 0.28
        ring.mesh.visible = true
      }
    },
    /** @param {number} dt */
    update(dt) {
      pulseT += dt
      const k = Math.min(1, dt * 3)
      for (const ring of checkpointRings.values()) {
        const mat = ring.mesh.material
        mat.opacity += (ring.target - mat.opacity) * k
        ring.mesh.visible = mat.opacity > 0.01
      }
      beaconRing.material.opacity = 0.35 + Math.sin(pulseT * 2.4) * 0.12
      for (const light of porchLights) light.intensity = 0.55 + Math.sin(pulseT * 1.6) * 0.05
    },
    dispose() {
      scene.remove(group)
      ringGeo.dispose()
      porchBulbGeo.dispose()
      disposeObject3D(group)
      fenceMat.map?.dispose()
      roofMat.map?.dispose()
      ground.material.map?.dispose()
      signTex.dispose()
      labelTex.dispose()
    },
  }
}
