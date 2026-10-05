// level8People.js — Township crowd using Level 1 taxis, Level 2 cars, and playable characters.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { CHARACTERS, KENNEY_RUN_FBX } from './characterAssets.js'
import { preloadTaxi, whenTaxiReady, getTaxiTemplate } from './level1TaxiCache.js'
import {
  createLevel2CarInstance,
  loadLevel2CarTemplate,
} from './level2CarCache.js'
import { loadLevel2HazardCarTemplate } from './level2HazardCarCache.js'
import { cloneObstacleInstance, cloneTaxiInstance } from './modelPrep.js'
import { pickRunClip } from '../mixamoAnimation.js'
import { disposeObject3D } from './threeDispose.js'

const ADULT_LINES = [
  'Hai, that canal is angry today.',
  'Use the ridge, sisi — the dip is gone.',
  'Taxi hooting like the storm is late.',
  'Don’t walk that water, wena.',
  'Clinic fridge is still running. Sharp.',
]

const STORM_ADULT_LINES = [
  'Hai that lightning is sitting on the zinc!',
  'Get off the street — the storm is eating the lights!',
  'Hear that thunder? Stay under the stoep!',
  'Papers flying like the sky is tearing.',
  'Don’t stand near that fence, sisi!',
  'The school roof is going to fly, wena!',
  'Taxi, slow down — nobody can see in this rain!',
  'Stay off Vilakazi, the water is coming over the curb!',
]

const STORM_KID_LINES = [
  'Ma the sky is shouting!',
  'The papers are racing us!',
  'Lightning! Close your eyes!',
  'The thunder is chasing us home!',
  'Look, the notes are flying off the ground!',
]

const KID_LINES = [
  'Race you to the stoep!',
  'Ma said stay out of the puddles!',
  'Look, the street is a river!',
  'Last one home is a soggy sock!',
]

const PATHS = [
  { kind: 'adult', char: 'test-skater-m', pts: [[10.6, 100], [10.6, 40], [40, 40]] },
  { kind: 'adult', char: 'test-skater-f', pts: [[10.6, 88], [10.6, -20], [10.6, -80]] },
  { kind: 'adult', char: 'test-criminal', pts: [[-10.6, 70], [-10.6, -8], [-36, -8]] },
  { kind: 'kid', char: 'kid', pts: [[10.6, 92], [10.6, 50], [-10.6, 50], [-10.6, 20]] },
  { kind: 'kid', char: 'kid', pts: [[-10.6, 8], [-40, 8], [-40, -20]] },
  { kind: 'adult', char: 'athletic-lady', pts: [[10.6, -48], [10.6, -70], [10.6, -88]] },
  { kind: 'kid', char: 'kid', pts: [[10.6, -44], [10.6, -52], [28, -52]] },
  { kind: 'adult', char: 'micheale', pts: [[-10.6, 90], [-10.6, 60], [-10.6, 10]] },
  { kind: 'adult', char: 'mousy', pts: [[10.6, 30], [10.6, -10], [36, -10]] },
  { kind: 'adult', char: 'test-skater-m', pts: [[-10.6, -30], [-10.6, -80], [-10.6, -88]] },
  { kind: 'adult', char: 'test-cyborg-f', pts: [[10.6, 18], [10.6, -24], [-10.6, -38]] },
]

const STANDING = [
  { kind: 'adult', char: 'test-skater-f', x: 13.2, z: 100.5, ry: 2.5 },
  { kind: 'adult', char: 'micheale', x: -13.2, z: 100.5, ry: -2.4 },
  { kind: 'adult', char: 'athletic-lady', x: 13.2, z: 52.5, ry: 1.15 },
  { kind: 'adult', char: 'mousy', x: -13.2, z: 11, ry: -1.35 },
  { kind: 'kid', char: 'kid', x: 13.4, z: 76.5, ry: 2.1 },
]

/** Curb of the 18-wide ridge road (lanes ±4, road edge ±9). */
const TAXI_SPOTS = [
  { x: 7.1, z: 86, ry: 0 },
  { x: -7.1, z: 68, ry: Math.PI },
  { x: 7.1, z: 28, ry: 0 },
  { x: -7.1, z: -12, ry: Math.PI },
  { x: 7.1, z: -46, ry: 0 },
  { x: -7.1, z: -78, ry: Math.PI },
]

