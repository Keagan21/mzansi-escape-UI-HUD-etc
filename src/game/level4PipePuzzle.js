// level4PipePuzzle.js — De Waal Drive rotating pipe-tile puzzle.

import * as THREE from 'three'
import { disposeObject3D } from './threeDispose.js'
import { LEVEL4_ANCHORS } from './level4City.js'

export const PIPE_COLS = 8
export const PIPE_ROWS = 8
export const PIPE_TIMER = 100
export const PIPE_FAIL_THIRST = 12
export const PIPE_REACH = 2.2
export const TILE_SIZE = 1.32
const PAIR_COUNT = 3
const PAIR_COLORS = [0xc62828, 0xf9a825, 0x1565c0]
const FALLBACK_PAIRS = [
  { start: { col: 0, row: 1 }, end: { col: 7, row: 1 } },
  { start: { col: 0, row: 3 }, end: { col: 7, row: 4 } },
  { start: { col: 0, row: 6 }, end: { col: 7, row: 6 } },
]

const N = 1
const E = 2
const S = 4
const W = 8

/** @typedef {'I' | 'L' | 'T'} PipeKind */

/** @param {number} mask @param {number} rot */
function rotateMask(mask, rot) {
  let m = mask & 15
  const r = ((rot % 4) + 4) % 4
  for (let i = 0; i < r; i++) {
    m = ((m << 1) | (m >> 3)) & 15
  }
  return m
}

function baseMask(kind) {
  if (kind === 'I') return N | S
  if (kind === 'T') return N | E | W
  return N | E
}

/**
 * @typedef {{
 *   kind: PipeKind
 *   rot: number
 *   mesh: THREE.Group
 *   pipes: THREE.Mesh[]
 * }} PipeTile
 */

function tileOpenings(tile) {
  return rotateMask(baseMask(tile.kind), tile.rot)
}

function opposite(bit) {
  if (bit === N) return S
  if (bit === S) return N
  if (bit === E) return W
  return E
}

function neighbor(col, row, bit) {
  if (bit === N) return { col, row: row - 1 }
  if (bit === S) return { col, row: row + 1 }
  if (bit === E) return { col: col + 1, row }
  return { col: col - 1, row }
}

function rebuildPipeVisual(tile) {
  const mask = tileOpenings(tile)
  const dirs = [
    { bit: N, rot: 0 },
    { bit: E, rot: -Math.PI / 2 },
    { bit: S, rot: Math.PI },
    { bit: W, rot: Math.PI / 2 },
  ]
  for (let i = 0; i < 4; i++) {
    tile.pipes[i].visible = (mask & dirs[i].bit) !== 0
    tile.pipes[i].rotation.z = dirs[i].rot
  }
}

function pairReaches(tiles, start, end) {
  const startTile = tiles[start.row]?.[start.col]
  const endTile = tiles[end.row]?.[end.col]
  if (!startTile || !endTile) return false
  if ((tileOpenings(startTile) & W) === 0) return false
  if ((tileOpenings(endTile) & E) === 0) return false

  const seen = new Set()
  const stack = [{ col: start.col, row: start.row }]
  while (stack.length) {
    const cur = stack.pop()
    const key = `${cur.col},${cur.row}`
    if (seen.has(key)) continue
    seen.add(key)
    const tile = tiles[cur.row]?.[cur.col]
    if (!tile) continue
    const mask = tileOpenings(tile)
    if (cur.col === end.col && cur.row === end.row) return true
    for (const bit of [N, E, S, W]) {
      if ((mask & bit) === 0) continue
      const n = neighbor(cur.col, cur.row, bit)
      if (n.col < 0 || n.row < 0 || n.col >= PIPE_COLS || n.row >= PIPE_ROWS) continue
      const other = tiles[n.row][n.col]
      if ((tileOpenings(other) & opposite(bit)) === 0) continue
      stack.push(n)
    }
  }
  return false
}

function isSolved(tiles, pairs) {
  return pairs.every((pair) => pairReaches(tiles, pair.start, pair.end))
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const tmp = list[i]
    list[i] = list[j]
    list[j] = tmp
  }
  return list
}

