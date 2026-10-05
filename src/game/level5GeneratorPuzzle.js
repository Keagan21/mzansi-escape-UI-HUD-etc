// level5GeneratorPuzzle.js — Node 3: generator restart under load-shedding cycles.

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL5_ANCHORS } from './level5City.js'

export const GEN_REACH = 16
export const GEN_CYCLE_ON_MS = 5800
export const GEN_CYCLE_OFF_MS = 4200
export const GEN_WRONG_WINDOW_BATTERY = 16
export const GEN_WRONG_STEP_BATTERY = 8

const GEN_CYCLE_ON = GEN_CYCLE_ON_MS / 1000
const GEN_CYCLE_OFF = GEN_CYCLE_OFF_MS / 1000

const STEP_IDS = ['fuel', 'ignition', 'choke', 'start']
const STEP_LABELS = ['1  FUEL LINE', '2  IGNITION', '3  CHOKE → RUN', '4  START']

function makeTextPlane(text, w, h, fill = '#071018', ink = '#f4fbff') {
  const c = document.createElement('canvas')
  c.width = 768
  c.height = 192
  const ctx = c.getContext('2d')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, 768, 192)
  ctx.strokeStyle = ink
  ctx.lineWidth = 10
  ctx.strokeRect(10, 10, 748, 172)
  ctx.fillStyle = ink
  ctx.font = 'bold 56px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 384, 96)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.userData.tex = tex
  return mesh
}

function makeBoardTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 320
  const ctx = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  const draw = (title, sub, on) => {
    ctx.fillStyle = on ? '#06351c' : '#3a1010'
    ctx.fillRect(0, 0, 1024, 320)
    ctx.strokeStyle = on ? '#7dffb0' : '#ff8a8a'
    ctx.lineWidth = 14
    ctx.strokeRect(16, 16, 992, 288)
    ctx.fillStyle = on ? '#d8ffe8' : '#ffe0e0'
    ctx.font = 'bold 56px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, 512, 120)
    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#f7f3e8'
    ctx.fillText(sub, 512, 210)
    tex.needsUpdate = true
  }
  draw('WAIT FOR GREEN', 'Act only while the deck is ON', true)
  return { tex, draw }
}

/**
 * @param {THREE.Object3D} parent
 * @param {number} originX
 * @param {number} originZ
 */
