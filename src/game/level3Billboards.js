// level3Billboards.js — Roadside advertising billboards for all playable levels.
// Swap the per-level ad lists for real campaign creative (sponsor names,
// taglines, colours) and they render in-world.

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import { LOW_SPEC_RENDERING } from './gameConstants.js'

/** @typedef {{ text: string, sub?: string, bg: string, fg: string }} BillboardAd */
/** @typedef {{ x: number, z: number, rotationY?: number }} BillboardSpot */
/** @typedef {'city' | 'roadside'} BillboardVariant */

/** @type {BillboardAd[]} */
export const LEVEL1_BILLBOARD_ADS = [
  { text: 'MZANSI ESCAPE', sub: 'Survive the Streets', bg: '#0d2840', fg: '#ffb84d' },
  { text: 'SPAZA SHOP', sub: 'Open Late. Cold Drinks.', bg: '#1b5e20', fg: '#fff8e1' },
  { text: 'WATCH THE GAP', sub: 'Taxis Don\'t Wait', bg: '#1b1b1b', fg: '#ffcc33' },
  { text: 'REA VAYA', sub: 'Ride Safe. Ride Smart.', bg: '#c62828', fg: '#ffffff' },
  { text: 'KOOL', sub: 'Stay Fresh', bg: '#01579b', fg: '#b3e5fc' },
  { text: 'TUCK SHOP', sub: 'Airtime · Bread · Simba', bg: '#4a148c', fg: '#ffe082' },
]

/** @type {BillboardAd[]} */
export const LEVEL2_BILLBOARD_ADS = [
  { text: 'SHARE A COKE', sub: 'Open Happiness', bg: '#c8102e', fg: '#ffffff' },
  { text: 'NIGHT SHIFT', sub: 'Keep Moving', bg: '#263238', fg: '#ffab40' },
  { text: 'DRIVE ALERT', sub: 'Joburg Roads', bg: '#1a237e', fg: '#fff59d' },
  { text: 'INDUSTRIAL PARK', sub: 'Next Exit', bg: '#37474f', fg: '#80deea' },
  { text: 'AUTO STOP', sub: 'Fuel The Journey', bg: '#0d47a1', fg: '#ffffff' },
  { text: 'MZANSI ESCAPE', sub: 'Dodge. Don\'t Crash.', bg: '#0d2840', fg: '#ffb84d' },
]

/** @type {BillboardAd[]} */
export const LEVEL3_BILLBOARD_ADS = [
  { text: 'MZANSI ESCAPE', sub: 'Survive the City', bg: '#0d2840', fg: '#ffb84d' },
  { text: 'REA VAYA', sub: 'Ride Safe. Ride Smart.', bg: '#c62828', fg: '#ffffff' },
  { text: 'STAY ALERT', sub: 'Amaphara Watch', bg: '#1b1b1b', fg: '#ff4d4d' },
  { text: 'GAUTRAIN', sub: 'Skip The Street', bg: '#003b73', fg: '#f2b134' },
  { text: 'PARK STATION', sub: 'Catch Your Train', bg: '#1b5e20', fg: '#c8e6c9' },
  { text: 'PONTE CITY', sub: '54 Floors Up', bg: '#4a148c', fg: '#e1bee7' },
  { text: 'JOBURG CBD', sub: 'Heart of Gold', bg: '#bf360c', fg: '#ffe0b2' },
  { text: 'TELKOM', sub: 'Stay Connected', bg: '#00695c', fg: '#b2dfdb' },
]

/** @type {BillboardAd[]} */
export const LEVEL4_BILLBOARD_ADS = [
  { text: 'DAY ZERO', sub: 'Save Every Drop', bg: '#01579b', fg: '#b3e5fc' },
  { text: 'CAPE TOWN', sub: 'Water Restrictions', bg: '#e65100', fg: '#fff3e0' },
  { text: 'TABLE MOUNTAIN', sub: 'Stay Hydrated', bg: '#1b5e20', fg: '#dcedc8' },
  { text: 'VODACOM', sub: 'Connecting You', bg: '#e60000', fg: '#ffffff' },
  { text: 'DE WAAL DRIVE', sub: 'Detour Ahead', bg: '#37474f', fg: '#ffe082' },
  { text: 'BO-KAAP', sub: 'Heritage Route', bg: '#6a1b9a', fg: '#ffe57f' },
  { text: 'NEWLANDS', sub: 'Fix The Valves', bg: '#004d40', fg: '#b2dfdb' },
  { text: 'STEENBRAS', sub: 'Keep The Pressure', bg: '#0d47a1', fg: '#fff59d' },
]

