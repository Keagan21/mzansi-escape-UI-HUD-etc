// level4LoadPuzzle.js — Steenbras: cables and breakers only while the grid is ON.

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL4_ANCHORS } from './level4City.js'

export const LOAD_REACH = 16
export const POWER_ON = 6.2
export const POWER_OFF = 4.4
export const LOAD_SHOCK_THIRST = 14

const STEP_IDS = ['cable-0', 'cable-1', 'cable-2', 'breaker-0', 'breaker-1', 'generator']
const STEP_LABELS = [
  '1  CABLE',
  '2  CABLE',
  '3  CABLE',
  '4  BREAKER',
  '5  BREAKER',
  '6  START',
]

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
  ctx.font = 'bold 72px sans-serif'
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
    ctx.font = 'bold 64px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, 512, 120)
    ctx.font = 'bold 42px sans-serif'
    ctx.fillStyle = '#f7f3e8'
    ctx.fillText(sub, 512, 210)
    tex.needsUpdate = true
  }
  draw('WAIT FOR GREEN FLOOR', 'Then click 1 → 6 in order', true)
  return { tex, draw }
}

export function createLevel4LoadPuzzle(parent, originX = LEVEL4_ANCHORS.steenbras.x, originZ = LEVEL4_ANCHORS.steenbras.z) {
  const group = new THREE.Group()
  group.name = 'load-puzzle'
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

  const beaconPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.4, roughness: 0.45 })
  )
  beaconPost.position.set(-5.4, 1.3, 0.55)
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x44ff88 })
  )
  beacon.position.set(-5.4, 2.7, 0.55)
  const beaconGlow = new THREE.PointLight(0x44ff88, 4.5, 18)
  beaconGlow.position.copy(beacon.position)
  group.add(beaconPost, beacon, beaconGlow)

  const boardArt = makeBoardTexture()
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 2.55),
    new THREE.MeshBasicMaterial({ map: boardArt.tex })
  )
  board.rotation.x = -Math.PI / 2
  board.position.set(0, 0.28, 7.35)
  group.add(board)

  const howTo = makeTextPlane('CLICK THE YELLOW RING  ·  1 THEN 2 THEN 3…', 8.2, 0.7, '#102030', '#ffe27a')
  howTo.position.set(0, 0.3, 6.05)
  group.add(howTo)

  const pickables = []
  /** @type {Record<string, THREE.Mesh>} */
  const parts = {}
  /** @type {Record<string, THREE.Mesh>} */
  const labels = {}
  const extraTex = [boardArt.tex, howTo.userData.tex]

  const addPick = (mesh, id) => {
    mesh.userData.stepId = id
    pickables.push(mesh)
  }

  const cableCols = [0xc62828, 0xf9a825, 0x1565c0]
  const cableNames = ['RED', 'YELLOW', 'BLUE']
  for (let i = 0; i < 3; i++) {
    const cable = new THREE.Mesh(
      new THREE.BoxGeometry(2.55, 0.28, 1.35),
      new THREE.MeshStandardMaterial({
        color: 0x1a1c22,
        emissive: 0x111318,
        roughness: 0.45,
      })
    )
    cable.position.set(-3.1 + i * 3.1, 0.42, 4.55)
    cable.userData.liveColor = cableCols[i]
    cable.userData.baseEmissive = 0x111318
    addPick(cable, `cable-${i}`)
    group.add(cable)
    parts[`cable-${i}`] = cable
    const tag = makeTextPlane(`${i + 1}  ${cableNames[i]} CABLE`, 2.45, 0.52, '#141820', '#ffffff')
    tag.position.set(cable.position.x, 0.58, cable.position.z)
    addPick(tag, `cable-${i}`)
    group.add(tag)
    labels[`cable-${i}`] = tag
    extraTex.push(tag.userData.tex)
  }

  for (let i = 0; i < 2; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 1.15, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.55 })
    )
    box.position.set(-2.05 + i * 4.1, 0.78, 2.55)
    const lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.85, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.55 })
    )
    lever.position.set(0, 0.7, 0.2)
    box.add(lever)
    box.userData.lever = lever
    addPick(box, `breaker-${i}`)
    addPick(lever, `breaker-${i}`)
    group.add(box)
    parts[`breaker-${i}`] = box
    const tag = makeTextPlane(`${4 + i}  BREAKER`, 1.7, 0.48, '#2a2014', '#fff4d2')
    tag.position.set(box.position.x, 1.42, box.position.z)
    addPick(tag, `breaker-${i}`)
    group.add(tag)
    labels[`breaker-${i}`] = tag
    extraTex.push(tag.userData.tex)
  }

  const gen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.1, 1.35, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a4a3a, metalness: 0.35, roughness: 0.45 })
  )
  gen.position.set(0, 0.85, 0.95)
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.16, 14),
    new THREE.MeshStandardMaterial({
      color: 0x44aa66,
      emissive: 0x226644,
      emissiveIntensity: 0.7,
    })
  )
  btn.position.set(0, 0.74, 0)
  gen.add(btn)
  addPick(gen, 'generator')
  addPick(btn, 'generator')
  group.add(gen)
  parts.generator = gen
  const genTag = makeTextPlane('6  START PUMP', 2.4, 0.5, '#102818', '#b8ffd0')
  genTag.position.set(0, 1.62, 0.95)
  addPick(genTag, 'generator')
  group.add(genTag)
  labels.generator = genTag
  extraTex.push(genTag.userData.tex)

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
    if (id.startsWith('breaker')) halo.position.y = 1.48
    else if (id === 'generator') halo.position.y = 1.72
    else halo.position.y = 0.62
  }

  const paintPower = () => {
    const on = complete || powerOn
    wash.material.color.setHex(on ? 0x1cff7a : 0xff2a2a)
    wash.material.opacity = on ? 0.4 : 0.5
    beacon.material.color.setHex(on ? 0x44ff88 : 0xff3333)
    beaconGlow.color.setHex(on ? 0x44ff88 : 0xff3333)
    beaconGlow.intensity = on ? 5.2 : 2.4
    boardArt.draw(
      complete ? 'PUMPS ONLINE' : on ? 'GREEN — CLICK NOW' : 'RED — DO NOT CLICK',
      complete
        ? 'Walk to the Vodacom Building'
        : on
          ? `Next: ${STEP_LABELS[step] ?? 'DONE'}`
          : 'Wait for the floor to turn green',
      on
    )
    halo.visible = !complete
    if (!complete) haloAt(STEP_IDS[step])
    halo.material.color.setHex(on ? 0xffee55 : 0x662222)
  }

  const markDone = (id) => {
    const mesh = parts[id]
    if (!mesh) return
    if (id.startsWith('cable')) {
      mesh.material.color.setHex(mesh.userData.liveColor)
      mesh.material.emissive.setHex(mesh.userData.liveColor)
      mesh.material.emissiveIntensity = 0.45
    } else if (id.startsWith('breaker')) {
      mesh.userData.lever.rotation.z = -0.85
      mesh.material.color.setHex(0x2e7d32)
    } else {
      mesh.material.emissive.setHex(0x44ff88)
      mesh.material.emissiveIntensity = 0.85
    }
  }

  const applyHover = () => {
    for (const id of STEP_IDS) {
      const mesh = parts[id]
      if (!mesh?.material?.emissive) continue
      if (id.startsWith('cable') && step > STEP_IDS.indexOf(id)) continue
      if (id.startsWith('breaker') && step > STEP_IDS.indexOf(id)) continue
      if (id === 'generator' && complete) continue
      if (id.startsWith('cable') && step <= STEP_IDS.indexOf(id)) {
        mesh.material.emissive.setHex(hoverId === id ? 0x8899aa : 0x111318)
        mesh.material.emissiveIntensity = hoverId === id ? 0.55 : 0
      } else if (id.startsWith('breaker') && step <= STEP_IDS.indexOf(id)) {
        mesh.material.emissive.setHex(hoverId === id ? 0xffffff : 0x000000)
        mesh.material.emissiveIntensity = hoverId === id ? 0.35 : 0
      } else if (id === 'generator') {
        mesh.material.emissive.setHex(hoverId === id ? 0x88ffaa : 0x000000)
        mesh.material.emissiveIntensity = hoverId === id ? 0.45 : 0
      }
    }
  }

  paintPower()

  return {
    group,
    origin: { x: originX, z: originZ },
    inZone(px, pz) {
      return Math.hypot(px - originX, pz - originZ) < LOAD_REACH
    },
    isComplete: () => complete,
    isPowerOn: () => powerOn,
    stepIndex: () => step,
    stepCount: () => STEP_IDS.length,
    nextLabel: () => (complete ? 'Done' : STEP_LABELS[step] ?? ''),
    getPickables: () => pickables,
    setHover(obj) {
      hoverId = obj?.userData?.stepId ?? ''
      applyHover()
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
      applyHover()
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
      const span = powerOn ? POWER_ON : POWER_OFF
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
      for (let i = 0; i < 3; i++) {
        const c = parts[`cable-${i}`]
        c.material.color.setHex(0x1a1c22)
        c.material.emissive.setHex(0x111318)
        c.material.emissiveIntensity = 0
      }
      for (let i = 0; i < 2; i++) {
        const b = parts[`breaker-${i}`]
        b.material.color.setHex(0x5a4a32)
        b.material.emissive.setHex(0x000000)
        b.material.emissiveIntensity = 0
        b.userData.lever.rotation.z = 0
      }
      parts.generator.material.emissive.setHex(0x000000)
      parts.generator.material.emissiveIntensity = 0
      paintPower()
    },
    dispose() {
      parent.remove(group)
      disposeObject3D(group)
      for (const tex of extraTex) tex.dispose()
    },
  }
}
