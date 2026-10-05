// level4Session.js — Open-world Level 4: thirst, bottles, De Waal pipe puzzle.

import * as THREE from 'three'
import {
  BLOCK,
  STREET_W,
  buildCapeTownCity,
  LEVEL4_ANCHORS,
  LEVEL4_WORLD_BOUND,
} from './level4City.js'
import {
  buildBillboards,
  LEVEL4_BILLBOARD_ADS,
  spotsFromPlan,
} from './level3Billboards.js'
import {
  buildLevel4BottleData,
  collectLevel4BottlesNearPlayer,
  createLevel4BottleMeshes,
  disposeLevel4BottleMeshes,
  LEVEL4_BOTTLE_REFILL,
  resetLevel4Bottles,
  updateLevel4BottleMeshes,
} from './level4Bottles.js'
import {
  buildLevel4CoinData,
  collectLevel4CoinsNearPlayer,
  createLevel4CoinMeshes,
  disposeCoinMeshes,
  resetLevel4Coins,
  updateCollectibleInstances,
} from './level4Coins.js'
import { createLevel4PipePuzzle, PIPE_FAIL_THIRST } from './level4PipePuzzle.js'
import { createLevel4ValvePuzzle, VALVE_WRONG_THIRST } from './level4ValvePuzzle.js'
import { createLevel4LoadPuzzle, LOAD_SHOCK_THIRST } from './level4LoadPuzzle.js'
import { createTableMountainHorizon } from './level4Landmarks.js'
import { preloadPowerStation } from './level4PowerStationAssets.js'
import { preloadVodacomBuilding, VODACOM_WIN_REACH } from './level4VodacomAssets.js'
import { playCoinPickup, playLevelComplete } from './gameAudio.js'
import { sanitizeStoredBest, submitBestScore } from './scores.js'
import { levelHighScoreKey } from './storageKeys.js'
import { LOW_SPEC_RENDERING, OPEN_WORLD_SHADOW_EXTENT } from './gameConstants.js'
import { createNavArrow } from './navArrow.js'
import { resolveForwardAxis } from './movementInput.js'

export const LEVEL4_MAX_THIRST = 100
export const LEVEL4_PLAYER_HEIGHT = 1.7
export const LEVEL4_MOVE_SPEED = 16
export const LEVEL4_SPRINT_MULT = 1.65
export const LEVEL4_THIRST_WALK = 0.35
export const LEVEL4_THIRST_SPRINT = 0.55

const PLAYER_START = {
  x: LEVEL4_ANCHORS.spawn.x,
  y: LEVEL4_PLAYER_HEIGHT,
  z: LEVEL4_ANCHORS.spawn.z,
}

/**
 * @param {{
 *   scene: THREE.Scene
 *   camera: THREE.PerspectiveCamera
 *   renderer: THREE.WebGLRenderer
 *   container: HTMLElement
 *   setHud: (fn: (h: object) => object) => void
 *   clearPausedRef: { current?: () => void }
 *   highScoreRef: { current: number }
 *   recordBaselineRef: { current: number }
 *   newRecordToastShownRef: { current: boolean }
 *   setNewRecordToast: (v: boolean) => void
 *   currentLevelRef: { current: number }
 *   gameState: { over: boolean, won: boolean }
 *   creditWalletRef?: { current?: (n: number) => void }
 *   autoForwardRef?: { current: boolean }
 * }} deps
 */