function pickUniqueRows(count) {
  const pool = Array.from({ length: PIPE_ROWS }, (_, i) => i)
  shuffleInPlace(pool)
  return pool.slice(0, count)
}

function randomPairs() {
  const starts = pickUniqueRows(PAIR_COUNT)
  const ends = pickUniqueRows(PAIR_COUNT)
  return starts.map((row, i) => ({
    start: { col: 0, row },
    end: { col: PIPE_COLS - 1, row: ends[i] },
  }))
}

function cellKey(col, row) {
  return `${col},${row}`
}

function neighborsOf(col, row) {
  return [
    { col, row: row - 1 },
    { col: col + 1, row },
    { col, row: row + 1 },
    { col: col - 1, row },
  ].filter((n) => n.col >= 0 && n.row >= 0 && n.col < PIPE_COLS && n.row < PIPE_ROWS)
}

/** Shuffled BFS so each run takes a different shortest-ish route. */
function findPath(start, end, blocked) {
  const startK = cellKey(start.col, start.row)
  const q = [{ col: start.col, row: start.row }]
  const prev = new Map()
  const seen = new Set([startK])
  while (q.length) {
    const cur = q.shift()
    if (cur.col === end.col && cur.row === end.row) {
      const path = [cur]
      let k = cellKey(cur.col, cur.row)
      while (k !== startK) {
        const p = prev.get(k)
        path.push(p)
        k = cellKey(p.col, p.row)
      }
      path.reverse()
      return path
    }
    const neigh = shuffleInPlace(neighborsOf(cur.col, cur.row))
    for (const n of neigh) {
      const k = cellKey(n.col, n.row)
      if (seen.has(k) || blocked.has(k)) continue
      seen.add(k)
      prev.set(k, cur)
      q.push(n)
    }
  }
  return null
}

function kindRotFromMask(mask) {
  const m = mask & 15
  for (let rot = 0; rot < 4; rot++) {
    if (rotateMask(baseMask('I'), rot) === m) return { kind: 'I', rot }
    if (rotateMask(baseMask('L'), rot) === m) return { kind: 'L', rot }
    if (rotateMask(baseMask('T'), rot) === m) return { kind: 'T', rot }
  }
  return { kind: 'L', rot: 0 }
}

function masksAlongPath(path) {
  const masks = path.map(() => 0)
  masks[0] |= W
  masks[path.length - 1] |= E
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const dcol = b.col - a.col
    const drow = b.row - a.row
    if (dcol === 1) {
      masks[i] |= E
      masks[i + 1] |= W
    } else if (dcol === -1) {
      masks[i] |= W
      masks[i + 1] |= E
    } else if (drow === 1) {
      masks[i] |= S
      masks[i + 1] |= N
    } else if (drow === -1) {
      masks[i] |= N
      masks[i + 1] |= S
    }
  }
  return masks
}

function fillDecoys(layout, reserved) {
  const kinds = /** @type {PipeKind[]} */ (['I', 'L', 'T'])
  for (let r = 0; r < PIPE_ROWS; r++) {
    for (let c = 0; c < PIPE_COLS; c++) {
      if (reserved.has(cellKey(c, r))) continue
      layout[r][c] = {
        kind: kinds[(Math.random() * kinds.length) | 0],
        rot: (Math.random() * 4) | 0,
      }
    }
  }
}

function makeSolvedLayout(pairs) {
  /** @type {{ kind: PipeKind, rot: number }[][]} */
  const layout = []
  for (let r = 0; r < PIPE_ROWS; r++) {
    layout[r] = []
    for (let c = 0; c < PIPE_COLS; c++) {
      layout[r][c] = { kind: 'L', rot: 0 }
    }
  }
  const occupied = new Set()
  for (const pair of pairs) {
    const path = findPath(pair.start, pair.end, occupied)
    if (!path) return null
    const masks = masksAlongPath(path)
    for (let i = 0; i < path.length; i++) {
      const cell = path[i]
      occupied.add(cellKey(cell.col, cell.row))
      layout[cell.row][cell.col] = kindRotFromMask(masks[i])
    }
  }
  fillDecoys(layout, occupied)
  return layout
}

