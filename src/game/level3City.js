// level3City.js — Procedural Joburg CBD open-world city mesh.

import * as THREE from 'three'
import { disposeGeometries, disposeObject3D } from './threeDispose.js'
import {
  cloneParkStationInstance,
  distanceToFootprint,
  loadParkStationTemplate,
  PARK_STATION_TARGET_SIZE,
  PARK_STATION_WIN_REACH,
} from './level3ParkStationAssets.js'
import { buildCbdMonuments, MONUMENT_ANCHORS } from './level3Monuments.js'

export const BLOCK = 46
export const STREET_W = 14
export const GRID_N = 14

/** Square edge the player is clamped to — kept inside the procedural CBD grid. */
export const LEVEL3_WORLD_BOUND = Math.floor((GRID_N / 2) * BLOCK - 2)

/**
 * Preferred Park Station anchor, clamped so the whole footprint fits in bounds.
 * @returns {{ x: number, z: number }}
 */
export function computeParkStationPlacement() {
  const bound = LEVEL3_WORLD_BOUND
  const inset = PARK_STATION_TARGET_SIZE / 2 + PARK_STATION_WIN_REACH + 4
  const min = -bound + inset
  const max = bound - inset
  const clamp = (v) => Math.max(min, Math.min(max, v))
  return {
    x: clamp(-BLOCK * 2.2),
    z: clamp(BLOCK * 4.5),
  }
}

/**
 * Nudge the station if its loaded mesh footprint extends past the world bound.
 * @param {THREE.Group} station
 * @param {{ cx: number, cz: number, hw: number, hd: number }} footprint
 * @param {BuildingCollider | undefined} colliderEntry
 */
function fitFootprintInsideWorldBounds(station, footprint, colliderEntry) {
  const bound = LEVEL3_WORLD_BOUND
  let shiftX = 0
  let shiftZ = 0
  const minX = footprint.cx - footprint.hw
  const maxX = footprint.cx + footprint.hw
  const minZ = footprint.cz - footprint.hd
  const maxZ = footprint.cz + footprint.hd

  if (minX < -bound) shiftX = -bound - minX
  else if (maxX > bound) shiftX = bound - maxX

  if (minZ < -bound) shiftZ = -bound - minZ
  else if (maxZ > bound) shiftZ = bound - maxZ

  if (shiftX === 0 && shiftZ === 0) return

  station.position.x += shiftX
  station.position.z += shiftZ
  footprint.cx += shiftX
  footprint.cz += shiftZ
  if (colliderEntry) {
    colliderEntry.x = footprint.cx
    colliderEntry.z = footprint.cz
  }
}

const facadePalette = [
  0x8a8f99, 0x7d8ba0, 0x9c8267, 0xb0a58f, 0x6f7a8c, 0xa3937a, 0x7f7f74, 0xc2b59b,
  0x8b7355, 0x9a8b7a, 0x7a8b9a, 0xc4a882, 0x6b7d8e, 0x8f8a7d, 0x7a6b5a, 0xb59a82,
]

const WINDOW_TEX_POOL = 12
/** @type {THREE.CanvasTexture[]} */
const windowTexPool = []
/** @type {Map<number, THREE.MeshStandardMaterial>} */
const buildingMatByColor = new Map()

const tankMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
const balconyMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.9 })
const bandMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.7 })
const antennaMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
const farSkylineMat = new THREE.MeshStandardMaterial({ color: 0x8f6a4a })

function windowTexture(cols, rows, litColor, darkColor, litRatio = 0.35) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#141821'
  ctx.fillRect(0, 0, c.width, c.height)
  const cw = c.width / cols
  const ch = c.height / rows
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = Math.random() < litRatio ? litColor : darkColor
      ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function pickWindowTexture() {
  if (windowTexPool.length < WINDOW_TEX_POOL) {
    const cols = 4 + (windowTexPool.length % 4)
    const rows = 8 + (windowTexPool.length % 6)
    const tex = windowTexture(cols, rows, '#ffd98a', '#232838', 0.3 + (windowTexPool.length % 4) * 0.08)
    windowTexPool.push(tex)
    return tex
  }
  return windowTexPool[(Math.random() * windowTexPool.length) | 0]
}