export function createLevel5GeneratorPuzzle(
  parent,
  originX = LEVEL5_ANCHORS.node3_generator.x,
  originZ = LEVEL5_ANCHORS.node3_generator.z
) {
  const group = new THREE.Group()
  group.name = 'generator-puzzle'
  group.position.set(originX, 0, originZ)
  parent.add(group)

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(13.5, 0.2, 10.5),
    new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.85 })
  )
  deck.position.set(0, 0.12, 3.15)
  group.add(deck)

  const wash = new THREE.Mesh(
    new THREE.CircleGeometry(6.4, 48),
    new THREE.MeshBasicMaterial({
      color: 0x22ff88,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  )
  wash.rotation.x = -Math.PI / 2
  wash.position.set(0, 0.24, 3.15)
  group.add(wash)

  const boardArt = makeBoardTexture()
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 2.55),
    new THREE.MeshBasicMaterial({ map: boardArt.tex })
  )
  board.rotation.x = -Math.PI / 2
  board.position.set(0, 0.28, 7.35)
  group.add(board)

  const howTo = makeTextPlane('FUEL → IGNITION → CHOKE → START', 8.2, 0.7, '#102030', '#ffe27a')
  howTo.position.set(0, 0.3, 6.05)
  group.add(howTo)

  /** @type {THREE.Object3D[]} */
  const pickables = []
  /** @type {Record<string, THREE.Mesh>} */
  const parts = {}
  const extraTex = [boardArt.tex, howTo.userData.tex]

  const addPick = (mesh, id) => {
    mesh.userData.stepId = id
    pickables.push(mesh)
  }

  // Fuel line (left)
  const fuel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 3.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.55 })
  )
  fuel.rotation.z = Math.PI / 2
  fuel.position.set(-4.2, 0.9, 3.2)
  fuel.userData.baseColor = 0x5a4030
  addPick(fuel, 'fuel')
  group.add(fuel)
  parts.fuel = fuel
  const fuelTag = makeTextPlane('1  FUEL LINE', 2.6, 0.5, '#2a1810', '#ffe0b0')
  fuelTag.position.set(-4.2, 1.4, 3.2)
  addPick(fuelTag, 'fuel')
  group.add(fuelTag)
  extraTex.push(fuelTag.userData.tex)

  // Ignition cable (right)
  const ignition = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.3, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1a1c22, emissive: 0x111318, roughness: 0.4 })
  )
  ignition.position.set(4.0, 0.55, 3.4)
  ignition.userData.liveColor = 0xf9a825
  addPick(ignition, 'ignition')
  group.add(ignition)
  parts.ignition = ignition
  const ignTag = makeTextPlane('2  IGNITION', 2.4, 0.48, '#141820', '#ffffff')
  ignTag.position.set(4.0, 0.85, 3.4)
  addPick(ignTag, 'ignition')
  group.add(ignTag)
  extraTex.push(ignTag.userData.tex)

  // Choke lever
  const chokeBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.55 })
  )
  chokeBox.position.set(-1.6, 0.75, 1.6)
  const lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.9, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.55 })
  )
  lever.position.set(0, 0.7, 0.15)
  chokeBox.add(lever)
  chokeBox.userData.lever = lever
  addPick(chokeBox, 'choke')
  addPick(lever, 'choke')
  group.add(chokeBox)
  parts.choke = chokeBox
  const chokeTag = makeTextPlane('3  CHOKE', 1.6, 0.45, '#2a2014', '#fff4d2')
  chokeTag.position.set(-1.6, 1.45, 1.6)
  addPick(chokeTag, 'choke')
  group.add(chokeTag)
  extraTex.push(chokeTag.userData.tex)

  // Generator + START button
  const gen = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.25, 1.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a4a3a, metalness: 0.35, roughness: 0.45 })
  )
  gen.position.set(1.4, 0.95, 1.4)
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.18, 14),
    new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      emissive: 0x661111,
      emissiveIntensity: 0.7,
    })
  )
  btn.position.set(0, 0.82, 0)
  gen.add(btn)
  addPick(gen, 'start')
  addPick(btn, 'start')
  group.add(gen)
  parts.start = gen
  const startTag = makeTextPlane('4  START', 2.2, 0.48, '#301010', '#ffb0b0')
  startTag.position.set(1.4, 1.85, 1.4)
  addPick(startTag, 'start')
  group.add(startTag)
  extraTex.push(startTag.userData.tex)

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.38, 36),
    new THREE.MeshBasicMaterial({
      color: 0xffee55,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  )
  halo.rotation.x = -Math.PI / 2
  halo.position.y = 0.32
  group.add(halo)

  let complete = false
  let step = 0
  let cycleT = 0
  let pulseT = 0
  let powerOn = true
  let hoverId = ''

  const haloAt = (id) => {
    const mesh = parts[id]
    if (!mesh) return
    halo.position.x = mesh.position.x
    halo.position.z = mesh.position.z
    if (id === 'choke') halo.position.y = 1.4
    else if (id === 'start') halo.position.y = 1.85
    else if (id === 'fuel') halo.position.y = 1.2
    else halo.position.y = 0.7
  }

  const paintPower = () => {
    const on = complete || powerOn
    wash.material.color.setHex(on ? 0x1cff7a : 0xff2a2a)
    wash.material.opacity = on ? 0.4 : 0.5
    boardArt.draw(
      complete ? 'GENERATOR ONLINE' : on ? 'GREEN — ACT NOW' : 'RED — WAIT',
      complete
        ? 'Head to Cape Town Stadium'
        : on
          ? `Next: ${STEP_LABELS[step] ?? 'DONE'}`
          : 'Wait for the green window',
      on
    )
    halo.visible = !complete
    if (!complete) haloAt(STEP_IDS[step])
    halo.material.color.setHex(on ? 0xffee55 : 0x662222)
  }

  const markDone = (id) => {
    const mesh = parts[id]
    if (!mesh) return
    if (id === 'fuel') {
      mesh.material.color.setHex(0x2e7d32)
      mesh.material.emissive?.setHex?.(0x1a5a22)
      if (mesh.material.emissive) mesh.material.emissiveIntensity = 0.4
    } else if (id === 'ignition') {
      mesh.material.color.setHex(mesh.userData.liveColor)
      mesh.material.emissive.setHex(mesh.userData.liveColor)
      mesh.material.emissiveIntensity = 0.45
    } else if (id === 'choke') {
      mesh.userData.lever.rotation.z = -0.85
      mesh.material.color.setHex(0x2e7d32)
    } else {
      mesh.material.emissive.setHex(0x44ff88)
      mesh.material.emissiveIntensity = 0.85
    }
  }

  paintPower()

  return {
    group,
    origin: { x: originX, z: originZ },
    inZone(px, pz) {
      return Math.hypot(px - originX, pz - originZ) < GEN_REACH
    },
    isComplete: () => complete,
    isPowerOn: () => powerOn,
    stepIndex: () => step,
    nextLabel: () => (complete ? 'Done' : STEP_LABELS[step] ?? ''),
    getPickables: () => pickables,
    setHover(obj) {
      hoverId = obj?.userData?.stepId ?? ''
      void hoverId
    },
    tryClickObject(obj) {
      if (complete) return false
      const id = obj?.userData?.stepId
      if (!id) return false
      if (!powerOn) return 'shock'
      const expected = STEP_IDS[step]
      if (id !== expected) return 'wrong-step'
      markDone(id)
      step++
      paintPower()
      if (step >= STEP_IDS.length) {
        complete = true
        powerOn = true
        halo.visible = false
        paintPower()
        return 'solved'
      }
      return 'ok'
    },
    update(dt) {
      pulseT += dt
      if (!complete) {
        halo.material.opacity = 0.4 + (Math.sin(pulseT * 7) * 0.5 + 0.5) * 0.55
        halo.scale.setScalar(1 + Math.sin(pulseT * 7) * 0.06)
      }
      if (complete) {
        powerOn = true
        return powerOn
      }
      cycleT += dt
      const span = powerOn ? GEN_CYCLE_ON : GEN_CYCLE_OFF
      if (cycleT >= span) {
        cycleT = 0
        powerOn = !powerOn
        paintPower()
      }
      return powerOn
    },
    reset() {
      complete = false
      step = 0
      cycleT = 0
      pulseT = 0
      powerOn = true
      hoverId = ''
      halo.visible = true
      parts.fuel.material.color.setHex(0x5a4030)
      if (parts.fuel.material.emissive) parts.fuel.material.emissiveIntensity = 0
      parts.ignition.material.color.setHex(0x1a1c22)
      parts.ignition.material.emissive.setHex(0x111318)
      parts.ignition.material.emissiveIntensity = 0
      parts.choke.material.color.setHex(0x5a4a32)
      parts.choke.userData.lever.rotation.z = 0
      parts.start.material.emissive.setHex(0x000000)
      parts.start.material.emissiveIntensity = 0
      paintPower()
    },
    dispose() {
      parent.remove(group)
      disposeObject3D(group)
      for (const tex of extraTex) tex.dispose()
    },
  }
}