/** @type {BillboardAd[]} */
export const LEVEL5_BILLBOARD_ADS = [
  { text: 'STAGE 6', sub: 'Load Shedding', bg: '#11080c', fg: '#ff6e40' },
  { text: 'ESKOM', sub: 'Bring Back Power', bg: '#1a237e', fg: '#82b1ff' },
  { text: 'TORCH ON', sub: 'Watch The Streets', bg: '#212121', fg: '#ffd54f' },
  { text: 'CT STADIUM', sub: 'Signal For Help', bg: '#004d40', fg: '#69f0ae' },
  { text: 'POWER UP', sub: 'Find Batteries', bg: '#311b92', fg: '#ea80fc' },
  { text: 'CURFEW', sub: 'Looters After Dark', bg: '#3e2723', fg: '#ffccbc' },
  { text: 'SUBSTATION', sub: 'Restore The Grid', bg: '#01579b', fg: '#80d8ff' },
  { text: 'MZANSI ESCAPE', sub: 'Lights Out', bg: '#0d2840', fg: '#ffb84d' },
]

/** @type {BillboardAd[]} */
export const LEVEL8_BILLBOARD_ADS = [
  { text: 'HIGH GROUND', sub: 'Stay On The Ridge', bg: '#0d2840', fg: '#ffe566' },
  { text: "DON'T WADE", sub: '15cm Knocks You Down', bg: '#01579b', fg: '#b3e5fc' },
  { text: 'STORM DRAIN', sub: 'Backs Up Fast', bg: '#37474f', fg: '#ffe082' },
  { text: '112', sub: 'Free Emergency Call', bg: '#1b5e20', fg: '#c8e6c9' },
  { text: 'SPAZA SHOP', sub: 'Bread · Airtime · Hope', bg: '#e65100', fg: '#fff8e1' },
  { text: 'SOWETO CLINIC', sub: 'Fridge Still On', bg: '#b71c1c', fg: '#ffffff' },
  { text: 'MZANSI ESCAPE', sub: 'Homecoming', bg: '#0d2840', fg: '#ffb84d' },
]

/** @type {BillboardAd[]} */
export const DEFAULT_BILLBOARD_ADS = LEVEL3_BILLBOARD_ADS

/** Mixed set for the scrolling L1/L2 corridor so both themes read on the roadside. */
export const CORRIDOR_BILLBOARD_ADS = [
  ...LEVEL1_BILLBOARD_ADS,
  ...LEVEL2_BILLBOARD_ADS,
]

/**
 * Mid-block sidewalk on a city grid.
 * `ns` streets run north-south at x = streetIndex * block.
 * `ew` streets run east-west at z = streetIndex * block.
 * `side` +1 is east (ns) or north (ew).
 * @param {number} block
 * @param {number} streetW
 * @param {'ns' | 'ew'} streetAxis
 * @param {number} streetIndex
 * @param {number} lotIndex
 * @param {1 | -1} side
 * @returns {BillboardSpot}
 */
export function sidewalkSpot(block, streetW, streetAxis, streetIndex, lotIndex, side) {
  const curb = streetW * 0.5 - 0.85
  // Cant ~40° from square-to-the-street so the chase camera (looking along
  // the road) sees the face instead of the panel edge.
  const cant = 0.7
  if (streetAxis === 'ns') {
    return {
      x: streetIndex * block + side * curb,
      z: (lotIndex + 0.5) * block,
      rotationY: side > 0 ? -Math.PI / 2 - cant : Math.PI / 2 + cant,
    }
  }
  return {
    x: (lotIndex + 0.5) * block,
    z: streetIndex * block + side * curb,
    rotationY: side > 0 ? Math.PI - cant : cant,
  }
}

/**
 * @param {number} block
 * @param {number} streetW
 * @param {Array<['ns' | 'ew', number, number, 1 | -1]>} plan
 */
export function spotsFromPlan(block, streetW, plan) {
  return plan.map(([axis, street, lot, side]) =>
    sidewalkSpot(block, streetW, axis, street, lot, side)
  )
}

function fitLine(ctx, text, maxWidth, startPx) {
  let px = startPx
  ctx.font = `bold ${px}px Arial, sans-serif`
  while (px > 22 && ctx.measureText(text).width > maxWidth) {
    px -= 2
    ctx.font = `bold ${px}px Arial, sans-serif`
  }
  return px
}

