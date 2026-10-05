// level5CablePuzzle.js — Node 2: 3×3 cable reconnection (no crossing).

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL5_ANCHORS } from './level5City.js'
import { playIncorrectBuzzer, playSequenceTone } from './gameAudio.js'

export const CABLE_REACH = 14
export const CABLE_WRONG_BATTERY = 10

const COLORS = [
  { id: 'red', hex: 0xe53935, tone: 0 },
  { id: 'blue', hex: 0x1e88e5, tone: 1 },
  { id: 'green', hex: 0x43a047, tone: 2 },
]

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Orthogonal edges on a 3×3 grid — straight segments never proper-cross. */
const GRID_EDGES = [
  [0, 1],
  [1, 2],
  [3, 4],
  [4, 5],
  [6, 7],
  [7, 8],
  [0, 3],
  [1, 4],
  [2, 5],
  [3, 6],
  [4, 7],
  [5, 8],
]

const FALLBACK_CABLES = [
  { color: 0, start: 0, end: 1, label: 'A' },
  { color: 0, start: 3, end: 4, label: 'B' },
  { color: 1, start: 1, end: 2, label: 'C' },
  { color: 1, start: 4, end: 5, label: 'D' },
  { color: 2, start: 6, end: 7, label: 'E' },
  { color: 2, start: 7, end: 8, label: 'F' },
]

function shuffle(list) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

function segmentsCross(a1, a2, b1, b2) {
  if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) return false
  const toXZ = (i) => ({ x: (i % 3) - 1, z: Math.floor(i / 3) - 1 })
  const A = toXZ(a1)
  const B = toXZ(a2)
  const C = toXZ(b1)
  const D = toXZ(b2)
  const cross = (o, p, q) => (p.x - o.x) * (q.z - o.z) - (p.z - o.z) * (q.x - o.x)
  const d1 = cross(A, B, C)
  const d2 = cross(A, B, D)
  const d3 = cross(C, D, A)
  const d4 = cross(C, D, B)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/**
 * Pick 6 grid edges (deg ≤ 2), assign 2× each colour + labels A–F.
 * @returns {{ color: number, start: number, end: number, label: string }[]}
 */
function generateCableLayout() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const deg = Array(9).fill(0)
    /** @type {[number, number][]} */
    const picked = []
    for (const [a, b] of shuffle(GRID_EDGES)) {
      if (picked.length >= 6) break
      if (deg[a] >= 2 || deg[b] >= 2) continue
      picked.push([a, b])
      deg[a] += 1
      deg[b] += 1
    }
    if (picked.length < 6) continue

    const colors = shuffle([0, 0, 1, 1, 2, 2])
    const labels = shuffle(LABELS)
    return picked.map(([start, end], i) => ({
      color: colors[i],
      start,
      end,
      label: labels[i],
    }))
  }
  return FALLBACK_CABLES.map((c) => ({ ...c }))
}

function makeLabelSprite(text, colorHex) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 128, 128)
  ctx.beginPath()
  ctx.arc(64, 64, 52, 0, Math.PI * 2)
  ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 72px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 70)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.85, 0.85, 0.85)
  sprite.renderOrder = 3
  sprite.userData.labelTex = tex
  return sprite
}

/**
 * @param {THREE.Object3D} parent
 * @param {number} originX
 * @param {number} originZ
 */