function makeBuildingMaterial(colorHex) {
  let mat = buildingMatByColor.get(colorHex)
  if (mat) return mat
  mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    map: pickWindowTexture(),
    roughness: 0.75,
    metalness: 0.15,
  })
  buildingMatByColor.set(colorHex, mat)
  return mat
}

/**
 * @typedef {{ x: number, z: number, hw: number, hd: number, h: number }} BuildingCollider
 */

/**
 * @param {THREE.Scene} scene
 * @returns {{ group: THREE.Group, colliders: BuildingCollider[], dispose: () => void }}
 */
export function buildJoburgCbdCity(scene) {
  const group = new THREE.Group()
  group.name = 'level3-city'
  /** @type {BuildingCollider[]} */
  const colliders = []

  const skyTop = new THREE.Color(0xffb27a)
  const skyBottom = new THREE.Color(0xffe3b3)

  const skyGeo = new THREE.SphereGeometry(1800, 32, 32)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: skyTop }, bottom: { value: skyBottom } },
    vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec3 vPos; uniform vec3 top; uniform vec3 bottom;
      void main(){
        float h = normalize(vPos).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottom, top, h), 1.0);
      }`,
  })
  group.add(new THREE.Mesh(skyGeo, skyMat))

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3d, roughness: 1 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x232326, roughness: 1 })
  for (let i = -GRID_N / 2; i <= GRID_N / 2; i++) {
    const x = i * BLOCK
    const roadX = new THREE.Mesh(
      new THREE.PlaneGeometry(STREET_W, GRID_N * BLOCK + STREET_W),
      roadMat
    )
    roadX.rotation.x = -Math.PI / 2
    roadX.position.set(x, 0.02, 0)
    roadX.receiveShadow = true
    group.add(roadX)

    const roadZ = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_N * BLOCK + STREET_W, STREET_W),
      roadMat
    )
    roadZ.rotation.x = -Math.PI / 2
    roadZ.position.set(0, 0.02, x)
    roadZ.receiveShadow = true
    group.add(roadZ)
  }

  const buildingGroup = new THREE.Group()
  group.add(buildingGroup)

  const registerCollider = (cx, cz, w, d, h) => {
    colliders.push({ x: cx, z: cz, hw: w / 2 + 0.5, hd: d / 2 + 0.5, h })
  }

  function buildPonteTower(x, z) {
    const h = 78
    const rOuter = 11
    const rInner = 4.2
    const mat = makeBuildingMaterial(0x9c9182)
    const shape = new THREE.Shape()
    shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, rInner, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 24,
    })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, h, 0)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, 0, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    buildingGroup.add(mesh)
    registerCollider(x, z, rOuter * 2, rOuter * 2, h)
    
    // Add Ponte Tower distinctive horizontal bands
    for (let i = 0; i < 5; i++) {
      const bandY = 12 + i * 16
      if (bandY > h - 10) break
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(rOuter + 0.3, 0.4, 8, 32),
        bandMat
      )
      band.position.set(x, bandY, z)
      band.rotation.x = Math.PI / 2
      band.castShadow = true
      buildingGroup.add(band)
    }
  }

  function buildTallTower(x, z) {
    // Local CBD landmark only — must stay below the horizon monuments
    // (Telkom 200 / Vodacom 170) so street corridors still open to the skyline.
    const h = 52
    const w = 22
    const d = 22
    const mat = makeBuildingMaterial(0x74808f)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, h / 2, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    buildingGroup.add(mesh)
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 14, 8),
      antennaMat
    )
    ant.position.set(x, h + 7, z)
    ant.castShadow = true
    buildingGroup.add(ant)
    registerCollider(x, z, w, d, h)
  }

  function buildBrutalistBuilding(x, z) {
    const h = 18 + Math.random() * 8
    const w = 25 + Math.random() * 10
    const d = 25 + Math.random() * 10
    const mat = makeBuildingMaterial(0x5a5a62)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, h / 2, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    buildingGroup.add(mesh)

    const balconyCount = 3
    for (let i = 0; i < balconyCount; i++) {
      const balconyY = 10 + i * 12
      if (balconyY > h - 4) break
      const balcony = new THREE.Mesh(
        new THREE.BoxGeometry(w + 2, 1.5, 3),
        balconyMat
      )
      balcony.position.set(x, balconyY, z + d / 2 + 1.5)
      balcony.castShadow = true
      buildingGroup.add(balcony)
    }

    registerCollider(x, z, w, d, h)
  }

  function buildBlockBuilding(cx, cz, footprintW, footprintD) {
    // Everyday CBD stock: mid-rise only so streets open to the horizon.
    const h = 9 + Math.random() * 10
    const color = facadePalette[(Math.random() * facadePalette.length) | 0]
    const mat = makeBuildingMaterial(color)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(footprintW, h, footprintD), mat)
    mesh.position.set(cx, h / 2, cz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    buildingGroup.add(mesh)
    registerCollider(cx, cz, footprintW, footprintD, h)
    if (Math.random() < 0.35) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 2.2, 10),
        tankMat
      )
      tank.position.set(
        cx + (Math.random() - 0.5) * footprintW * 0.4,
        h + 1.1,
        cz + (Math.random() - 0.5) * footprintD * 0.4
      )
      tank.castShadow = true
      buildingGroup.add(tank)
    }
  }

  // Two inner landmarks only — Ponte is the tallest thing inside the
  // play grid; everything else stays under the monument band.
  buildTallTower(-BLOCK * 0.3, -BLOCK * 0.3)
  buildPonteTower(BLOCK * 1.4, BLOCK * 0.6)
  buildBrutalistBuilding(BLOCK * 0.8, -BLOCK * 2.0)
  buildBrutalistBuilding(-BLOCK * 2.5, -BLOCK * 0.8)

  const half = GRID_N / 2
  for (let ix = -half; ix < half; ix++) {
    for (let iz = -half; iz < half; iz++) {
      const bx = (ix + 0.5) * BLOCK
      const bz = (iz + 0.5) * BLOCK
      if (
        Math.abs(bx - -BLOCK * 0.3) < BLOCK * 0.6 &&
        Math.abs(bz - -BLOCK * 0.3) < BLOCK * 0.6
      ) {
        continue
      }
      if (
        Math.abs(bx - BLOCK * 1.4) < BLOCK * 0.6 &&
        Math.abs(bz - BLOCK * 0.6) < BLOCK * 0.6
      ) {
        continue
      }
      const usable = BLOCK - STREET_W - 4
      const nSplit = 1 + ((Math.random() * 3) | 0)
      if (nSplit === 1) {
        buildBlockBuilding(bx, bz, usable, usable)
      } else {
        const lotW = usable / nSplit
        for (let s = 0; s < nSplit; s++) {
          const lx = bx - usable / 2 + lotW * (s + 0.5)
          const lw = lotW * 0.86
          const ld = usable * (0.55 + Math.random() * 0.4)
          const lz = bz + (Math.random() - 0.5) * (usable - ld)
          buildBlockBuilding(lx, lz, lw, ld)
        }
      }
    }
  }

  // Outer skyline under the monuments (Telkom/Vodacom sit at ~170-200).
  const FAR_COUNT = 140
  const farSkyline = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    farSkylineMat,
    FAR_COUNT
  )
  farSkyline.castShadow = false
  farSkyline.receiveShadow = false
  const farDummy = new THREE.Object3D()
  let farPlaced = 0
  for (let i = 0; i < FAR_COUNT; i++) {
    const ang = Math.random() * Math.PI * 2
    const dist = 320 + Math.random() * 180
    const fx = Math.cos(ang) * dist
    const fz = Math.sin(ang) * dist
    if (MONUMENT_ANCHORS.some((a) => Math.hypot(fx - a.x, fz - a.z) < a.clearance)) {
      continue
    }
    const fh = 10 + Math.random() * 12
    const fw = 8 + Math.random() * 14
    const fd = 8 + Math.random() * 14
    farDummy.position.set(fx, fh / 2, fz)
    farDummy.scale.set(fw, fh, fd)
    farDummy.updateMatrix()
    farSkyline.setMatrixAt(farPlaced, farDummy.matrix)
    farPlaced += 1
  }
  farSkyline.count = farPlaced
  farSkyline.instanceMatrix.needsUpdate = true
  buildingGroup.add(farSkyline)

  const monuments = buildCbdMonuments(group)

  scene.add(group)

  return {
    group,
    colliders,
    dispose() {
      monuments.dispose()
      scene.remove(group)
      disposeObject3D(group)
      disposeGeometries(group)
    },
  }
}

/**
 * Park Station landmark + win zone beacon. Loads the Draco-compressed GLB and
 * keeps the green beacon rings as a navigation aid toward the escape point.
 * @param {THREE.Group} cityGroup
 * @param {number} x
 * @param {number} z
 * @param {BuildingCollider[]} [colliders]
 */
export function buildParkStationPrecinct(cityGroup, x, z, colliders) {
  const station = new THREE.Group()
  station.name = 'park-station'

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 14, 8),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.75 })
  )
  beacon.position.set(0, 7, 0)
  beacon.name = 'park-beacon'
  station.add(beacon)

  const beaconRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.6 })
  )
  beaconRing.position.set(0, 14, 0)
  beaconRing.rotation.x = Math.PI / 2
  beaconRing.name = 'park-beacon-ring'
  station.add(beaconRing)

  const beaconRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(2.0, 0.06, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.4 })
  )
  beaconRing2.position.set(0, 14, 0)
  beaconRing2.rotation.x = Math.PI / 2
  beaconRing2.name = 'park-beacon-ring-2'
  station.add(beaconRing2)

  let cancelled = false
  station.userData.cancelParkStationLoad = () => {
    cancelled = true
  }

  /** @type {{ cx: number, cz: number, hw: number, hd: number }} */
  const footprint = {
    cx: x,
    cz: z,
    hw: PARK_STATION_TARGET_SIZE * 0.25,
    hd: PARK_STATION_TARGET_SIZE * 0.25,
  }

  loadParkStationTemplate().then(() => {
    if (cancelled) return
    const model = cloneParkStationInstance()
    if (!model) return
    model.name = 'park-station-mesh'
    station.add(model)
    station.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // setFromObject uses world space — do not add placement x/z again.
    footprint.cx = center.x
    footprint.cz = center.z
    footprint.hw = size.x / 2
    footprint.hd = size.z / 2

    const beaconLocal = center.clone()
    station.worldToLocal(beaconLocal)
    const beaconY = box.max.y - station.position.y + 1.5
    beacon.position.set(beaconLocal.x, beaconY, beaconLocal.z)
    beaconRing.position.set(beaconLocal.x, beaconY + 7, beaconLocal.z)
    beaconRing2.position.set(beaconLocal.x, beaconY + 7, beaconLocal.z)

    /** @type {BuildingCollider | undefined} */
    let stationCollider

    if (colliders) {
      stationCollider = {
        x: footprint.cx,
        z: footprint.cz,
        hw: footprint.hw + 0.5,
        hd: footprint.hd + 0.5,
        h: size.y,
      }
      colliders.push(stationCollider)
    }

    fitFootprintInsideWorldBounds(station, footprint, stationCollider)

    if (import.meta.env.DEV) {
      console.log('[Level3] Park Station GLB placed', {
        anchor: { x: station.position.x, z: station.position.z },
        footprintW: size.x.toFixed(1),
        footprintD: size.z.toFixed(1),
        center: { x: footprint.cx.toFixed(1), z: footprint.cz.toFixed(1) },
        bound: LEVEL3_WORLD_BOUND,
      })
    }
  })

  station.position.set(x, 0, z)
  cityGroup.add(station)

  return {
    group: station,
    x,
    z,
    /** @param {number} px @param {number} pz */
    getDistanceToGoal(px, pz) {
      return distanceToFootprint(px, pz, footprint.cx, footprint.cz, footprint.hw, footprint.hd)
    },
    /** @param {number} px @param {number} pz */
    isAtGoal(px, pz) {
      return (
        distanceToFootprint(px, pz, footprint.cx, footprint.cz, footprint.hw, footprint.hd) <=
        PARK_STATION_WIN_REACH
      )
    },
    getGoalCenter: () => ({ x: footprint.cx, z: footprint.cz }),
  }
}
