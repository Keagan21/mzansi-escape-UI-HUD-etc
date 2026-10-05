// level5City.js — Procedural Cape Town Stage 6 blackout open-world city.

import * as THREE from 'three'
import {
  CAPE_TOWN_STADIUM_TARGET_SIZE,
  cloneCapeTownStadiumInstance,
  loadCapeTownStadiumTemplate,
} from './level5StadiumAssets.js'
import { disposeGeometries, disposeObject3D } from './threeDispose.js'

export const BLOCK = 46
export const STREET_W = 14
export const GRID_N = 12

/** Square edge the player is clamped to. */
export const LEVEL5_WORLD_BOUND = Math.floor((GRID_N / 2) * BLOCK - 2)

export const LEVEL5_ANCHORS = {
  spawn: { x: 0, z: 80 },
  node1_circuit: { x: BLOCK * 2.2, z: -BLOCK * 0.5 },
  node2_cable: { x: -BLOCK * 2.4, z: -BLOCK * 2.8 },
  node3_generator: { x: BLOCK * 3.5, z: -BLOCK * 4.2 },
  tableMountain: { x: 0, z: LEVEL5_WORLD_BOUND + 180 },
  stadium_win: { x: -BLOCK * 3.5, z: BLOCK * 2.2 },
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

function asphaltTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1a1a22'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(40, 40, 50, ${0.1 + Math.random() * 0.2})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 20 + Math.random() * 60, 8)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(48, 48)
  tex.anisotropy = 4
  return tex
}

function hazardStripeTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#444450'
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = '#f5c518'
  for (let i = -64; i < 160; i += 24) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 12, 0)
    ctx.lineTo(i + 44, 64)
    ctx.lineTo(i + 32, 64)
    ctx.closePath()
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

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

const BO_KAAP_TEX_POOL = 8
const CBD_TEX_POOL = 8
/** @type {THREE.CanvasTexture[]} */
const boKaapTexPool = []
/** @type {THREE.CanvasTexture[]} */
const cbdTexPool = []
/** @type {Map<number, THREE.Material[]>} */
const boKaapMatByColor = new Map()

function pickPooledTexture(pool, limit, factory) {
  if (pool.length < limit) {
    const tex = factory()
    pool.push(tex)
    return tex
  }
  return pool[(Math.random() * pool.length) | 0]
}

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

const doorWoodMat = new THREE.MeshStandardMaterial({
  color: 0x3d2918,
  roughness: 0.7,
  metalness: 0.08,
})
const doorStepMat = new THREE.MeshStandardMaterial({ color: 0xc8b8a0, roughness: 0.9 })
const paneMat = new THREE.MeshStandardMaterial({
  color: 0x1a3040,
  roughness: 0.15,
  metalness: 0.2,
  emissive: 0x000000,
  emissiveIntensity: 0,
})
const paneFrameMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.55 })
const roofMat = new THREE.MeshStandardMaterial({ color: 0xeee6d6, roughness: 0.85 })

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

/**
 * Activate street lamps in zone A / B / C (map thirds by X).
 * @param {THREE.Group} cityGroup
 * @param {'A' | 'B' | 'C'} zone
 * @param {number} [durationMs]
 */
export function activateZoneLamps(cityGroup, zone, durationMs = 2000) {
  const lamps = []
  cityGroup.traverse((o) => {
    if (o.userData?.lampZone === zone && o.userData?.lampHeadMat) lamps.push(o)
  })
  const start = performance.now()
  const target = new THREE.Color(0xffa040)
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / durationMs)
    for (const lamp of lamps) {
      const mat = lamp.userData.lampHeadMat
      mat.emissive.copy(target)
      mat.emissiveIntensity = t * 1.4
      mat.color.setHex(0xffc878)
      if (lamp.userData.lampLight) lamp.userData.lampLight.intensity = t * 1.2
    }
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/**
 * @param {THREE.Scene} scene
 */