export function createLevel5CablePuzzle(
  parent,
  originX = LEVEL5_ANCHORS.node2_cable.x,
  originZ = LEVEL5_ANCHORS.node2_cable.z
) {
  const group = new THREE.Group()
  group.name = 'cable-puzzle'
  group.position.set(originX, 0, originZ)
  parent.add(group)

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.2, 11),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.85 })
  )
  deck.position.set(0, 0.12, 0)
  group.add(deck)

  /** @type {THREE.Mesh[]} */
  const nodes = []
  /** @type {THREE.MeshStandardMaterial[]} */
  const nodeMats = []
  const spacing = 2.6

  for (let i = 0; i < 9; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x445566,
      emissive: 0x000000,
      roughness: 0.4,
    })
    const node = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 16), mat)
    node.position.set((col - 1) * spacing, 0.4, (row - 1) * spacing)
    node.userData.nodeIndex = i
    node.castShadow = true
    group.add(node)
    nodes.push(node)
    nodeMats.push(mat)
  }

  const decor = new THREE.Group()
  decor.name = 'cable-decor'
  group.add(decor)

  /** @type {{ color: number, start: number, end: number, label: string }[]} */
  let cables = generateCableLayout()

  const rebuildDecor = () => {
    while (decor.children.length) {
      const child = decor.children[0]
      decor.remove(child)
      if (child.userData?.labelTex) child.userData.labelTex.dispose()
      if (child.material?.map) child.material.map.dispose()
      child.material?.dispose?.()
      child.geometry?.dispose?.()
    }

    const labelCounts = Array(9).fill(0)
    for (const cable of cables) {
      const hex = COLORS[cable.color].hex
      const startRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.09, 8, 24),
        new THREE.MeshBasicMaterial({ color: hex })
      )
      startRing.rotation.x = Math.PI / 2
      startRing.position.copy(nodes[cable.start].position)
      startRing.position.y = 0.72
      decor.add(startRing)

      const endRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.09, 8, 24),
        new THREE.MeshBasicMaterial({ color: hex })
      )
      endRing.rotation.x = Math.PI / 2
      endRing.position.copy(nodes[cable.end].position)
      endRing.position.y = 0.66
      decor.add(endRing)

      const startLabel = makeLabelSprite(cable.label, hex)
      startLabel.position.copy(nodes[cable.start].position)
      startLabel.position.y = 1.15
      startLabel.position.x += labelCounts[cable.start] * 0.35
      labelCounts[cable.start] += 1
      startLabel.userData.nodeIndex = cable.start
      decor.add(startLabel)

      const endLabel = makeLabelSprite(cable.label, hex)
      endLabel.position.copy(nodes[cable.end].position)
      endLabel.position.y = 1.15
      endLabel.position.x += labelCounts[cable.end] * 0.35
      labelCounts[cable.end] += 1
      endLabel.userData.nodeIndex = cable.end
      decor.add(endLabel)
    }
  }

  rebuildDecor()

  /** @type {{ a: number, b: number, color: number, line: THREE.Mesh }[]} */
  const placed = []
  let selectedStart = -1
  let complete = false
  let hoverIndex = -1
  let active = false

  const cableGroup = new THREE.Group()
  group.add(cableGroup)

  const clearPlaced = () => {
    for (const p of placed) {
      cableGroup.remove(p.line)
      p.line.geometry.dispose()
      p.line.material.dispose()
    }
    placed.length = 0
  }

  const syncNodeVisuals = () => {
    for (let i = 0; i < 9; i++) {
      nodeMats[i].emissive.setHex(0x000000)
      nodeMats[i].emissiveIntensity = 0
      nodeMats[i].color.setHex(0x445566)
    }
    if (selectedStart >= 0) {
      nodeMats[selectedStart].emissive.setHex(0xffaa44)
      nodeMats[selectedStart].emissiveIntensity = 0.7
    }
    if (hoverIndex >= 0) {
      nodeMats[hoverIndex].emissiveIntensity = Math.max(
        nodeMats[hoverIndex].emissiveIntensity,
        0.45
      )
      nodeMats[hoverIndex].emissive.setHex(0x88ccff)
    }
  }

  const makeCableMesh = (a, b, colorHex) => {
    const pa = nodes[a].position
    const pb = nodes[b].position
    const mid = new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5)
    mid.y = 0.55
    const len = Math.max(0.01, pa.distanceTo(pb))
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, len, 8),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.35,
      })
    )
    mesh.position.copy(mid)
    const dir = new THREE.Vector3(pb.x - pa.x, 0, pb.z - pa.z)
    if (dir.lengthSq() > 1e-8) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    }
    return mesh
  }

  const findMatchingCable = (a, b) =>
    cables.find(
      (c) =>
        (c.start === a && c.end === b) || (c.start === b && c.end === a)
    )

  const alreadyConnected = (a, b) =>
    placed.some(
      (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)
    )

  const reshuffleLayout = () => {
    cables = generateCableLayout()
    rebuildDecor()
  }

  return {
    origin: { x: originX, z: originZ },
    inZone(px, pz) {
      return Math.hypot(px - originX, pz - originZ) < CABLE_REACH
    },
    begin() {
      active = true
      // New random layout only when starting fresh (not when returning mid-solve).
      if (!complete && placed.length === 0) {
        selectedStart = -1
        reshuffleLayout()
        syncNodeVisuals()
      }
    },
    update() {
      return null
    },
    isComplete() {
      return complete
    },
    getPlacedCount() {
      return placed.length
    },
    getNeededCount() {
      return cables.length
    },
    getPickables() {
      return nodes
    },
    setHover(obj) {
      hoverIndex = obj?.userData?.nodeIndex ?? -1
      syncNodeVisuals()
    },
    tryClickObject(obj) {
      if (complete || !active) return null
      const idx = obj?.userData?.nodeIndex
      if (typeof idx !== 'number') return null

      if (selectedStart < 0) {
        selectedStart = idx
        syncNodeVisuals()
        return 'select'
      }

      if (selectedStart === idx) {
        selectedStart = -1
        syncNodeVisuals()
        return 'deselect'
      }

      const a = selectedStart
      const b = idx
      selectedStart = -1

      if (alreadyConnected(a, b)) {
        syncNodeVisuals()
        return 'busy'
      }

      const match = findMatchingCable(a, b)
      if (!match) {
        playIncorrectBuzzer()
        syncNodeVisuals()
        return 'wrong'
      }

      for (const p of placed) {
        if (segmentsCross(a, b, p.a, p.b)) {
          playIncorrectBuzzer()
          syncNodeVisuals()
          return 'cross'
        }
      }

      const line = makeCableMesh(a, b, COLORS[match.color].hex)
      cableGroup.add(line)
      placed.push({ a, b, color: match.color, line })
      playSequenceTone(COLORS[match.color].tone)
      syncNodeVisuals()

      if (placed.length >= cables.length) {
        complete = true
        return 'solved'
      }
      return 'ok'
    },
    reset() {
      complete = false
      active = false
      selectedStart = -1
      clearPlaced()
      reshuffleLayout()
      syncNodeVisuals()
    },
    dispose() {
      parent.remove(group)
      disposeObject3D(group)
    },
  }
}