const PARKED_CARS = [
  { id: 'polo', source: 'player', x: -7.1, z: 88, ry: Math.PI },
  { id: 'gusheshe', source: 'player', x: 7.1, z: 58, ry: 0 },
  { id: 'jmpd', source: 'player', x: -7.1, z: 22, ry: Math.PI },
  { id: 'car', source: 'player', x: -7.1, z: -68, ry: Math.PI },
  { id: 'mazda', source: 'hazard', x: 28, z: 45.2, ry: Math.PI / 2 },
  { id: 'suzuki', source: 'hazard', x: -7.1, z: -46, ry: Math.PI },
  { id: 'cherry', source: 'hazard', x: 7.1, z: -84, ry: 0 },
]

const LANE_E = 4.05
const LANE_W = -4.05
const STREET_Z0 = 102
const STREET_Z1 = -96

const MOVING_TAXIS = [
  { pts: [[LANE_E, STREET_Z0], [LANE_E, STREET_Z1]], speed: 7.4 },
  { pts: [[LANE_W, STREET_Z1], [LANE_W, STREET_Z0]], speed: 6.6 },
  { pts: [[12, 40], [50, 40]], speed: 6.1 },
  { pts: [[-12, 70], [-48, 70]], speed: 5.7 },
]

const DRACO = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

function makePerson(kind) {
  const g = new THREE.Group()
  const kid = kind === 'kid'
  const bodyH = kid ? 0.85 : 1.25
  const skin = kid ? 0xe8b895 : 0xc48a62
  const shirt = kid ? 0xff7043 : [0x1565c0, 0x2e7d32, 0x6a1b9a, 0xc62828][(Math.random() * 4) | 0]
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(kid ? 0.18 : 0.22, bodyH, 4, 8),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 })
  )
  body.position.y = bodyH / 2 + 0.22
  body.castShadow = true
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(kid ? 0.16 : 0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 })
  )
  head.position.y = bodyH + 0.42
  g.add(body, head)
  g.userData.kind = kind
  g.userData.placeholder = true
  return g
}

function makeTaxiFallback() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 2.15, 5.4),
    new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.45, metalness: 0.2 })
  )
  body.position.y = 1.15
  body.castShadow = true
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.28, 5.42),
    new THREE.MeshStandardMaterial({ color: 0x1565c0 })
  )
  stripe.position.y = 1.35
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.85, 2.1),
    new THREE.MeshStandardMaterial({
      color: 0x87c8e8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.7,
    })
  )
  cabin.position.set(0, 2.15, -0.35)
  g.add(body, stripe, cabin)
  return g
}

function makeCarFallback() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.55, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.25 })
  )
  body.position.y = 0.85
  body.castShadow = true
  g.add(body)
  return g
}

function swapChild(holder, next) {
  while (holder.children.length) {
    const old = holder.children[0]
    holder.remove(old)
    if (old.userData.placeholder) disposeObject3D(old)
  }
  holder.add(next)
}

/** Level 1/2 vehicles are runner-scale; lift them so they read bigger than 1.7m people. */
function fitStreetVehicle(root, { minHeight, length }) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const long = Math.max(size.x, size.z)
  const s = Math.max(minHeight / Math.max(size.y, 0.001), length / Math.max(long, 0.001))
  root.scale.multiplyScalar(s)
  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  root.position.y -= grounded.min.y
  return root
}

function swapTaxi(holder, next) {
  swapChild(holder, fitStreetVehicle(next, { minHeight: 2.25, length: 5.6 }))
}

function swapCar(holder, next) {
  swapChild(holder, fitStreetVehicle(next, { minHeight: 2.05, length: 4.7 }))
}

function addVehicleCollider(addCollider, x, z, ry, kind = 'car') {
  if (!addCollider) return
  const alongZ = Math.abs(Math.cos(ry)) >= Math.abs(Math.sin(ry))
  const wide = kind === 'taxi' ? 1.4 : 1.25
  const long = kind === 'taxi' ? 2.95 : 2.5
  addCollider({
    x,
    z,
    hw: alongZ ? wide : long,
    hd: alongZ ? long : wide,
    h: kind === 'taxi' ? 2.4 : 2.15,
    active: true,
  })
}

function applySkin(root, skinUrl, textureLoader) {
  return new Promise((resolve) => {
    if (!skinUrl) {
      resolve()
      return
    }
    textureLoader.load(
      skinUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        root.traverse((o) => {
          if (!o.isMesh || !o.material) return
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) {
            m.map = tex
            m.needsUpdate = true
          }
        })
        resolve()
      },
      undefined,
      () => resolve()
    )
  })
}

function fitCharacter(root, targetH = 1.7) {
  const extras = []
  root.traverse((o) => {
    if (o.isCamera || o.isLight) extras.push(o)
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      o.frustumCulled = false
    }
  })
  for (const extra of extras) extra.parent?.remove(extra)
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const h = Math.max(size.y, 0.001)
  root.scale.setScalar(targetH / h)
  root.updateMatrixWorld(true)
  const b2 = new THREE.Box3().setFromObject(root)
  root.position.set(0, -b2.min.y, 0)
  root.rotation.set(0, 0, 0)
  return root
}

