// level5CircuitPuzzle.js — Node 1: 4×3 circuit breaker sequence.

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL5_ANCHORS } from './level5City.js'

export const CIRCUIT_REACH = 14
export const CIRCUIT_TIMER = 90
export const CIRCUIT_FAIL_BATTERY = 14
export const CIRCUIT_COLS = 4
export const CIRCUIT_ROWS = 3

function makeSchematicTexture(targetOn) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 384
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#e8dcc8'
  ctx.fillRect(0, 0, 512, 384)
  ctx.fillStyle = '#1a1a22'
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('BREAKER MANUAL — ON POSITIONS', 256, 36)
  ctx.font = '18px monospace'
  ctx.fillText('(match this pattern)', 256, 62)

  const cellW = 100
  const cellH = 70
  const ox = 56
  const oy = 100
  for (let r = 0; r < CIRCUIT_ROWS; r++) {
    for (let cIdx = 0; cIdx < CIRCUIT_COLS; cIdx++) {
      const i = r * CIRCUIT_COLS + cIdx
      const x = ox + cIdx * cellW
      const y = oy + r * cellH
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, 80, 55)
      ctx.fillStyle = targetOn[i] ? '#1a8a44' : '#555'
      ctx.fillRect(x + 10, y + 10, 60, 35)
      ctx.fillStyle = '#111'
      ctx.font = 'bold 16px monospace'
      ctx.fillText(targetOn[i] ? 'ON' : 'OFF', x + 40, y + 33)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * @param {THREE.Object3D} parent
 * @param {number} originX
 * @param {number} originZ
 */
export function createLevel5CircuitPuzzle(
  parent,
  originX = LEVEL5_ANCHORS.node1_circuit.x,
  originZ = LEVEL5_ANCHORS.node1_circuit.z
) {
  const group = new THREE.Group()
  group.name = 'circuit-puzzle'
  group.position.set(originX, 0, originZ)
  parent.add(group)

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1c24, roughness: 0.85 })
  )
  deck.position.set(0, 0.12, 2)
  group.add(deck)

  /** @type {boolean[]} */
  let targetOn = []
  /** @type {boolean[]} */
  let stateOn = []
  /** @type {THREE.Mesh[]} */
  const breakers = []
  /** @type {THREE.MeshStandardMaterial[]} */
  const breakerMats = []

  const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.6 })
  const panel = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.15, 7.5), panelMat)
  panel.position.set(0, 0.35, 1.8)
  group.add(panel)

  let schematicTex = makeSchematicTexture(Array(12).fill(false))
  // Flat on the deck so the top-down puzzle cam can read it (was a vertical wall).
  const schematic = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 4.2),
    new THREE.MeshBasicMaterial({ map: schematicTex, side: THREE.DoubleSide })
  )
  schematic.position.set(0, 0.55, -6.2)
  schematic.rotation.x = -Math.PI / 2
  schematic.name = 'circuit-schematic'
  group.add(schematic)

  for (let r = 0; r < CIRCUIT_ROWS; r++) {
    for (let c = 0; c < CIRCUIT_COLS; c++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x333340,
        emissive: 0x000000,
        roughness: 0.45,
      })
      const lever = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.4), mat)
      lever.position.set(-3.6 + c * 2.4, 1.4, 0.2 + r * 2.0)
      lever.userData.breakerIndex = r * CIRCUIT_COLS + c
      lever.castShadow = true
      group.add(lever)
      breakers.push(lever)
      breakerMats.push(mat)
    }
  }

  let complete = false
  let running = false
  let timer = CIRCUIT_TIMER
  let hoverIndex = -1

  const generateTarget = () => {
    const indices = Array.from({ length: 12 }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    targetOn = Array(12).fill(false)
    for (let i = 0; i < 7; i++) targetOn[indices[i]] = true
    stateOn = Array(12).fill(false)
    schematicTex.dispose()
    schematicTex = makeSchematicTexture(targetOn)
    schematic.material.map = schematicTex
    schematic.material.needsUpdate = true
    syncVisuals()
  }

  const syncVisuals = () => {
    for (let i = 0; i < 12; i++) {
      const on = stateOn[i]
      breakerMats[i].color.setHex(on ? 0x44ff88 : 0x333340)
      breakerMats[i].emissive.setHex(on ? 0x118844 : 0x000000)
      breakerMats[i].emissiveIntensity = on ? 0.35 : 0
      breakers[i].rotation.x = on ? 0.35 : -0.35
      if (i === hoverIndex) {
        breakerMats[i].emissiveIntensity = Math.max(breakerMats[i].emissiveIntensity, 0.55)
      }
    }
  }

  const matchesTarget = () => targetOn.every((v, i) => v === stateOn[i])

  const scramble = () => {
    for (let i = 0; i < 12; i++) stateOn[i] = Math.random() < 0.45
    timer = CIRCUIT_TIMER
    syncVisuals()
  }

  generateTarget()

  return {
    origin: { x: originX, z: originZ },
    inZone(px, pz) {
      return Math.hypot(px - originX, pz - originZ) < CIRCUIT_REACH
    },
    beginIfNeeded() {
      if (complete || running) return
      running = true
      if (targetOn.length === 0) generateTarget()
    },
    update(dt) {
      if (!running || complete) return null
      timer -= dt
      if (timer <= 0) {
        scramble()
        return 'fail'
      }
      return null
    },
    getTimer() {
      return Math.max(0, timer)
    },
    isComplete() {
      return complete
    },
    isRunning() {
      return running
    },
    getPickables() {
      return breakers
    },
    setHover(obj) {
      hoverIndex = obj?.userData?.breakerIndex ?? -1
      syncVisuals()
    },
    tryToggleIndex(index) {
      if (complete || !running) return null
      if (index < 0 || index >= 12) return null
      stateOn[index] = !stateOn[index]
      syncVisuals()
      if (matchesTarget()) {
        complete = true
        running = false
        return 'solved'
      }
      return 'toggled'
    },
    tryToggleObject(obj) {
      const idx = obj?.userData?.breakerIndex
      if (typeof idx !== 'number') return null
      return this.tryToggleIndex(idx)
    },
    pause() {
      running = false
    },
    reset() {
      complete = false
      running = false
      timer = CIRCUIT_TIMER
      generateTarget()
    },
    dispose() {
      schematicTex.dispose()
      parent.remove(group)
      disposeObject3D(group)
    },
  }
}
