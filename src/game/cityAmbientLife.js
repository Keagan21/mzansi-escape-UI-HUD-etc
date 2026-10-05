// cityAmbientLife.js — Shared open-world ambient pedestrians + parked/moving cars (decor only).

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'
import { CHARACTERS, KENNEY_RUN_FBX } from './characterAssets.js'
import {
  createLevel2CarInstance,
  loadLevel2CarTemplate,
} from './level2CarCache.js'
import { loadLevel2HazardCarTemplate } from './level2HazardCarCache.js'
import { cloneObstacleInstance } from './modelPrep.js'
import { pickRunClip } from '../mixamoAnimation.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

function makePerson(kind) {
  const g = new THREE.Group()
  const kid = kind === 'kid'
  const bodyH = kid ? 0.85 : 1.25
  const skin = kid ? 0xe8b895 : 0xc48a62
  const shirt = kid
    ? 0xff7043
    : [0x1565c0, 0x2e7d32, 0x6a1b9a, 0xc62828][(Math.random() * 4) | 0]
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

function swapCar(holder, next) {
  swapChild(holder, fitStreetVehicle(next, { minHeight: 2.05, length: 4.7 }))
}

function addVehicleCollider(addCollider, x, z, ry) {
  if (!addCollider) return
  const alongZ = Math.abs(Math.cos(ry)) >= Math.abs(Math.sin(ry))
  const wide = 1.25
  const long = 2.5
  addCollider({
    x,
    z,
    hw: alongZ ? wide : long,
    hd: alongZ ? long : wide,
    h: 2.15,
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

function loadCarOnto(holder, id, source, cancelled) {
  if (source === 'hazard') {
    void loadLevel2HazardCarTemplate(id).then((template) => {
      if (cancelled() || !template) return
      swapCar(holder, cloneObstacleInstance(template))
    })
    return
  }
  void loadLevel2CarTemplate(id).then(() => {
    if (cancelled()) return
    const inst = createLevel2CarInstance(id)
    if (inst) swapCar(holder, inst)
  })
}

/**
 * @typedef {{ kind: 'adult' | 'kid', char: string, pts: [number, number][] }} AmbientWalkerPath
 * @typedef {{ kind: 'adult' | 'kid', char: string, x: number, z: number, ry: number }} AmbientStanding
 * @typedef {{ id: string, source: 'player' | 'hazard', x: number, z: number, ry: number }} AmbientParkedCar
 * @typedef {{ id: string, source: 'player' | 'hazard', pts: [number, number][], speed: number }} AmbientMovingCar
 *
 * @param {THREE.Object3D} parent
 * @param {{
 *   name?: string
 *   walkers?: AmbientWalkerPath[]
 *   standing?: AmbientStanding[]
 *   parkedCars?: AmbientParkedCar[]
 *   movingCars?: AmbientMovingCar[]
 *   addCollider?: (c: { x: number, z: number, hw: number, hd: number, h: number, active: boolean }) => void
 * }} [opts]
 */
export function createCityAmbientLife(parent, opts = {}) {
  const addCollider = opts.addCollider
  const walkPaths = opts.walkers ?? []
  const standingSpots = opts.standing ?? []
  const parkedSpots = opts.parkedCars ?? []
  const movingPaths = opts.movingCars ?? []

  const group = new THREE.Group()
  group.name = opts.name ?? 'city-ambient-life'
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

  const walkers = walkPaths.map((path) => {
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
      mixer: null,
    }
  })

  const standing = standingSpots.map((spot) => {
    const holder = new THREE.Group()
    holder.add(makePerson(spot.kind))
    holder.position.set(spot.x, 0, spot.z)
    holder.rotation.y = spot.ry
    group.add(holder)
    return { mesh: holder, kind: spot.kind, char: spot.char }
  })

  const parked = parkedSpots.map((spot) => {
    const holder = new THREE.Group()
    holder.add(makeCarFallback())
    holder.position.set(spot.x, 0, spot.z)
    holder.rotation.y = spot.ry
    group.add(holder)
    addVehicleCollider(addCollider, spot.x, spot.z, spot.ry)
    return { mesh: holder, id: spot.id, source: spot.source }
  })

  const moving = movingPaths.map((path) => {
    const holder = new THREE.Group()
    holder.add(makeCarFallback())
    const pts = path.pts.map(([x, z]) => new THREE.Vector3(x, 0, z))
    holder.position.copy(pts[0])
    group.add(holder)
    return {
      mesh: holder,
      id: path.id,
      source: path.source,
      pts,
      seg: 0,
      t: Math.random(),
      speed: path.speed,
    }
  })

  let cancelled = false
  const isCancelled = () => cancelled

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
        const clip =
          pickRunClip(anims) ?? anims[0] ?? (await loadClip(def.runAnimUrl ?? KENNEY_RUN_FBX))
        const packed = { model, clip }
        charTemplates.set(id, packed)
        resolve(packed)
      }
      if (format === 'fbx') {
        fbxLoader.load(
          def.url,
          (fbxGroup) => void finish(fbxGroup, fbxGroup.animations || []),
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

  const dressPeople = async () => {
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

  void dressPeople()

  for (const car of parked) {
    loadCarOnto(car.mesh, car.id, car.source, isCancelled)
  }
  for (const car of moving) {
    loadCarOnto(car.mesh, car.id, car.source, isCancelled)
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
    standing,
    parked,
    moving,
    /** @param {number} dt */
    update(dt) {
      for (const mixer of mixers) mixer.update(dt)
      for (const w of walkers) stepPath(w, dt)
      for (const car of moving) stepPath(car, dt)
    },
    setVisible(on) {
      group.visible = on
    },
    dispose() {
      cancelled = true
      parent.remove(group)
      disposeObject3D(group)
      draco.dispose()
    },
  }
}