function adTexture(ad) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = ad.bg
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = ad.fg
  ctx.lineWidth = 6
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12)
  ctx.fillStyle = ad.fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitLine(ctx, ad.text, 460, 56)
  ctx.fillText(ad.text, c.width / 2, ad.sub ? 108 : 128)
  if (ad.sub) {
    ctx.globalAlpha = 0.92
    fitLine(ctx, ad.sub, 440, 32)
    ctx.fillText(ad.sub, c.width / 2, 178)
    ctx.globalAlpha = 1
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function variantSize(variant) {
  if (variant === 'roadside') {
    return { panelW: 3.4, panelH: 2.0, legH: 4.2, panelY: 5.15, twoLegs: false }
  }
  return { panelW: 8, panelH: 4, legH: 9, panelY: 9.2, twoLegs: true }
}

/**
 * @param {BillboardAd} ad
 * @param {{ variant?: BillboardVariant, lights?: boolean, emissive?: number }} [opts]
 */
export function createBillboard(ad, opts = {}) {
  const variant = opts.variant ?? 'city'
  const { panelW, panelH, legH, panelY, twoLegs } = variantSize(variant)
  const board = new THREE.Group()
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.8 })

  if (twoLegs) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, legH, 8), legMat)
      leg.position.set(side * 3.2, legH / 2, 0)
      leg.castShadow = true
      board.add(leg)
    }
  } else {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, legH, 8), legMat)
    leg.position.set(0, legH / 2, 0)
    leg.castShadow = true
    board.add(leg)
  }

  const panelTex = adTexture(ad)
  const emissive = opts.emissive ?? 0.55
  const panelMat = new THREE.MeshStandardMaterial({
    map: panelTex,
    emissive: new THREE.Color(0x333333),
    emissiveMap: panelTex,
    emissiveIntensity: emissive,
    roughness: 0.4,
    side: THREE.DoubleSide,
  })
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), panelMat)
  panel.position.set(0, panelY, 0)
  panel.castShadow = true
  panel.userData.billboardPanel = true
  board.add(panel)

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(panelW + 0.3, panelH + 0.3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  )
  frame.position.set(0, panelY, -0.12)
  board.add(frame)

  if (opts.lights) {
    const spotlight = new THREE.PointLight(0xfff2cc, 1.1, 12, 2)
    spotlight.position.set(0, panelY - 2, 1.6)
    board.add(spotlight)
  }

  board.userData.billboardPanel = panel
  return board
}

function colliderForSpot(spot, variant) {
  const rot = spot.rotationY ?? 0
  const facesZ = Math.abs(Math.cos(rot)) >= Math.abs(Math.sin(rot))
  const halfWide = variant === 'roadside' ? 1.85 : 4.15
  const halfDeep = 0.55
  return {
    x: spot.x,
    z: spot.z,
    hw: facesZ ? halfWide : halfDeep,
    hd: facesZ ? halfDeep : halfWide,
    h: variant === 'roadside' ? 6.5 : 11,
  }
}

/**
 * @param {THREE.Group} cityGroup
 * @param {BillboardSpot[]} spots
 * @param {BillboardAd[]} [ads]
 * @param {{ name?: string, variant?: BillboardVariant, emissive?: number, lights?: boolean }} [opts]
 */
export function buildBillboards(cityGroup, spots, ads = DEFAULT_BILLBOARD_ADS, opts = {}) {
  const variant = opts.variant ?? 'city'
  const group = new THREE.Group()
  group.name = opts.name ?? 'level-billboards'
  const colliders = []
  const panels = []
  const allowLights = Boolean(opts.lights) && !LOW_SPEC_RENDERING
  const emissive = opts.emissive ?? (variant === 'city' ? 0.55 : 0.42)

  spots.forEach((spot, i) => {
    const ad = ads[i % ads.length]
    const board = createBillboard(ad, {
      variant,
      lights: allowLights && i < 4,
      emissive,
    })
    board.position.set(spot.x, 0, spot.z)
    board.rotation.y = spot.rotationY ?? 0
    group.add(board)
    const panel = board.userData.billboardPanel
    if (panel) panels.push(panel)
    colliders.push(colliderForSpot(spot, variant))
  })

  cityGroup.add(group)

  let cycleT = 0
  const pulseBase = Math.max(0.35, emissive - 0.08)
  return {
    group,
    colliders,
    /** @param {number} dt */
    update(dt) {
      cycleT += dt
      const pulse = pulseBase + Math.sin(cycleT * 1.5) * 0.08
      for (const p of panels) p.material.emissiveIntensity = pulse
    },
    dispose() {
      cityGroup.remove(group)
      disposeObject3D(group)
    },
  }
}