/**
 * @param {THREE.Object3D} parent
 * @param {{ addCollider?: (c: { x: number, z: number, hw: number, hd: number, h: number, active: boolean }) => void }} [opts]
 */
export function createLevel8People(parent, opts = {}) {
  const addCollider = opts.addCollider
  const group = new THREE.Group()
  group.name = 'level8-people'
  parent.add(group)

  const textureLoader = new THREE.TextureLoader()
  const gltfLoader = new GLTFLoader()
  const draco = new DRACOLoader()
  draco.setDecoderPath(DRACO)
  gltfLoader.setDRACOLoader(draco)
  const fbxLoader = new FBXLoader()

  /** @type {Map<string, { model: THREE.Object3D, clip: import('three').AnimationClip | null }>} */
  const charTemplates = new Map()
  const mixers = []

  const walkers = PATHS.map((path, i) => {
    const holder = new THREE.Group()
    holder.add(makePerson(path.kind))
    const pts = path.pts.map(([x, z]) => new THREE.Vector3(x, 0, z))
    holder.position.copy(pts[0])
    group.add(holder)
    return {
      mesh: holder,
      kind: path.kind,
      char: path.char,
      pts,
      seg: 0,
      t: Math.random(),
      speed: path.kind === 'kid' ? 3.4 : 2.15,
      barkAt: 4 + Math.random() * 8 + i,
      mixer: null,
    }
  })

  const taxis = TAXI_SPOTS.map((spot) => {
    const holder = new THREE.Group()
    holder.add(makeTaxiFallback())
    holder.position.set(spot.x, 0, spot.z)
    holder.rotation.y = spot.ry
    group.add(holder)
    addVehicleCollider(addCollider, spot.x, spot.z, spot.ry, 'taxi')
    return { mesh: holder, x: spot.x, z: spot.z, honkAt: 6 + Math.random() * 10 }
  })

  const parked = PARKED_CARS.map((spot) => {
    const holder = new THREE.Group()
    holder.add(makeCarFallback())
    holder.position.set(spot.x, 0, spot.z)
    holder.rotation.y = spot.ry
    group.add(holder)
    addVehicleCollider(addCollider, spot.x, spot.z, spot.ry, 'car')
    return { mesh: holder, id: spot.id, source: spot.source }
  })

  const standing = STANDING.map((spot) => {
    const holder = new THREE.Group()
    holder.add(makePerson(spot.kind))
    holder.position.set(spot.x, 0, spot.z)
    holder.rotation.y = spot.ry
    group.add(holder)
    return { mesh: holder, kind: spot.kind, char: spot.char, barkAt: 5 + Math.random() * 9 }
  })

  const moving = MOVING_TAXIS.map((path) => {
    const holder = new THREE.Group()
    holder.add(makeTaxiFallback())
    const pts = path.pts.map(([x, z]) => new THREE.Vector3(x, 0, z))
    holder.position.copy(pts[0])
    group.add(holder)
    return { mesh: holder, pts, seg: 0, t: Math.random(), speed: path.speed, honkAt: 8 + Math.random() * 10 }
  })

  let cancelled = false

  const loadClip = (url) =>
    new Promise((resolve) => {
      const done = (anims) => resolve(pickRunClip(anims) ?? anims[0] ?? null)
      if (/\.fbx$/i.test(url)) {
        fbxLoader.load(url, (g) => done(g.animations || []), undefined, () => resolve(null))
      } else {
        gltfLoader.load(url, (gltf) => done(gltf.animations || []), undefined, () => resolve(null))
      }
    })

  const loadCharacter = (id) => {
    if (charTemplates.has(id)) return Promise.resolve(charTemplates.get(id))
    const def = CHARACTERS.find((c) => c.id === id)
    if (!def) return Promise.resolve(null)
    const format = def.format ?? 'gltf'
    return new Promise((resolve) => {
      const finish = async (root, anims) => {
        const model = fitCharacter(root, id === 'kid' ? 1.25 : 1.7)
        await applySkin(model, def.skinUrl, textureLoader)
        const clip = pickRunClip(anims) ?? anims[0] ?? (await loadClip(def.runAnimUrl ?? KENNEY_RUN_FBX))
        const packed = { model, clip }
        charTemplates.set(id, packed)
        resolve(packed)
      }
      if (format === 'fbx') {
        fbxLoader.load(
          def.url,
          (group) => void finish(group, group.animations || []),
          undefined,
          () => resolve(null)
        )
      } else {
        gltfLoader.load(
          def.url,
          (gltf) => void finish(gltf.scene, gltf.animations || []),
          undefined,
          () => resolve(null)
        )
      }
    })
  }

  const dressWalkers = async () => {
    for (const w of walkers) {
      if (cancelled) return
      const packed = await loadCharacter(w.char)
      if (!packed || cancelled) continue
      const clone = skeletonClone(packed.model)
      swapChild(w.mesh, clone)
      if (packed.clip) {
        const mixer = new THREE.AnimationMixer(clone)
        const action = mixer.clipAction(packed.clip)
        action.play()
        w.mixer = mixer
        mixers.push(mixer)
      }
    }
    for (const s of standing) {
      if (cancelled) return
      const packed = await loadCharacter(s.char)
      if (!packed || cancelled) continue
      swapChild(s.mesh, skeletonClone(packed.model))
    }
  }

  void dressWalkers()
  void preloadTaxi()
  whenTaxiReady(() => {
    if (cancelled) return
    const template = getTaxiTemplate()
    if (!template) return
    for (const taxi of taxis) swapTaxi(taxi.mesh, cloneTaxiInstance(template))
    for (const taxi of moving) swapTaxi(taxi.mesh, cloneTaxiInstance(template))
  })

  for (const car of parked) {
    if (car.id && car.source === 'hazard') {
      void loadLevel2HazardCarTemplate(car.id).then((template) => {
        if (cancelled || !template) return
        swapCar(car.mesh, cloneObstacleInstance(template))
      })
      continue
    }
    void loadLevel2CarTemplate(car.id).then(() => {
      if (cancelled) return
      const inst = createLevel2CarInstance(car.id)
      if (inst) swapCar(car.mesh, inst)
    })
  }

  const stepPath = (item, dt) => {
    const a = item.pts[item.seg]
    const b = item.pts[(item.seg + 1) % item.pts.length]
    item.t += (item.speed * dt) / Math.max(0.5, a.distanceTo(b))
    if (item.t >= 1) {
      item.t -= 1
      item.seg = (item.seg + 1) % item.pts.length
    }
    const a2 = item.pts[item.seg]
    const b2 = item.pts[(item.seg + 1) % item.pts.length]
    item.mesh.position.lerpVectors(a2, b2, item.t)
    const dx = b2.x - a2.x
    const dz = b2.z - a2.z
    item.mesh.rotation.y = Math.atan2(dx, dz)
  }

  return {
    group,
    walkers,
    taxis,
    /** @param {number} dt */
    update(dt) {
      for (const mixer of mixers) mixer.update(dt)
      for (const w of walkers) {
        stepPath(w, dt)
        w.barkAt -= dt
      }
      for (const s of standing) s.barkAt -= dt
      for (const taxi of moving) {
        stepPath(taxi, dt)
        taxi.honkAt -= dt
      }
      for (const taxi of taxis) taxi.honkAt -= dt
    },
    pollBark(px, pz, storm = false) {
      for (const w of [...walkers, ...standing]) {
        if (w.barkAt > 0) continue
        const d = Math.hypot(w.mesh.position.x - px, w.mesh.position.z - pz)
        w.barkAt = storm ? 4 + Math.random() * 6 : 7 + Math.random() * 10
        if (d > 16) continue
        const lines =
          w.kind === 'kid'
            ? storm
              ? STORM_KID_LINES
              : KID_LINES
            : storm
              ? STORM_ADULT_LINES
              : ADULT_LINES
        return {
          kind: w.kind,
          text: lines[(Math.random() * lines.length) | 0],
          x: w.mesh.position.x,
          z: w.mesh.position.z,
        }
      }
      return null
    },
    hitMovingTaxi(px, pz, radius = 2.4) {
      for (const taxi of moving) {
        const d = Math.hypot(taxi.mesh.position.x - px, taxi.mesh.position.z - pz)
        if (d < radius) {
          return { x: taxi.mesh.position.x, z: taxi.mesh.position.z }
        }
      }
      return null
    },
    pollHonk() {
      for (const taxi of [...taxis, ...moving]) {
        if (taxi.honkAt > 0) continue
        taxi.honkAt = 9 + Math.random() * 14
        return { x: taxi.mesh.position.x, z: taxi.mesh.position.z }
      }
      return null
    },
    nearestDistance(px, pz) {
      let best = 99
      for (const w of [...walkers, ...standing]) {
        best = Math.min(best, Math.hypot(w.mesh.position.x - px, w.mesh.position.z - pz))
      }
      return best
    },
    setVisible(on) {
      group.visible = on
    },
    dispose() {
      cancelled = true
      parent.remove(group)
      disposeObject3D(group)
    },
  }
}