function generateRandomBoard() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const pairs = randomPairs()
    const layout = makeSolvedLayout(pairs)
    if (layout && isSolved(layout, pairs)) return { layout, pairs }
  }
  const pairs = FALLBACK_PAIRS.map((p) => ({
    start: { ...p.start },
    end: { ...p.end },
  }))
  return { layout: makeSolvedLayout(pairs) ?? makeSolvedLayout(FALLBACK_PAIRS), pairs }
}

function scrambleFromSolved(layout, pairs) {
  const solved = layout.map((row) => row.map((cell) => ({ ...cell })))
  for (let attempt = 0; attempt < 48; attempt++) {
    for (let r = 0; r < PIPE_ROWS; r++) {
      for (let c = 0; c < PIPE_COLS; c++) {
        layout[r][c].kind = solved[r][c].kind
        layout[r][c].rot = (solved[r][c].rot + 1 + ((Math.random() * 3) | 0)) % 4
      }
    }
    if (!isSolved(layout, pairs)) return
  }
}

/**
 * @param {THREE.Group} parent
 * @param {number} originX
 * @param {number} originZ
 */
export function createLevel4PipePuzzle(parent, originX = LEVEL4_ANCHORS.deWaal.x, originZ = LEVEL4_ANCHORS.deWaal.z) {
  const group = new THREE.Group()
  group.name = 'pipe-puzzle'
  group.position.set(originX, 0, originZ)
  parent.add(group)

  const padMat = new THREE.MeshStandardMaterial({
    color: 0x3a4550,
    roughness: 0.7,
    emissive: 0x000000,
  })
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0xb8c4cc,
    roughness: 0.35,
    metalness: 0.55,
  })
  const liveMat = new THREE.MeshStandardMaterial({
    color: 0x4ec4e8,
    roughness: 0.25,
    metalness: 0.4,
  })

  const sourceGeo = new THREE.CylinderGeometry(0.32, 0.36, 1.15, 12)
  const pairMarkers = PAIR_COLORS.map((color) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.4,
      roughness: 0.4,
    })
    const source = new THREE.Mesh(sourceGeo, mat)
    const sink = new THREE.Mesh(sourceGeo, mat)
    group.add(source, sink)
    return { source, sink }
  })

  const cellWorld = (col, row) => ({
    x: (col - (PIPE_COLS - 1) / 2) * TILE_SIZE,
    z: (row - (PIPE_ROWS - 1) / 2) * TILE_SIZE,
  })

  const syncPairMarkers = (nextPairs) => {
    for (let i = 0; i < pairMarkers.length; i++) {
      const pair = nextPairs[i]
      const s = cellWorld(pair.start.col, pair.start.row)
      const e = cellWorld(pair.end.col, pair.end.row)
      pairMarkers[i].source.position.set(s.x - 1.45, 0.58, s.z)
      pairMarkers[i].sink.position.set(e.x + 1.45, 0.58, e.z)
    }
  }

  /** @type {PipeTile[][]} */
  const tiles = []
  let { layout, pairs } = generateRandomBoard()
  scrambleFromSolved(layout, pairs)
  syncPairMarkers(pairs)

  const pipeGeo = new THREE.CylinderGeometry(0.16, 0.16, TILE_SIZE * 0.52, 8)
  pipeGeo.translate(0, TILE_SIZE * 0.26, 0)

  for (let r = 0; r < PIPE_ROWS; r++) {
    tiles[r] = []
    for (let c = 0; c < PIPE_COLS; c++) {
      const mesh = new THREE.Group()
      const x = (c - (PIPE_COLS - 1) / 2) * TILE_SIZE
      const z = (r - (PIPE_ROWS - 1) / 2) * TILE_SIZE
      mesh.position.set(x, 0, z)
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.16, TILE_SIZE * 0.92),
        padMat.clone()
      )
      pad.position.y = 0.08
      pad.receiveShadow = true
      pad.name = `pipe-pad-${r}-${c}`
      mesh.add(pad)
      /** @type {THREE.Mesh[]} */
      const pipes = []
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(pipeGeo, pipeMat)
        p.position.y = 0.28
        p.rotation.x = -Math.PI / 2
        mesh.add(p)
        pipes.push(p)
      }
      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        pipeMat
      )
      hub.position.y = 0.32
      mesh.add(hub)
      group.add(mesh)
      const tile = {
        kind: layout[r][c].kind,
        rot: layout[r][c].rot,
        mesh,
        pipes,
        pad,
        col: c,
        row: r,
      }
      pad.userData.pipeTile = tile
      rebuildPipeVisual(tile)
      tiles[r][c] = tile
    }
  }

  let timer = PIPE_TIMER
  let running = false
  let complete = false
  let failFlash = 0

  const nearestTile = (px, pz) => {
    const lx = px - originX
    const lz = pz - originZ
    let best = null
    let bestD = PIPE_REACH
    for (let r = 0; r < PIPE_ROWS; r++) {
      for (let c = 0; c < PIPE_COLS; c++) {
        const tile = tiles[r][c]
        const d = Math.hypot(lx - tile.mesh.position.x, lz - tile.mesh.position.z)
        if (d < bestD) {
          bestD = d
          best = { r, c, tile, dist: d }
        }
      }
    }
    return best
  }

  const rotateTile = (tile) => {
    if (!tile || complete) return false
    running = true
    tile.rot = (tile.rot + 1) % 4
    rebuildPipeVisual(tile)
    if (isSolved(tiles, pairs)) {
      complete = true
      running = false
      paintSolved(true)
      return 'solved'
    }
    return 'rotated'
  }

  let hoverTile = null
  const setHover = (tile) => {
    if (hoverTile && hoverTile !== tile && hoverTile.pad?.material) {
      hoverTile.pad.material.emissive.setHex(0x000000)
    }
    hoverTile = tile
    if (tile?.pad?.material && !complete) {
      tile.pad.material.emissive.setHex(0x1a6a88)
      tile.pad.material.emissiveIntensity = 0.55
    }
  }

  const paintSolved = (on) => {
    const mat = on ? liveMat : pipeMat
    for (const row of tiles) {
      for (const tile of row) {
        for (const p of tile.pipes) p.material = mat
        if (tile.pad?.material?.emissive) {
          tile.pad.material.emissive.setHex(on ? 0x0a3040 : 0x000000)
        }
      }
    }
  }

  const resetScramble = () => {
    const next = generateRandomBoard()
    pairs = next.pairs
    const solved = next.layout
    syncPairMarkers(pairs)
    for (let r = 0; r < PIPE_ROWS; r++) {
      for (let c = 0; c < PIPE_COLS; c++) {
        tiles[r][c].kind = solved[r][c].kind
        tiles[r][c].rot = solved[r][c].rot
      }
    }
    scrambleFromSolved(tiles, pairs)
    for (const row of tiles) {
      for (const tile of row) rebuildPipeVisual(tile)
    }
    timer = PIPE_TIMER
    running = false
    complete = false
    paintSolved(false)
  }

  return {
    group,
    getTimer: () => timer,
    isComplete: () => complete,
    isRunning: () => running,
    inZone(px, pz) {
      return Math.hypot(px - originX, pz - originZ) < TILE_SIZE * 7.2
    },
    nearestDist(px, pz) {
      const n = nearestTile(px, pz)
      return n ? n.dist : Infinity
    },
    beginIfNeeded(px, pz) {
      if (complete || running) return
      if (Math.hypot(px - originX, pz - originZ) < TILE_SIZE * 7.2) running = true
    },
    origin: { x: originX, z: originZ },
    getPickables() {
      return tiles.flatMap((row) => row.map((t) => t.pad))
    },
    setHover,
    tryRotateTile(tile) {
      return rotateTile(tile)
    },
    tryRotate(px, pz) {
      const hit = nearestTile(px, pz)
      if (!hit) return false
      return rotateTile(hit.tile)
    },
    pause() {
      running = false
    },
    /**
     * @param {number} dt
     * @returns {'ok' | 'fail' | 'idle'}
     */
    update(dt) {
      failFlash = Math.max(0, failFlash - dt)
      if (complete || !running) return 'idle'
      timer -= dt
      if (timer <= 0) {
        resetScramble()
        failFlash = 0.5
        return 'fail'
      }
      return 'ok'
    },
    reset() {
      resetScramble()
    },
    dispose() {
      parent.remove(group)
      disposeObject3D(group)
      pipeGeo.dispose()
      sourceGeo.dispose()
    },
  }
}