export function createLevel4Session(deps) {
  const {
    scene,
    camera,
    renderer,
    container,
    setHud,
    clearPausedRef,
    highScoreRef,
    recordBaselineRef,
    newRecordToastShownRef,
    setNewRecordToast,
    currentLevelRef,
    gameState,
    creditWalletRef,
    autoForwardRef,
  } = deps

  void renderer

  void preloadPowerStation()
  void preloadVodacomBuilding()
  const city = buildCapeTownCity(scene)
  const billboards = buildBillboards(
    city.group,
    spotsFromPlan(BLOCK, STREET_W, [
      ['ns', 0, 0, 1],
      ['ns', 0, -1, -1],
      ['ew', 2, 0, 1],
      ['ns', 2, -2, 1],
      ['ew', -1, 2, -1],
      ['ns', -2, -2, -1],
      ['ew', -3, -2, 1],
      ['ns', 3, -3, -1],
      ['ew', -4, 2, 1],
      ['ns', -4, 1, 1],
      ['ew', 2, -3, -1],
      ['ns', 1, 1, -1],
      ['ew', 0, -2, 1],
      ['ns', -1, -4, 1],
    ]),
    LEVEL4_BILLBOARD_ADS
  )
  city.colliders.push(...billboards.colliders)
  const bottleData = buildLevel4BottleData()
  const bottleMeshes = createLevel4BottleMeshes(bottleData)
  city.group.add(bottleMeshes.group)
  const coinData = buildLevel4CoinData(bottleData)
  const coinMeshes = createLevel4CoinMeshes(coinData, new THREE.TextureLoader())
  city.group.add(coinMeshes.group)
  const navArrow = createNavArrow(city.group, { color: 0x7ee0ff })
  const pipes = createLevel4PipePuzzle(
    city.group,
    LEVEL4_ANCHORS.deWaal.x,
    LEVEL4_ANCHORS.deWaal.z
  )
  const valves = createLevel4ValvePuzzle(
    city.group,
    LEVEL4_ANCHORS.newlands.x,
    LEVEL4_ANCHORS.newlands.z
  )
  const loadShed = createLevel4LoadPuzzle(
    city.group,
    LEVEL4_ANCHORS.steenbras.x,
    LEVEL4_ANCHORS.steenbras.z
  )
  const tableMountain = createTableMountainHorizon(scene)

  const sun = new THREE.DirectionalLight(0xffe0b0, 2.6)
  sun.castShadow = true
  const shadowMapSize = LOW_SPEC_RENDERING ? 512 : 1024
  const shadowExtent = OPEN_WORLD_SHADOW_EXTENT
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize)
  sun.shadow.camera.left = -shadowExtent
  sun.shadow.camera.right = shadowExtent
  sun.shadow.camera.top = shadowExtent
  sun.shadow.camera.bottom = -shadowExtent
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 500
  sun.shadow.bias = -0.0003
  sun.position.set(PLAYER_START.x - 80, 180, PLAYER_START.z - 50)
  sun.target.position.set(PLAYER_START.x, 0, PLAYER_START.z)
  const ambient = new THREE.AmbientLight(0xcbb896, 0.5)
  const hemi = new THREE.HemisphereLight(0xffe6c0, 0x6a5438, 0.7)
  sun.visible = false
  ambient.visible = false
  hemi.visible = false
  scene.add(sun)
  scene.add(sun.target)
  scene.add(ambient)
  scene.add(hemi)

  let active = false
  const pos = { ...PLAYER_START }
  let yaw = 0
  let pitch = 0
  let characterYaw = 0
  let thirst = LEVEL4_MAX_THIRST
  let bottles = 0
  let runElapsedMs = 0
  let gameOver = false
  let won = false
  let pointerLocked = false
  let pipeFixed = false
  let newlandsFixed = false
  let steenbrasFixed = false
  let interactLock = false
  /** @type {false | 'pipe' | 'valves' | 'load'} */
  let puzzleView = false

  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()

  const keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
  }

  const applyCapeLook = () => {
    scene.fog = new THREE.FogExp2(0xc9a06a, 0.0028)
    scene.background = new THREE.Color(0xe8c48a)
  }

  const resolvePlayerCollision = (x, z, radius = 0.45) => {
    let nx = x
    let nz = z
    for (const c of city.colliders) {
      if (c.active === false) continue
      const dx = nx - c.x
      const dz = nz - c.z
      const ox = c.hw + radius - Math.abs(dx)
      const oz = c.hd + radius - Math.abs(dz)
      if (ox > 0 && oz > 0) {
        if (ox < oz) nx += dx > 0 ? ox : -ox
        else nz += dz > 0 ? oz : -oz
      }
    }
    nx = Math.max(-LEVEL4_WORLD_BOUND, Math.min(LEVEL4_WORLD_BOUND, nx))
    nz = Math.max(-LEVEL4_WORLD_BOUND, Math.min(LEVEL4_WORLD_BOUND, nz))
    return { x: nx, z: nz }
  }

  const dieOfThirst = () => {
    gameOver = true
    gameState.over = true
    clearPausedRef.current?.()
    setHud((h) => ({ ...h, gameOver: true, thirst: 0, maxThirst: LEVEL4_MAX_THIRST }))
    if (document.pointerLockElement === container) {
      document.exitPointerLock()
    }
  }

  let lastHudSig = ''
  const nextNavTarget = () => {
    if (!pipeFixed) return LEVEL4_ANCHORS.deWaal
    if (!newlandsFixed) return LEVEL4_ANCHORS.newlands
    if (!steenbrasFixed) return LEVEL4_ANCHORS.steenbras
    return LEVEL4_ANCHORS.vodacom
  }

  const syncHud = (extra = {}) => {
    const target = nextNavTarget()
    const nextDist = Math.round(Math.hypot(pos.x - target.x, pos.z - target.z))
    const thirstHud = Math.round(thirst)
    const timeHud = Math.floor(runElapsedMs / 100) * 100
    const handles = valves.handlesCollected()
    const handlesNeeded = valves.handlesNeeded()
    const loadPowerOn = puzzleView === 'load' ? loadShed.isPowerOn() : null
    const pipeTimer =
      !pipes.isComplete() && (puzzleView === 'pipe' || pipes.isRunning())
        ? Math.ceil(pipes.getTimer())
        : null
    const prompt = extra.prompt ?? ''
    const promptDock =
      extra.promptDock ?? (puzzleView === 'valves' ? 'top' : 'inline')
    const valveHintAvailable =
      extra.valveHintAvailable ??
      (puzzleView === 'valves' && !newlandsFixed && valves.canHint())
    const nodesRestored = (pipeFixed ? 1 : 0) + (newlandsFixed ? 1 : 0) + (steenbrasFixed ? 1 : 0)
    const sig = [
      thirstHud,
      bottles,
      timeHud,
      nextDist,
      pipeFixed,
      newlandsFixed,
      steenbrasFixed,
      handles,
      handlesNeeded,
      loadPowerOn,
      pipeTimer,
      prompt,
      promptDock,
      valveHintAvailable,
      nodesRestored,
    ].join('|')
    if (sig === lastHudSig) return
    lastHudSig = sig
    setHud((h) => ({
      ...h,
      thirst: thirstHud,
      maxThirst: LEVEL4_MAX_THIRST,
      coins: bottles,
      runTimeMs: timeHud,
      distanceToGoal: nextDist,
      pipeFixed,
      newlandsFixed,
      steenbrasFixed,
      handles,
      handlesNeeded,
      loadPowerOn,
      pipeTimer,
      prompt,
      promptDock,
      valveHintAvailable,
      nodesRestored,
    }))
  }

  const applyPipeResult = (result) => {
    if (result === 'solved' && !pipeFixed) {
      pipeFixed = true
      puzzleView = false
      pipes.setHover(null)
      city.setFloodVisible(false)
      city.setWaterRibbonVisible(true)
      city.setGateOpen('gate-newlands', true)
      applyCapeLook()
      container.style.cursor = ''
      playCoinPickup(2)
    }
    let prompt = ''
    if (result === 'solved') {
      prompt = 'Head to Newlands — watch the lights, then repeat the pattern'
    } else if (result === 'rotated') {
      prompt = 'Pipe rotated'
    }
    syncHud({ prompt })
  }

  const applyValveResult = (result) => {
    if (result === 'solved' && !newlandsFixed) {
      newlandsFixed = true
      puzzleView = false
      valves.setHoverByObject(null)
      city.setNewlandsRibbonVisible(true)
      city.setGateOpen('gate-steenbras', true)
      applyCapeLook()
      container.style.cursor = ''
      playCoinPickup(2)
    }
    let prompt = ''
    if (result === 'solved') {
      prompt = 'Newlands is online — Steenbras road is open. Time the grid.'
    } else if (result === 'wrong') {
      thirst = Math.max(0, thirst - VALVE_WRONG_THIRST)
      prompt = 'Wrong colour — watch again'
      if (thirst <= 0) {
        dieOfThirst()
        return
      }
    } else if (result === 'watch' || result === 'next-round') {
      prompt = 'Watch the lights, then repeat the pattern'
    } else if (result === 'busy') {
      prompt =
        valves.phase() === 'intro'
          ? 'Read the instructions first — the sequence starts in a moment'
          : 'Wait — watch the lights first'
    } else if (result === 'ok') {
      prompt = 'Keep going'
    }
    syncHud({ prompt })
  }

  const completeLevel = () => {
    if (won) return
    won = true
    gameState.won = true
    puzzleView = false
    playLevelComplete()
    clearPausedRef.current?.()
    const timeMs = Math.max(1, Math.round(runElapsedMs))
    let prevBest = sanitizeStoredBest(currentLevelRef.current, Number(highScoreRef.current) || 0)
    const isRecord = prevBest <= 0 || timeMs < prevBest
    const bestTime = isRecord ? timeMs : prevBest
    if (isRecord) {
      try {
        localStorage.setItem(levelHighScoreKey(currentLevelRef.current), String(bestTime))
      } catch {
        // ignore
      }
      highScoreRef.current = bestTime
      void submitBestScore(currentLevelRef.current, bestTime, { lowerIsBetter: true })
      if (!newRecordToastShownRef.current) {
        newRecordToastShownRef.current = true
        queueMicrotask(() => setNewRecordToast(true))
      }
    }
    setHud((h) => ({
      ...h,
      levelComplete: true,
      coins: bottles,
      runTimeMs: timeMs,
      highScore: bestTime,
      nodesRestored: 3,
    }))
    if (document.pointerLockElement === container) document.exitPointerLock()
    container.style.cursor = ''
    applyCapeLook()
  }

  const applyLoadResult = (result) => {
    if (result === 'solved' && !steenbrasFixed) {
      steenbrasFixed = true
      puzzleView = false
      city.setReservoirFilled(true)
      applyCapeLook()
      container.style.cursor = ''
      playCoinPickup(2)
    }
    let prompt = ''
    if (result === 'solved') {
      prompt = 'Pumps online — get to the Vodacom Building'
    } else if (result === 'shock') {
      thirst = Math.max(0, thirst - LOAD_SHOCK_THIRST)
      prompt = 'Red floor = load shedding. Wait until the whole deck turns green.'
      if (thirst <= 0) {
        dieOfThirst()
        return
      }
    } else if (result === 'wrong-step') {
      thirst = Math.max(0, thirst - 6)
      prompt = `Wrong part — click ${loadShed.nextLabel()} (yellow ring)`
      if (thirst <= 0) {
        dieOfThirst()
        return
      }
    } else if (result === 'ok') {
      prompt = `Hold for the next ON window — then ${loadShed.nextLabel()}`
    }
    syncHud({ prompt })
  }

  const eventToNdc = (e) => {
    const rect = container.getBoundingClientRect()
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  const pickPipeTile = (e) => {
    eventToNdc(e)
    raycaster.setFromCamera(pointerNdc, camera)
    const hits = raycaster.intersectObjects(pipes.getPickables(), false)
    return hits[0]?.object?.userData?.pipeTile ?? null
  }

  const pickValveIndex = (e) => {
    eventToNdc(e)
    return valves.pickIndex(camera, pointerNdc.x, pointerNdc.y)
  }

  const pickLoadObject = (e) => {
    eventToNdc(e)
    raycaster.setFromCamera(pointerNdc, camera)
    const hits = raycaster.intersectObjects(loadShed.getPickables(), true)
    return hits[0]?.object ?? null
  }

  const enterPipeView = () => {
    if (puzzleView || pipeFixed || pipes.isComplete()) return
    puzzleView = 'pipe'
    pipes.beginIfNeeded(LEVEL4_ANCHORS.deWaal.x, LEVEL4_ANCHORS.deWaal.z)
    city.setFloodVisible(false)
    scene.fog = new THREE.FogExp2(0xc9a06a, 0.0009)
    if (document.pointerLockElement === container) {
      document.exitPointerLock()
    }
    container.style.cursor = 'pointer'
    syncHud({ prompt: 'Connect each coloured west intake to the matching east sink · Q to walk away' })
  }

  const enterValveView = () => {
    if (puzzleView || newlandsFixed || valves.isComplete()) return
    puzzleView = 'valves'
    valves.begin()
    scene.fog = new THREE.FogExp2(0xc9a06a, 0.0009)
    if (document.pointerLockElement === container) {
      document.exitPointerLock()
    }
    container.style.cursor = 'pointer'
    syncHud({
      prompt:
        'Watch the coloured lights and listen — then click the same order. Q walks away.',
      promptDock: 'top',
    })
  }

  const enterLoadView = () => {
    if (puzzleView || steenbrasFixed || loadShed.isComplete()) return
    puzzleView = 'load'
    scene.fog = new THREE.FogExp2(0xc9a06a, 0.0009)
    if (document.pointerLockElement === container) {
      document.exitPointerLock()
    }
    container.style.cursor = 'pointer'
    syncHud({ prompt: 'Green floor = click the yellow ring in order 1–6. Red floor = wait. Q to walk away' })
  }

  const leavePuzzleView = () => {
    if (!puzzleView) return
    const kind = puzzleView
    puzzleView = false
    pipes.setHover(null)
    valves.setHoverByObject(null)
    loadShed.setHover(null)
    pipes.pause()
    if (!pipeFixed) city.setFloodVisible(true)
    applyCapeLook()
    container.style.cursor = ''
    const from =
      kind === 'load'
        ? LEVEL4_ANCHORS.steenbras
        : kind === 'valves'
          ? LEVEL4_ANCHORS.newlands
          : LEVEL4_ANCHORS.deWaal
    const dx = LEVEL4_ANCHORS.spawn.x - from.x
    const dz = LEVEL4_ANCHORS.spawn.z - from.z
    const len = Math.hypot(dx, dz) || 1
    const stepped = resolvePlayerCollision(from.x + (dx / len) * 16, from.z + (dz / len) * 16)
    pos.x = stepped.x
    pos.z = stepped.z
    syncHud({ prompt: '' })
  }

  const tryInteract = () => {
    if (gameOver || won || interactLock || puzzleView) return
    interactLock = true
    const result = pipes.tryRotate(pos.x, pos.z)
    if (result) applyPipeResult(result)
    const nearNewlands =
      Math.hypot(pos.x - LEVEL4_ANCHORS.newlands.x, pos.z - LEVEL4_ANCHORS.newlands.z) < 14
    const nearSteenbras =
      Math.hypot(pos.x - LEVEL4_ANCHORS.steenbras.x, pos.z - LEVEL4_ANCHORS.steenbras.z) < 14
    if (!result) {
      let prompt = ''
      if (!pipeFixed && nearNewlands) prompt = 'Restore the De Waal pipe first'
      else if (pipeFixed && !newlandsFixed && nearNewlands) {
        prompt = 'Stand on the Newlands pad to start the sequence'
      } else if (nearSteenbras && !newlandsFixed) {
        prompt = 'Steenbras is locked until Newlands is online'
      } else if (nearSteenbras && newlandsFixed && !steenbrasFixed) {
        prompt = 'Step onto the pump deck to time the load shedding'
      }
      if (prompt) syncHud({ prompt })
    }
    window.setTimeout(() => {
      interactLock = false
    }, 180)
  }

  const reset = () => {
    pos.x = PLAYER_START.x
    pos.y = PLAYER_START.y
    pos.z = PLAYER_START.z
    yaw = 0
    pitch = 0
    characterYaw = 0
    thirst = LEVEL4_MAX_THIRST
    bottles = 0
    runElapsedMs = 0
    gameOver = false
    won = false
    gameState.over = false
    gameState.won = false
    pipeFixed = false
    newlandsFixed = false
    steenbrasFixed = false
    puzzleView = false
    pipes.reset()
    valves.reset()
    loadShed.reset()
    city.setFloodVisible(true)
    city.setWaterRibbonVisible(false)
    city.setNewlandsRibbonVisible(false)
    city.setReservoirFilled(false)
    city.setGateOpen('gate-newlands', false)
    city.setGateOpen('gate-steenbras', false)
    resetLevel4Bottles(bottleData, bottleMeshes)
    resetLevel4Coins(coinData, coinMeshes)
    setHud((h) => ({
      ...h,
      gameOver: false,
      levelComplete: false,
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      runTimeMs: 0,
      thirst: LEVEL4_MAX_THIRST,
      maxThirst: LEVEL4_MAX_THIRST,
      hp: LEVEL4_MAX_THIRST,
      maxHp: LEVEL4_MAX_THIRST,
      pipeFixed: false,
      newlandsFixed: false,
      steenbrasFixed: false,
      handles: 0,
      handlesNeeded: 4,
      pipeTimer: null,
      prompt: '',
      promptDock: 'inline',
      valveHintAvailable: false,
      nodesRestored: 0,
      distanceToGoal: Math.round(
        Math.hypot(PLAYER_START.x - LEVEL4_ANCHORS.deWaal.x, PLAYER_START.z - LEVEL4_ANCHORS.deWaal.z)
      ),
    }))
  }

  const setActive = (on) => {
    active = on
    city.group.visible = on
    if (!on) {
      tableMountain.group.visible = false
      navArrow.setVisible(false)
    }
    sun.visible = on
    ambient.visible = on
    hemi.visible = on
    if (!on) {
      puzzleView = false
      pipes.setHover(null)
      valves.setHoverByObject(null)
      container.style.cursor = ''
    }
    if (on) {
      applyCapeLook()
      if (import.meta.env.DEV) console.log('[Level4] setActive true')
    }
  }

  const onPointerLockChange = () => {
    pointerLocked = document.pointerLockElement === container
  }

  const onMouseMove = (e) => {
    if (!active || gameOver || won) return
    if (puzzleView === 'pipe') {
      const tile = pickPipeTile(e)
      pipes.setHover(tile)
      return
    }
    if (puzzleView === 'valves') {
      valves.setHoverByIndex(pickValveIndex(e))
      return
    }
    if (puzzleView === 'load') {
      loadShed.setHover(pickLoadObject(e))
      return
    }
    if (!pointerLocked) return
    const sens = 0.0022
    yaw -= e.movementX * sens
    pitch -= e.movementY * sens
    pitch = Math.max(-1.35, Math.min(1.35, pitch))
  }

  const onMouseDown = (e) => {
    if (!active || gameOver || won) return
    if (e.button !== 0) return
    if (puzzleView === 'pipe') {
      e.preventDefault()
      const tile = pickPipeTile(e)
      if (!tile) return
      const result = pipes.tryRotateTile(tile)
      if (result) applyPipeResult(result)
      return
    }
    if (puzzleView === 'valves') {
      e.preventDefault()
      const idx = pickValveIndex(e)
      const result = valves.tryClickIndex(idx)
      if (result) applyValveResult(result)
      return
    }
    if (puzzleView === 'load') {
      e.preventDefault()
      const obj = pickLoadObject(e)
      if (!obj) return
      const result = loadShed.tryClickObject(obj)
      if (result) applyLoadResult(result)
      return
    }
    if (document.pointerLockElement !== container) {
      container.requestPointerLock?.()
      return
    }
    tryInteract()
  }

  const handleKeyDown = (code) => {
    if (!active || gameOver || won) return false
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = true
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = true
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = true
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = true
    if (code === 'KeyQ' && puzzleView) {
      leavePuzzleView()
      return true
    }
    if ((code === 'KeyE' || code === 'Space') && !puzzleView) tryInteract()
    return true
  }

  const handleKeyUp = (code) => {
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = false
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = false
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = false
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = false
  }

  const clearKeys = () => {
    keys.forward = false
    keys.back = false
    keys.left = false
    keys.right = false
    keys.sprint = false
  }

  /**
   * @param {number} dt
   * @param {boolean} started
   */
  const update = (dt, started) => {
    if (!active) return

    if (!started || gameOver || won) {
      navArrow.setVisible(false)
      return
    }

    runElapsedMs += dt * 1000

    if (!pipeFixed && pipes.inZone(pos.x, pos.z)) {
      enterPipeView()
    } else if (
      pipeFixed &&
      !newlandsFixed &&
      valves.inZone(pos.x, pos.z)
    ) {
      enterValveView()
    } else if (newlandsFixed && !steenbrasFixed && loadShed.inZone(pos.x, pos.z)) {
      enterLoadView()
    }

    navArrow.update(pos, nextNavTarget(), {
      dt,
      visible: !puzzleView,
    })

    const rotationSpeed = 3.5
    const fwd = puzzleView
      ? 0
      : resolveForwardAxis(keys, Boolean(autoForwardRef?.current))
    const rotation = puzzleView ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    const sprinting = !puzzleView && keys.sprint
    const spd = LEVEL4_MOVE_SPEED * (sprinting ? LEVEL4_SPRINT_MULT : 1)

    if (Math.abs(rotation) > 0.01) {
      characterYaw -= rotation * rotationSpeed * dt
    }

    const mx = -Math.sin(characterYaw) * fwd * spd * dt
    const mz = -Math.cos(characterYaw) * fwd * spd * dt
    const resolved = resolvePlayerCollision(pos.x + mx, pos.z + mz)
    pos.x = resolved.x
    pos.z = resolved.z
    sun.position.set(pos.x - 80, 180, pos.z - 50)
    sun.target.position.set(pos.x, 0, pos.z)
    sun.target.updateMatrixWorld()

    const drain = sprinting ? LEVEL4_THIRST_SPRINT : LEVEL4_THIRST_WALK
    thirst = Math.max(0, thirst - drain * dt)
    if (thirst <= 0) {
      dieOfThirst()
      return
    }

    const picked = collectLevel4BottlesNearPlayer(bottleData, pos.x, pos.z)
    if (picked > 0) {
      playCoinPickup(picked)
      bottles += picked
      thirst = Math.min(LEVEL4_MAX_THIRST, thirst + LEVEL4_BOTTLE_REFILL * picked)
    }
    updateLevel4BottleMeshes(bottleMeshes, bottleData, performance.now() / 1000)

    const coinPicked = collectLevel4CoinsNearPlayer(coinData, pos.x, pos.z)
    if (coinPicked > 0) {
      playCoinPickup(coinPicked)
      creditWalletRef?.current?.(coinPicked)
    }
    updateCollectibleInstances(coinMeshes, coinData, performance.now() / 1000)

    const grabbed = valves.collectNear()
    if (grabbed > 0) {
      playCoinPickup(grabbed)
    }

    valves.update(dt, puzzleView === 'valves' && !newlandsFixed)
    loadShed.update(dt)
    billboards.update(dt)
    if (puzzleView === 'load' && !steenbrasFixed) {
      sun.intensity = loadShed.isPowerOn() ? 2.6 : 1.15
      ambient.intensity = loadShed.isPowerOn() ? 0.5 : 0.32
    } else {
      sun.intensity = 2.6
      ambient.intensity = 0.5
    }

    pipes.beginIfNeeded(pos.x, pos.z)
    const pipeTick = pipes.update(dt)
    if (pipeTick === 'fail') {
      thirst = Math.max(0, thirst - PIPE_FAIL_THIRST)
      if (thirst <= 0) {
        dieOfThirst()
        return
      }
    }

    let prompt = ''
    if (puzzleView === 'pipe' && !pipeFixed) {
      prompt =
        'Connect all 3 intakes to their matching sinks — red, yellow, blue · Q to walk away'
    } else if (puzzleView === 'valves' && !newlandsFixed) {
      const p = valves.phase()
      prompt =
        p === 'intro' || p === 'idle'
          ? 'Watch the coloured lights and listen — then click the same order. Q walks away.'
          : p === 'watch'
            ? 'Watch the lights — then repeat · Q to walk away'
            : p === 'repeat'
              ? valves.canHint()
                ? 'Repeat the pattern · Hint plays the next colour sound · Q to walk away'
                : 'Repeat the pattern · wrong click costs water · Q to walk away'
              : 'Watch the coloured lights and listen — then click the same order. Q walks away.'
    } else if (puzzleView === 'load' && !steenbrasFixed) {
      prompt = loadShed.isPowerOn()
        ? `GREEN — click ${loadShed.nextLabel()} (yellow ring)`
        : 'RED floor — hands off until it turns green'
    } else if (pipeFixed && !newlandsFixed && valves.inZone(pos.x, pos.z)) {
      prompt = 'Approach the Newlands valves'
    } else if (steenbrasFixed && !won) {
      prompt = 'Water is back — reach the Vodacom Building'
    } else if (
      Math.hypot(pos.x - LEVEL4_ANCHORS.steenbras.x, pos.z - LEVEL4_ANCHORS.steenbras.z) < 16
    ) {
      prompt = newlandsFixed
        ? 'Step onto the Steenbras deck'
        : 'Steenbras is locked until Newlands is online'
    }

    if (
      steenbrasFixed &&
      !won &&
      Math.hypot(pos.x - LEVEL4_ANCHORS.vodacom.x, pos.z - LEVEL4_ANCHORS.vodacom.z) <
        VODACOM_WIN_REACH
    ) {
      completeLevel()
      return
    }

    syncHud({
      prompt,
      promptDock: puzzleView === 'valves' ? 'top' : 'inline',
    })
  }

  const dispose = () => {
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    container.removeEventListener('mousemove', onMouseMove)
    container.removeEventListener('mousedown', onMouseDown)
    city.group.remove(bottleMeshes.group)
    disposeLevel4BottleMeshes(bottleMeshes)
    city.group.remove(coinMeshes.group)
    disposeCoinMeshes(coinMeshes)
    navArrow.dispose()
    pipes.dispose()
    valves.dispose()
    loadShed.dispose()
    billboards.dispose()
    tableMountain.dispose()
    city.dispose()
    scene.remove(sun.target)
    scene.remove(sun)
    scene.remove(ambient)
    scene.remove(hemi)
    if (document.pointerLockElement === container) {
      document.exitPointerLock()
    }
  }

  document.addEventListener('pointerlockchange', onPointerLockChange)
  container.addEventListener('mousemove', onMouseMove)
  container.addEventListener('mousedown', onMouseDown)

  city.group.visible = false

  return {
    setActive,
    reset,
    update,
    dispose,
    handleKeyDown,
    handleKeyUp,
    clearKeys,
    isGameOver: () => gameOver,
    isWon: () => won,
    getPos: () => ({ ...pos }),
    getYaw: () => yaw,
    getCharacterYaw: () => characterYaw,
    getPitch: () => pitch,
    isPuzzleView: () => Boolean(puzzleView),
    playValveHint: () => {
      if (puzzleView !== 'valves' || newlandsFixed || gameOver || won) return false
      return valves.playNextHint()
    },
    syncHorizonBackdrop: (camera, hide) => {
      tableMountain.sync(camera, hide, active)
    },
    getPuzzleView: () => {
      if (puzzleView === 'pipe') {
        return { x: pipes.origin.x, z: pipes.origin.z, height: 34 }
      }
      if (puzzleView === 'valves') {
        return {
          x: valves.origin.x,
          z: valves.origin.z + 3.4,
          height: 16,
          lookX: valves.origin.x,
          lookZ: valves.origin.z + 3.4,
        }
      }
      if (puzzleView === 'load') {
        return {
          x: loadShed.origin.x,
          z: loadShed.origin.z + 3.15,
          height: 22,
        }
      }
      return null
    },
  }
}