export function buildCapeTownNightCity(scene) {
  const group = new THREE.Group()
  group.name = 'level5-city'
  /** @type {BuildingCollider[]} */
  const colliders = []
  /** @type {{ mesh: THREE.Mesh, light: THREE.PointLight, zone: string }[]} */
  const substations = []

  const skyTop = new THREE.Color(0x050a14)
  const skyBottom = new THREE.Color(0x0a1020)
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
      color: 0x1a1a22,
      map: asphaltTexture(),
      roughness: 1,
    })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 1 })
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
        pickPooledTexture(boKaapTexPool, BO_KAAP_TEX_POOL, () =>
          makeWindowTexture({
            cols: 2,
            rows: 3,
            wall: '#ffffff',
            frame: '#f7f3ea',
            glassLit: '#1a2030',
            glassDark: '#0a1018',
            litChance: 0.08,
          })
        ),
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
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.45, d + 0.4), roofMat)
    roof.position.set(cx, h + 0.2, cz)
    buildingGroup.add(roof)
    addBoKaapOpenings(cx, cz, w, d, h)
    registerCollider(cx, cz, w, d, h)
  }

  function buildCbdBlock(cx, cz, w, d) {
    const h = 10 + Math.random() * 12
    const tex = pickPooledTexture(cbdTexPool, CBD_TEX_POOL, () =>
      makeWindowTexture({
        cols: 5,
        rows: 10,
        wall: '#1a1816',
        frame: '#0e0c0a',
        glassLit: '#1a2840',
        glassDark: '#0a1018',
        litChance: 0.06,
      })
    )
    const rx = Math.max(1, Math.round(w / 10))
    const ry = Math.max(2, Math.round(h / 5))
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      makeBoxFacadeMaterials(0x3a3530, 0x2a2620, tex, rx, ry)
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
      if (skipNear(bx, bz, LEVEL5_ANCHORS.spawn.x, LEVEL5_ANCHORS.spawn.z, 28)) continue
      if (skipNear(bx, bz, LEVEL5_ANCHORS.node1_circuit.x, LEVEL5_ANCHORS.node1_circuit.z, 36)) continue
      if (skipNear(bx, bz, LEVEL5_ANCHORS.node2_cable.x, LEVEL5_ANCHORS.node2_cable.z, 32)) continue
      if (skipNear(bx, bz, LEVEL5_ANCHORS.node3_generator.x, LEVEL5_ANCHORS.node3_generator.z, 32)) continue
      if (skipNear(bx, bz, LEVEL5_ANCHORS.stadium_win.x, LEVEL5_ANCHORS.stadium_win.z, 40)) continue

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

  // Street lamps (~60) across the grid — all start OFF
  const lampGroup = new THREE.Group()
  lampGroup.name = 'street-lamps'
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a32, metalness: 0.4, roughness: 0.55 })
  const headGeo = new THREE.SphereGeometry(0.35, 10, 8)
  let lampCount = 0
  for (let i = -half; i <= half && lampCount < 60; i++) {
    for (let j = -half; j <= half && lampCount < 60; j++) {
      if ((i + j) % 2 !== 0) continue
      const lx = i * BLOCK + ((j % 2 === 0 ? 1 : -1) * STREET_W * 0.42)
      const lz = j * BLOCK
      const zone = lx < -BLOCK * 1.5 ? 'A' : lx > BLOCK * 1.5 ? 'C' : 'B'
      const post = new THREE.Group()
      post.name = `lamp-${lampCount}`
      post.userData.lampZone = zone
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = 2.6
      pole.castShadow = true
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x333340,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.4,
      })
      const head = new THREE.Mesh(headGeo, headMat)
      head.position.y = 5.3
      post.userData.lampHeadMat = headMat
      const light = new THREE.PointLight(0xffa040, 0, 22)
      light.position.y = 5.1
      post.userData.lampLight = light
      post.add(pole, head, light)
      post.position.set(lx, 0, lz)
      lampGroup.add(post)
      lampCount++
    }
  }
  group.add(lampGroup)

  // Procedural Table Mountain silhouette (basin marker)
  const mountainGroup = new THREE.Group()
  mountainGroup.name = 'table-mountain'
  mountainGroup.position.set(
    LEVEL5_ANCHORS.tableMountain.x,
    0,
    LEVEL5_ANCHORS.tableMountain.z
  )
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 34, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 1 })
  )
  basin.name = 'table-basin'
  basin.position.set(0, 3, 18)
  mountainGroup.add(basin)
  group.add(mountainGroup)

  function buildSubstation(name, x, z, zone, { buildingZ = -1 } = {}) {
    const pad = new THREE.Group()
    pad.name = name
    pad.position.set(x, 0, z)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.85 })
    )
    base.position.y = 0.18
    base.receiveShadow = true
    pad.add(base)

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.55, metalness: 0.25 })
    )
    box.position.set(0, 1.7, buildingZ)
    box.castShadow = true
    pad.add(box)

    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.1),
      new THREE.MeshBasicMaterial({ map: hazardStripeTexture() })
    )
    stripe.position.set(0, 1.7, buildingZ + 1.27)
    pad.add(stripe)

    const light = new THREE.PointLight(0xffc040, 0, 28)
    light.name = `${name}-light`
    light.position.set(0, 4.2, buildingZ)
    pad.add(light)

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 7, 8),
      new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.55 })
    )
    beacon.position.set(0, 4.5, buildingZ)
    beacon.name = `${name}-beacon`
    pad.add(beacon)

    group.add(pad)
    registerCollider(x, z + buildingZ, 4, 2.5, 3)
    substations.push({ mesh: box, light, zone })
    return pad
  }

  // Keep huts clear of top-down puzzle decks (breaker grid / cable grid).
  buildSubstation('node-circuit', LEVEL5_ANCHORS.node1_circuit.x, LEVEL5_ANCHORS.node1_circuit.z, 'A', {
    buildingZ: -9.5,
  })
  buildSubstation('node-cable', LEVEL5_ANCHORS.node2_cable.x, LEVEL5_ANCHORS.node2_cable.z, 'B', {
    buildingZ: -7.5,
  })
  buildSubstation('node-generator', LEVEL5_ANCHORS.node3_generator.x, LEVEL5_ANCHORS.node3_generator.z, 'C')

  // Cape Town Stadium — Draco GLB + floodlights / win ring (procedural fallback if load fails).
  const stadium = new THREE.Group()
  stadium.name = 'cape-town-stadium'
  stadium.position.set(LEVEL5_ANCHORS.stadium_win.x, 0, LEVEL5_ANCHORS.stadium_win.z)

  const hold = new THREE.Group()
  hold.name = 'cape-town-stadium-hold'
  stadium.add(hold)

  /** @type {THREE.SpotLight[]} */
  const floodlights = []
  /** @type {THREE.Object3D[]} */
  const floodPoles = []
  const floodLocal = [
    [-18, 14, -12],
    [18, 14, -12],
    [-18, 14, 12],
    [18, 14, 12],
  ]
  for (const [fx, fy, fz] of floodLocal) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x333340 })
    )
    pole.position.set(fx, 7, fz)
    stadium.add(pole)
    floodPoles.push(pole)
    const spot = new THREE.SpotLight(0xffffff, 0, 60, 0.55, 0.4)
    spot.position.set(fx, fy, fz)
    spot.target.position.set(0, 2, 0)
    stadium.add(spot)
    stadium.add(spot.target)
    floodlights.push(spot)
  }

  const winRing = new THREE.Mesh(
    new THREE.RingGeometry(10, 11.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffa040,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  winRing.rotation.x = -Math.PI / 2
  winRing.position.y = 0.2
  winRing.name = 'stadium-win-ring'
  stadium.add(winRing)

  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 1024
  labelCanvas.height = 128
  const lctx = labelCanvas.getContext('2d')
  lctx.fillStyle = '#0d1117'
  lctx.fillRect(0, 0, 1024, 128)
  lctx.fillStyle = '#ffa040'
  lctx.font = 'bold 48px monospace'
  lctx.textAlign = 'center'
  lctx.textBaseline = 'middle'
  lctx.fillText('REACH CAPE TOWN STADIUM', 512, 64)
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 3.5),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
  )
  label.position.set(0, 16, 0)
  stadium.add(label)

  const addFallbackStadium = () => {
    const stadiumBase = new THREE.Mesh(
      new THREE.BoxGeometry(42, 4, 32),
      new THREE.MeshStandardMaterial({ color: 0x5a5a62, roughness: 0.8 })
    )
    stadiumBase.name = 'cape-town-stadium-fallback'
    stadiumBase.position.y = 2
    stadiumBase.castShadow = true
    stadiumBase.receiveShadow = true
    hold.add(stadiumBase)

    const roof = new THREE.Mesh(
      new THREE.TorusGeometry(16, 2.4, 10, 36, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.35, roughness: 0.45 })
    )
    roof.rotation.x = Math.PI / 2
    roof.position.y = 10
    hold.add(roof)
  }

  /**
   * Place flood poles / spots around the real mesh footprint once it loads.
   * @param {THREE.Box3} box world AABB of the stadium mesh
   */
  const fitStadiumDecor = (box) => {
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const localCenter = center.clone()
    stadium.worldToLocal(localCenter)
    const hw = Math.max(size.x * 0.45, 14)
    const hd = Math.max(size.z * 0.45, 10)
    const poleH = Math.max(size.y * 0.85, 12)
    const tipY = poleH
    const corners = [
      [-hw, tipY, -hd],
      [hw, tipY, -hd],
      [-hw, tipY, hd],
      [hw, tipY, hd],
    ]
    for (let i = 0; i < floodlights.length; i++) {
      const [lx, ly, lz] = corners[i]
      const px = localCenter.x + lx
      const pz = localCenter.z + lz
      floodPoles[i].position.set(px, tipY * 0.5, pz)
      floodPoles[i].scale.set(1, tipY / 14, 1)
      floodlights[i].position.set(px, ly, pz)
      floodlights[i].target.position.set(localCenter.x, 2, localCenter.z)
      floodlights[i].distance = Math.max(size.x, size.z, 40) * 1.2
    }
    label.position.set(localCenter.x, tipY + 2, localCenter.z)
    winRing.position.set(localCenter.x, 0.2, localCenter.z)
    const ringR = Math.min(hw, hd) * 0.55
    winRing.geometry.dispose()
    winRing.geometry = new THREE.RingGeometry(ringR, ringR * 1.12, 48)
  }

  let cancelled = false
  stadium.userData.cancelStadiumLoad = () => {
    cancelled = true
  }

  loadCapeTownStadiumTemplate().then(() => {
    if (cancelled) return
    const model = cloneCapeTownStadiumInstance()
    if (!model) {
      addFallbackStadium()
      return
    }
    model.name = 'cape-town-stadium-mesh'
    hold.add(model)
    stadium.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    fitStadiumDecor(box)

    if (import.meta.env.DEV) {
      const size = box.getSize(new THREE.Vector3())
      console.log('[Level5] Cape Town Stadium placed', {
        targetSize: CAPE_TOWN_STADIUM_TARGET_SIZE,
        footprint: `${size.x.toFixed(1)} x ${size.z.toFixed(1)}`,
        height: size.y.toFixed(1),
      })
    }
  })

  group.add(stadium)
  // No solid stadium collider — player must reach the win ring at the anchor.

  function buildGate(id, x, z, rotY) {
    const gate = new THREE.Group()
    gate.name = id
    gate.position.set(x, 0, z)
    gate.rotation.y = rotY
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(14, 2.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 0.7 })
    )
    bar.position.y = 1.1
    bar.castShadow = true
    gate.add(bar)
    const postL = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 3.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x222228 })
    )
    postL.position.set(-6.5, 1.6, 0)
    gate.add(postL)
    const postR = postL.clone()
    postR.position.x = 6.5
    gate.add(postR)
    group.add(gate)
    registerCollider(x, z, 14, 2.4, 3.2, id)
    return gate
  }

  buildGate(
    'gate-cable',
    (LEVEL5_ANCHORS.node2_cable.x + LEVEL5_ANCHORS.spawn.x) * 0.55,
    (LEVEL5_ANCHORS.node2_cable.z + LEVEL5_ANCHORS.spawn.z) * 0.55,
    Math.atan2(
      LEVEL5_ANCHORS.node2_cable.x - LEVEL5_ANCHORS.spawn.x,
      LEVEL5_ANCHORS.node2_cable.z - LEVEL5_ANCHORS.spawn.z
    )
  )
  buildGate(
    'gate-generator',
    (LEVEL5_ANCHORS.node3_generator.x + LEVEL5_ANCHORS.node1_circuit.x) * 0.5,
    (LEVEL5_ANCHORS.node3_generator.z + LEVEL5_ANCHORS.node1_circuit.z) * 0.55,
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
    activateZoneLamps(zone) {
      activateZoneLamps(group, zone)
    },
    setSubstationLit(index, on) {
      const s = substations[index]
      if (s) s.light.intensity = on ? 1.8 : 0
    },
    setStadiumFloodlights(on) {
      for (const spot of floodlights) spot.intensity = on ? 4.5 : 0
    },
    dispose() {
      const stadiumObj = group.getObjectByName('cape-town-stadium')
      stadiumObj?.userData.cancelStadiumLoad?.()
      scene.remove(group)
      disposeObject3D(group)
      disposeGeometries(group)
    },
  }
}
