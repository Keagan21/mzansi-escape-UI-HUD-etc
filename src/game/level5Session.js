// level5Session.js — Open-world Level 5: torch, battery, substations, looters.

import * as THREE from 'three'
import {
  BLOCK,
  STREET_W,
  buildCapeTownNightCity,
  LEVEL5_ANCHORS,
  LEVEL5_WORLD_BOUND,
} from './level5City.js'
import {
  buildBillboards,
  LEVEL5_BILLBOARD_ADS,
  spotsFromPlan,
} from './level3Billboards.js'
import {
  buildLevel5BatteryData,
  collectLevel5BatteriesNearPlayer,
  createLevel5BatteryMeshes,
  disposeLevel5BatteryMeshes,
  LEVEL5_BATTERY_PER_PICKUP,
  resetLevel5Batteries,
  updateLevel5BatteryMeshes,
} from './level5Batteries.js'
import {
  buildLevel5CoinData,
  collectLevel5CoinsNearPlayer,
  createLevel5CoinMeshes,
  disposeCoinMeshes,
  resetLevel5Coins,
  updateCollectibleInstances,
} from './level5Coins.js'
import {
  createLevel5CircuitPuzzle,
  CIRCUIT_FAIL_BATTERY,
} from './level5CircuitPuzzle.js'
import {
  createLevel5CablePuzzle,
  CABLE_WRONG_BATTERY,
} from './level5CablePuzzle.js'
import {
  createLevel5GeneratorPuzzle,
  GEN_WRONG_WINDOW_BATTERY,
  GEN_WRONG_STEP_BATTERY,
} from './level5GeneratorPuzzle.js'
import { createTableMountainHorizon } from './level4Landmarks.js'
import { preloadCapeTownStadium } from './level5StadiumAssets.js'
import {
  clearLooters,
  FIRST_SPAWN_DELAY,
  isLooterNearby,
  MAX_LOOTERS,
  pickLooterSpawnPoint,
  preloadLevel5Looters,
  areLevel5LootersReady,
  PUNCH_COOLDOWN,
  SPAWN_INTERVAL_MAX,
  SPAWN_INTERVAL_MIN,
  spawnLooter,
  tryPunchLooters,
  updateLooters,
} from './level5Looters.js'
import { playCoinPickup, playIncorrectBuzzer, playLevelComplete } from './gameAudio.js'
import { sanitizeStoredBest, submitBestScore } from './scores.js'
import { levelHighScoreKey } from './storageKeys.js'
import {
  LEVEL5_BATTERY_DRAIN_ON,
  LEVEL5_BATTERY_MAX,
  LOW_SPEC_RENDERING,
  OPEN_WORLD_SHADOW_EXTENT,
  PLAYER_FACING_Y,
} from './gameConstants.js'
import { createNavArrow } from './navArrow.js'
import { resolveForwardAxis } from './movementInput.js'

export const LEVEL5_MAX_HP = 100
export const LEVEL5_PLAYER_HEIGHT = 1.7
export const LEVEL5_MOVE_SPEED = 16
export const LEVEL5_SPRINT_MULT = 1.65
export const LEVEL5_INVULN_TIME = 0.85

const PLAYER_START = {
  x: LEVEL5_ANCHORS.spawn.x,
  y: LEVEL5_PLAYER_HEIGHT,
  z: LEVEL5_ANCHORS.spawn.z,
}

const NAV_SPAWN = 'Stage 6 loadshedding. Find Substation Alpha — De Waal Drive.'
const NAV_NODE1 = 'Substation Alpha restored. Head to Newlands — Substation Bravo.'
const NAV_NODE2 = 'Substation Bravo online. Final node: Steenbras Gamma.'
const NAV_NODE3 = 'Power restored. Get to Cape Town Stadium to signal for help.'
const NAV_LOOTER = 'Warning: looting detected in your area.'

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
export function createLevel5Session(deps) {
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
  void recordBaselineRef

  void preloadCapeTownStadium()
  const city = buildCapeTownNightCity(scene)
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
      ['ns', -2, 2, 1],
      ['ew', 2, -3, -1],
      ['ns', 1, 1, -1],
      ['ew', 0, -2, 1],
      ['ns', -1, 2, -1],
    ]),
    LEVEL5_BILLBOARD_ADS,
    { name: 'level5-billboards', emissive: 0.85 }
  )
  city.colliders.push(...billboards.colliders)
  const batteryData = buildLevel5BatteryData()
  const batteryMeshes = createLevel5BatteryMeshes(batteryData)
  city.group.add(batteryMeshes.group)
  const coinData = buildLevel5CoinData(batteryData)
  const coinMeshes = createLevel5CoinMeshes(coinData, new THREE.TextureLoader())
  city.group.add(coinMeshes.group)
  const navArrow = createNavArrow(city.group, { color: 0xffd24a })

  const circuit = createLevel5CircuitPuzzle(
    city.group,
    LEVEL5_ANCHORS.node1_circuit.x,
    LEVEL5_ANCHORS.node1_circuit.z
  )
  const cables = createLevel5CablePuzzle(
    city.group,
    LEVEL5_ANCHORS.node2_cable.x,
    LEVEL5_ANCHORS.node2_cable.z
  )
  const generator = createLevel5GeneratorPuzzle(
    city.group,
    LEVEL5_ANCHORS.node3_generator.x,
    LEVEL5_ANCHORS.node3_generator.z
  )
  const tableMountain = createTableMountainHorizon(scene)

  const moon = new THREE.DirectionalLight(0x6688aa, 0.08)
  moon.castShadow = true
  const shadowMapSize = LOW_SPEC_RENDERING ? 512 : 1024
  const shadowExtent = OPEN_WORLD_SHADOW_EXTENT
  moon.shadow.mapSize.set(shadowMapSize, shadowMapSize)
  moon.shadow.camera.left = -shadowExtent
  moon.shadow.camera.right = shadowExtent
  moon.shadow.camera.top = shadowExtent
  moon.shadow.camera.bottom = -shadowExtent
  moon.shadow.camera.near = 1
  moon.shadow.camera.far = 500
  moon.shadow.bias = -0.0003
  moon.position.set(PLAYER_START.x - 40, 120, PLAYER_START.z - 80)
  moon.target.position.set(PLAYER_START.x, 0, PLAYER_START.z)

  const ambient = new THREE.AmbientLight(0x334466, 0.018)
  const hemi = new THREE.HemisphereLight(0x1a2840, 0x0a0a12, 0.08)

  // World-space torch: camera-parented spots aim at the player's back in this
  // third-person chase cam. Aim along characterYaw at the ground ahead instead.
  const TORCH_COLOR = 0xffe4b8
  const TORCH_RANGE = 38
  const TORCH_AIM = 14
  /** Visual cone only — tip sits just ahead of the body so she isn't inside it. */
  const TORCH_BEAM_LEN = 10
  const TORCH_BEAM_START = 1.7
  const TORCH_BEAM_RADIUS = 1.35
  const torch = new THREE.SpotLight(TORCH_COLOR, 0, TORCH_RANGE, 0.48, 0.62, 1.15)
  torch.name = 'player-torch'
  torch.castShadow = !LOW_SPEC_RENDERING
  if (torch.castShadow) {
    torch.shadow.mapSize.set(LOW_SPEC_RENDERING ? 256 : 512, LOW_SPEC_RENDERING ? 256 : 512)
    torch.shadow.bias = -0.0004
    torch.shadow.camera.near = 0.5
    torch.shadow.camera.far = TORCH_RANGE
  }
  const torchFill = new THREE.SpotLight(0xffd9a0, 0, 22, 0.85, 0.85, 1.4)
  torchFill.name = 'player-torch-fill'
  torchFill.castShadow = false

  // Tip at local origin, open end along local -Z (character forward after faceYaw).
  const beamGeo = new THREE.ConeGeometry(TORCH_BEAM_RADIUS, TORCH_BEAM_LEN, 20, 1, true)
  beamGeo.translate(0, -TORCH_BEAM_LEN * 0.5, 0)
  beamGeo.rotateX(Math.PI / 2)
  const beamMat = new THREE.MeshBasicMaterial({
    color: TORCH_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const torchBeam = new THREE.Mesh(beamGeo, beamMat)
  torchBeam.name = 'player-torch-beam'
  torchBeam.visible = false
  torchBeam.renderOrder = 2
  torchBeam.frustumCulled = false

  moon.visible = false
  ambient.visible = false
  hemi.visible = false
  scene.add(moon)
  scene.add(moon.target)
  scene.add(ambient)
  scene.add(hemi)
  scene.add(torch)
  scene.add(torch.target)
  scene.add(torchFill)
  scene.add(torchFill.target)
  scene.add(torchBeam)
  if (!camera.parent) scene.add(camera)

  let active = false
  const pos = { ...PLAYER_START }
  let yaw = 0
  let pitch = 0
  let characterYaw = 0
  let battery = LEVEL5_BATTERY_MAX
  let hp = LEVEL5_MAX_HP
  let batteriesCollected = 0
  let runElapsedMs = 0
  let gameOver = false
  let won = false
  let pointerLocked = false
  let node1Fixed = false
  let node2Fixed = false
  let node3Fixed = false
  let interactLock = false
  let torchOn = false
  let invulnT = 0
  let punchT = 0
  let damageFlash = 0
  let ambientTarget = 0.018
  /** @type {false | 'circuit' | 'cable' | 'generator'} */
  let puzzleView = false
  /** @type {import('./level5Looters.js').Looter[]} */
  const looters = []
  let nextSpawn = performance.now() / 1000 + FIRST_SPAWN_DELAY

  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()

  const keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
  }

  const applyNightLook = () => {
    scene.fog = new THREE.FogExp2(0x060a14, 0.022)
    scene.background = new THREE.Color(0x03060c)
  }

  const applyAmbientFromNodes = () => {
    if (node3Fixed) ambientTarget = 0.45
    else if (node2Fixed) ambientTarget = 0.28
    else if (node1Fixed) ambientTarget = 0.18
    // Keep fill dark while exploring so the torch actually reads.
    else ambientTarget = torchOn ? 0.028 : 0.018
  }

  const setTorch = (on) => {
    if (on && battery <= 0) {
      torchOn = false
      torch.intensity = 0
      torchFill.intensity = 0
      beamMat.opacity = 0
      torchBeam.visible = false
      applyAmbientFromNodes()
      return
    }
    torchOn = on
    torch.intensity = on ? 11 : 0
    torchFill.intensity = on ? 4.2 : 0
    beamMat.opacity = on ? 0.14 : 0
    torchBeam.visible = on
    if (on) syncTorchAim()
    applyAmbientFromNodes()
  }

  /** Place the beam + spots along the walk-forward direction onto the ground ahead. */
  const syncTorchAim = () => {
    // Same forward basis as movement (W): -sin/-cos of characterYaw.
    const fx = -Math.sin(characterYaw)
    const fz = -Math.cos(characterYaw)
    const originY = 1.55
    torch.position.set(pos.x + fx * 0.4, originY, pos.z + fz * 0.4)
    torch.target.position.set(pos.x + fx * TORCH_AIM, 0.08, pos.z + fz * TORCH_AIM)
    torch.target.updateMatrixWorld()

    torchFill.position.copy(torch.position)
    torchFill.target.position.set(pos.x + fx * 7, 0.05, pos.z + fz * 7)
    torchFill.target.updateMatrixWorld()

    torchBeam.position.set(
      pos.x + fx * TORCH_BEAM_START,
      1.25,
      pos.z + fz * TORCH_BEAM_START
    )
    torchBeam.rotation.set(0, characterYaw, 0)
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
    nx = Math.max(-LEVEL5_WORLD_BOUND, Math.min(LEVEL5_WORLD_BOUND, nx))
    nz = Math.max(-LEVEL5_WORLD_BOUND, Math.min(LEVEL5_WORLD_BOUND, nz))
    return { x: nx, z: nz }
  }

  const dieFromLooters = () => {
    gameOver = true
    gameState.over = true
    clearPausedRef.current?.()
    setTorch(false)
    setHud((h) => ({ ...h, gameOver: true, hp: 0, maxHp: LEVEL5_MAX_HP }))
    if (document.pointerLockElement === container) document.exitPointerLock()
  }

  const onPlayerHit = (damage) => {
    if (invulnT > 0 || gameOver || won) return
    hp = Math.max(0, hp - damage)
    invulnT = LEVEL5_INVULN_TIME
    damageFlash = 0.4
    setHud((h) => ({ ...h, hp, maxHp: LEVEL5_MAX_HP }))
    if (hp <= 0) dieFromLooters()
  }

  const tryPunch = () => {
    if (punchT > 0 || gameOver || won || puzzleView) return
    punchT = PUNCH_COOLDOWN
    tryPunchLooters(looters, pos.x, pos.z, characterYaw - PLAYER_FACING_Y)
  }

  const drainBattery = (amount) => {
    battery = Math.max(0, battery - amount)
    if (battery <= 0) setTorch(false)
  }

  const navigatorMessage = () => {
    if (isLooterNearby(looters, pos.x, pos.z, 16)) return NAV_LOOTER
    if (node3Fixed) return NAV_NODE3
    if (node2Fixed) return NAV_NODE2
    if (node1Fixed) return NAV_NODE1
    return NAV_SPAWN
  }

  let lastHudSig = ''
  const nextNavTarget = () => {
    if (!node1Fixed) return LEVEL5_ANCHORS.node1_circuit
    if (!node2Fixed) return LEVEL5_ANCHORS.node2_cable
    if (!node3Fixed) return LEVEL5_ANCHORS.node3_generator
    return LEVEL5_ANCHORS.stadium_win
  }

  const syncHud = (extra = {}) => {
    const target = nextNavTarget()
    const nextDist = Math.round(Math.hypot(pos.x - target.x, pos.z - target.z))
    const batteryHud = Math.round(battery)
    const hpHud = Math.round(hp)
    const timeHud = Math.floor(runElapsedMs / 100) * 100
    const circuitTimer =
      !circuit.isComplete() && (puzzleView === 'circuit' || circuit.isRunning())
        ? Math.ceil(circuit.getTimer())
        : null
    const cableProgress =
      puzzleView === 'cable' || (!node2Fixed && cables.getPlacedCount() > 0)
        ? `${cables.getPlacedCount()}/${cables.getNeededCount()}`
        : null
    const genPowerOn = puzzleView === 'generator' ? generator.isPowerOn() : null
    const prompt = extra.prompt ?? ''
    const promptDock = extra.promptDock ?? 'inline'
    const nodesRestored = (node1Fixed ? 1 : 0) + (node2Fixed ? 1 : 0) + (node3Fixed ? 1 : 0)
    const nav = navigatorMessage()
    const sig = [
      batteryHud,
      hpHud,
      batteriesCollected,
      timeHud,
      nextDist,
      node1Fixed,
      node2Fixed,
      node3Fixed,
      circuitTimer,
      cableProgress,
      genPowerOn,
      prompt,
      promptDock,
      nodesRestored,
      nav,
      torchOn,
      puzzleView || 'none',
    ].join('|')
    if (sig === lastHudSig) return
    lastHudSig = sig
    setHud((h) => ({
      ...h,
      battery: batteryHud,
      maxBattery: LEVEL5_BATTERY_MAX,
      thirst: batteryHud,
      maxThirst: LEVEL5_BATTERY_MAX,
      hp: hpHud,
      maxHp: LEVEL5_MAX_HP,
      coins: batteriesCollected,
      runTimeMs: timeHud,
      distanceToGoal: nextDist,
      node1Fixed,
      node2Fixed,
      node3Fixed,
      circuitFixed: node1Fixed,
      cableFixed: node2Fixed,
      generatorFixed: node3Fixed,
      circuitTimer,
      cableProgress,
      genPowerOn,
      prompt,
      promptDock,
      nodesRestored,
      navigatorMessage: nav,
      torchOn,
      puzzleView: puzzleView || null,
    }))
  }

  const applyCircuitResult = (result) => {
    if (result === 'solved' && !node1Fixed) {
      node1Fixed = true
      puzzleView = false
      circuit.setHover(null)
      city.setGateOpen('gate-cable', true)
      city.setSubstationLit(0, true)
      city.activateZoneLamps('A')
      applyAmbientFromNodes()
      applyNightLook()
      container.style.cursor = ''
      playCoinPickup(2)
    }
    let prompt = ''
    if (result === 'solved') prompt = 'Substation Alpha live — head to Newlands'
    else if (result === 'toggled') prompt = 'Breaker toggled'
    syncHud({ prompt })
  }

  const applyCableResult = (result) => {
    if (result === 'solved' && !node2Fixed) {
      node2Fixed = true
      puzzleView = false
      cables.setHover(null)
      city.setGateOpen('gate-generator', true)
      city.setSubstationLit(1, true)
      city.activateZoneLamps('B')
      applyAmbientFromNodes()
      applyNightLook()
      container.style.cursor = ''
      playCoinPickup(2)
    }
    let prompt = ''
    if (result === 'solved') {
      prompt = 'All 6 cables linked — Bravo is online. Head to Steenbras Gamma.'
    } else if (result === 'cross') {
      drainBattery(CABLE_WRONG_BATTERY)
      prompt = 'Cables cannot cross — try another path'
    } else if (result === 'wrong') {
      drainBattery(CABLE_WRONG_BATTERY)
      prompt = 'Wrong pair — match the same letter (A–F) and colour'
    } else if (result === 'busy') {
      prompt = 'That link is already connected'
    } else if (result === 'select') {
      prompt = 'Selected — click the matching letter of the same colour'
    } else if (result === 'deselect') {
      prompt = 'Selection cleared'
    } else if (result === 'ok') {
      prompt = `Cable linked (${cables.getPlacedCount()}/${cables.getNeededCount()})`
    }
    syncHud({ prompt })
  }

  const applyGeneratorResult = (result) => {
    if (result === 'solved' && !node3Fixed) {
      node3Fixed = true
      puzzleView = false
      generator.setHover(null)
      city.setSubstationLit(2, true)
      city.activateZoneLamps('C')
      applyAmbientFromNodes()
      applyNightLook()
      container.style.cursor = ''
      playCoinPickup(2)
    }
    let prompt = ''
    if (result === 'solved') prompt = 'Power restored — get to Cape Town Stadium'
    else if (result === 'shock') {
      drainBattery(GEN_WRONG_WINDOW_BATTERY)
      playIncorrectBuzzer()
      prompt = 'OFF window — wait for green'
    } else if (result === 'wrong-step') {
      drainBattery(GEN_WRONG_STEP_BATTERY)
      playIncorrectBuzzer()
      prompt = `Wrong part — next: ${generator.nextLabel()}`
    } else if (result === 'ok') {
      prompt = `Hold for next ON — then ${generator.nextLabel()}`
    }
    syncHud({ prompt })
  }

  const completeLevel = () => {
    if (won) return
    won = true
    gameState.won = true
    puzzleView = false
    city.setStadiumFloodlights(true)
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
      coins: batteriesCollected,
      runTimeMs: timeMs,
      highScore: bestTime,
      nodesRestored: 3,
      navigatorMessage: NAV_NODE3,
    }))
    if (document.pointerLockElement === container) document.exitPointerLock()
    container.style.cursor = ''
    applyNightLook()
  }

  const eventToNdc = (e) => {
    const rect = container.getBoundingClientRect()
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  const pickFrom = (pickables, e) => {
    eventToNdc(e)
    raycaster.setFromCamera(pointerNdc, camera)
    const hits = raycaster.intersectObjects(pickables, true)
    return hits[0]?.object ?? null
  }

  const enterCircuitView = () => {
    if (puzzleView || node1Fixed || circuit.isComplete()) return
    puzzleView = 'circuit'
    circuit.beginIfNeeded()
    scene.fog = new THREE.FogExp2(0x0a1020, 0.006)
    if (document.pointerLockElement === container) document.exitPointerLock()
    container.style.cursor = 'pointer'
    syncHud({ prompt: 'Match the breaker manual · E/LMB toggle · Q to walk away' })
  }

  const enterCableView = () => {
    if (puzzleView || node2Fixed || cables.isComplete()) return
    puzzleView = 'cable'
    cables.begin()
    scene.fog = new THREE.FogExp2(0x0a1020, 0.006)
    if (document.pointerLockElement === container) document.exitPointerLock()
    container.style.cursor = 'pointer'
    syncHud({
      prompt: 'Match letter + colour (A–F) · no crossing · 6 cables · Q to leave',
    })
  }

  const enterGeneratorView = () => {
    if (puzzleView || node3Fixed || generator.isComplete()) return
    puzzleView = 'generator'
    scene.fog = new THREE.FogExp2(0x0a1020, 0.006)
    if (document.pointerLockElement === container) document.exitPointerLock()
    container.style.cursor = 'pointer'
    syncHud({ prompt: 'Green = act in order. Red = wait. Q to walk away' })
  }

  const leavePuzzleView = () => {
    if (!puzzleView) return
    const kind = puzzleView
    puzzleView = false
    circuit.setHover(null)
    cables.setHover(null)
    generator.setHover(null)
    circuit.pause()
    applyNightLook()
    container.style.cursor = ''
    const from =
      kind === 'generator'
        ? LEVEL5_ANCHORS.node3_generator
        : kind === 'cable'
          ? LEVEL5_ANCHORS.node2_cable
          : LEVEL5_ANCHORS.node1_circuit
    const dx = LEVEL5_ANCHORS.spawn.x - from.x
    const dz = LEVEL5_ANCHORS.spawn.z - from.z
    const len = Math.hypot(dx, dz) || 1
    const stepped = resolvePlayerCollision(from.x + (dx / len) * 16, from.z + (dz / len) * 16)
    pos.x = stepped.x
    pos.z = stepped.z
    syncHud({ prompt: '' })
  }

  const reset = () => {
    clearLooters(looters)
    pos.x = PLAYER_START.x
    pos.y = PLAYER_START.y
    pos.z = PLAYER_START.z
    yaw = 0
    pitch = 0
    characterYaw = 0
    battery = LEVEL5_BATTERY_MAX
    hp = LEVEL5_MAX_HP
    batteriesCollected = 0
    runElapsedMs = 0
    gameOver = false
    won = false
    gameState.over = false
    gameState.won = false
    node1Fixed = false
    node2Fixed = false
    node3Fixed = false
    puzzleView = false
    invulnT = 0
    punchT = 0
    damageFlash = 0
    setTorch(false)
    ambientTarget = 0.018
    ambient.intensity = 0.018
    circuit.reset()
    cables.reset()
    generator.reset()
    city.setGateOpen('gate-cable', false)
    city.setGateOpen('gate-generator', false)
    city.setSubstationLit(0, false)
    city.setSubstationLit(1, false)
    city.setSubstationLit(2, false)
    city.setStadiumFloodlights(false)
    resetLevel5Batteries(batteryData, batteryMeshes)
    resetLevel5Coins(coinData, coinMeshes)
    nextSpawn = performance.now() / 1000 + FIRST_SPAWN_DELAY
    lastHudSig = ''
    setHud((h) => ({
      ...h,
      gameOver: false,
      levelComplete: false,
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      runTimeMs: 0,
      battery: LEVEL5_BATTERY_MAX,
      maxBattery: LEVEL5_BATTERY_MAX,
      thirst: LEVEL5_BATTERY_MAX,
      maxThirst: LEVEL5_BATTERY_MAX,
      hp: LEVEL5_MAX_HP,
      maxHp: LEVEL5_MAX_HP,
      node1Fixed: false,
      node2Fixed: false,
      node3Fixed: false,
      circuitFixed: false,
      cableFixed: false,
      generatorFixed: false,
      circuitTimer: null,
      prompt: '',
      promptDock: 'inline',
      nodesRestored: 0,
      navigatorMessage: NAV_SPAWN,
      torchOn: false,
      distanceToGoal: Math.round(
        Math.hypot(
          PLAYER_START.x - LEVEL5_ANCHORS.node1_circuit.x,
          PLAYER_START.z - LEVEL5_ANCHORS.node1_circuit.z
        )
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
    moon.visible = on
    ambient.visible = on
    hemi.visible = on
    if (!on) {
      puzzleView = false
      setTorch(false)
      clearLooters(looters)
      container.style.cursor = ''
    }
    if (on) {
      applyNightLook()
      void preloadLevel5Looters()
      if (import.meta.env.DEV) console.log('[Level5] setActive true')
    }
  }

  const onPointerLockChange = () => {
    pointerLocked = document.pointerLockElement === container
  }

  const onMouseMove = (e) => {
    if (!active || gameOver || won) return
    if (puzzleView === 'circuit') {
      circuit.setHover(pickFrom(circuit.getPickables(), e))
      return
    }
    if (puzzleView === 'cable') {
      cables.setHover(pickFrom(cables.getPickables(), e))
      return
    }
    if (puzzleView === 'generator') {
      generator.setHover(pickFrom(generator.getPickables(), e))
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
    if (puzzleView === 'circuit') {
      e.preventDefault()
      const obj = pickFrom(circuit.getPickables(), e)
      if (!obj) return
      const result = circuit.tryToggleObject(obj)
      if (result) applyCircuitResult(result)
      return
    }
    if (puzzleView === 'cable') {
      e.preventDefault()
      const obj = pickFrom(cables.getPickables(), e)
      if (!obj) return
      const result = cables.tryClickObject(obj)
      if (result) applyCableResult(result)
      return
    }
    if (puzzleView === 'generator') {
      e.preventDefault()
      const obj = pickFrom(generator.getPickables(), e)
      if (!obj) return
      const result = generator.tryClickObject(obj)
      if (result) applyGeneratorResult(result)
      return
    }
    if (document.pointerLockElement !== container) {
      container.requestPointerLock?.()
      return
    }
    tryPunch()
  }

  const handleKeyDown = (code) => {
    if (!active || gameOver || won) return false
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = true
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = true
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = true
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = true
    if (code === 'KeyQ') {
      if (puzzleView) {
        leavePuzzleView()
        return true
      }
      setTorch(!torchOn)
      syncHud({ prompt: torchOn ? 'Torch ON' : 'Torch OFF' })
      return true
    }
    if (code === 'Space' && !puzzleView) tryPunch()
    if (code === 'KeyE' && !puzzleView) {
      // Proximity enter is automatic; E still useful as a nudge prompt
      if (!node1Fixed && circuit.inZone(pos.x, pos.z)) enterCircuitView()
      else if (node1Fixed && !node2Fixed && cables.inZone(pos.x, pos.z)) enterCableView()
      else if (node2Fixed && !node3Fixed && generator.inZone(pos.x, pos.z)) {
        enterGeneratorView()
      }
    }
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

    damageFlash = Math.max(0, damageFlash - dt)
    if (damageFlash > 0) {
      const flashIntensity = damageFlash / 0.4
      const baseColor = new THREE.Color(0x050a14)
      const flashColor = new THREE.Color(0xff0000)
      scene.background.copy(baseColor).lerp(flashColor, flashIntensity * 0.35)
    } else if (!puzzleView) {
      scene.background.setHex(0x050a14)
    }

    // Lerp ambient toward target (node progress / torch)
    if (!node1Fixed && !node2Fixed && !node3Fixed) {
      ambientTarget = torchOn ? 0.028 : 0.018
    }
    ambient.intensity += (ambientTarget - ambient.intensity) * Math.min(1, dt * 2.5)

    if (!started || gameOver || won) {
      navArrow.setVisible(false)
      return
    }

    runElapsedMs += dt * 1000
    invulnT = Math.max(0, invulnT - dt)
    punchT = Math.max(0, punchT - dt)

    if (!node1Fixed && circuit.inZone(pos.x, pos.z)) enterCircuitView()
    else if (node1Fixed && !node2Fixed && cables.inZone(pos.x, pos.z)) enterCableView()
    else if (node2Fixed && !node3Fixed && generator.inZone(pos.x, pos.z)) {
      enterGeneratorView()
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
    const spd = LEVEL5_MOVE_SPEED * (sprinting ? LEVEL5_SPRINT_MULT : 1)

    if (Math.abs(rotation) > 0.01) {
      characterYaw -= rotation * rotationSpeed * dt
    }

    const mx = -Math.sin(characterYaw) * fwd * spd * dt
    const mz = -Math.cos(characterYaw) * fwd * spd * dt
    const resolved = resolvePlayerCollision(pos.x + mx, pos.z + mz)
    pos.x = resolved.x
    pos.z = resolved.z
    moon.position.set(pos.x - 40, 120, pos.z - 80)
    moon.target.position.set(pos.x, 0, pos.z)
    moon.target.updateMatrixWorld()

    if (torchOn) syncTorchAim()

    if (torchOn && battery > 0) {
      drainBattery(LEVEL5_BATTERY_DRAIN_ON * dt)
    } else if (battery <= 0 && torchOn) {
      setTorch(false)
    }

    const picked = collectLevel5BatteriesNearPlayer(batteryData, pos.x, pos.z)
    if (picked > 0) {
      playCoinPickup(picked)
      batteriesCollected += picked
      battery = Math.min(LEVEL5_BATTERY_MAX, battery + LEVEL5_BATTERY_PER_PICKUP * picked)
    }
    updateLevel5BatteryMeshes(batteryMeshes, batteryData, performance.now() / 1000)

    const coinPicked = collectLevel5CoinsNearPlayer(coinData, pos.x, pos.z)
    if (coinPicked > 0) {
      playCoinPickup(coinPicked)
      creditWalletRef?.current?.(coinPicked)
    }
    updateCollectibleInstances(coinMeshes, coinData, performance.now() / 1000)

    const t = performance.now() / 1000
    if (!areLevel5LootersReady()) void preloadLevel5Looters()
    if (!puzzleView && t > nextSpawn && looters.length < MAX_LOOTERS) {
      const spawn = pickLooterSpawnPoint(pos.x, pos.z, city.colliders, yaw)
      const looter = spawnLooter(city.group, spawn.x, spawn.z, spawn.type)
      looters.push(looter)
      nextSpawn =
        t + SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN)
    }

    updateLooters(looters, {
      px: pos.x,
      pz: pos.z,
      colliders: city.colliders,
      dt,
      onPlayerHit,
      playerInvuln: invulnT > 0,
      torchOn,
    })

    if (gameOver) return

    const circuitTick = circuit.update(dt)
    if (circuitTick === 'fail') {
      drainBattery(CIRCUIT_FAIL_BATTERY)
      syncHud({ prompt: 'Time up — breakers scrambled (−14 battery)' })
    }
    cables.update(dt)
    generator.update(dt)
    billboards.update(dt)

    let prompt = ''
    if (puzzleView === 'circuit' && !node1Fixed) {
      prompt = 'Match the schematic · Q to walk away'
    } else if (puzzleView === 'cable' && !node2Fixed) {
      prompt = 'Connect colour pairs without crossing · Q to walk away'
    } else if (puzzleView === 'generator' && !node3Fixed) {
      prompt = generator.isPowerOn()
        ? `GREEN — ${generator.nextLabel()}`
        : 'RED — wait for the ON window'
    } else if (node3Fixed && !won) {
      prompt = 'Power is back — reach Cape Town Stadium'
    }

    if (
      node3Fixed &&
      !won &&
      Math.hypot(pos.x - LEVEL5_ANCHORS.stadium_win.x, pos.z - LEVEL5_ANCHORS.stadium_win.z) < 12
    ) {
      completeLevel()
      return
    }

    syncHud({ prompt, promptDock: 'inline' })
  }

  const dispose = () => {
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    container.removeEventListener('mousemove', onMouseMove)
    container.removeEventListener('mousedown', onMouseDown)
    clearLooters(looters)
    city.group.remove(batteryMeshes.group)
    disposeLevel5BatteryMeshes(batteryMeshes)
    city.group.remove(coinMeshes.group)
    disposeCoinMeshes(coinMeshes)
    navArrow.dispose()
    circuit.dispose()
    cables.dispose()
    generator.dispose()
    billboards.dispose()
    tableMountain.dispose()
    city.dispose()
    camera.remove(torch)
    camera.remove(torch.target)
    scene.remove(torch)
    scene.remove(torch.target)
    scene.remove(torchFill)
    scene.remove(torchFill.target)
    scene.remove(torchBeam)
    torch.dispose()
    torchFill.dispose()
    beamGeo.dispose()
    beamMat.dispose()
    scene.remove(moon.target)
    scene.remove(moon)
    scene.remove(ambient)
    scene.remove(hemi)
    if (document.pointerLockElement === container) document.exitPointerLock()
  }

  document.addEventListener('pointerlockchange', onPointerLockChange)
  container.addEventListener('mousemove', onMouseMove)
  container.addEventListener('mousedown', onMouseDown)

  city.group.visible = false
  nextSpawn = performance.now() / 1000 + FIRST_SPAWN_DELAY

  return {
    setActive,
    reset,
    update,
    dispose,
    handleKeyDown,
    handleKeyUp,
    clearKeys,
    tryPunch,
    isGameOver: () => gameOver,
    isWon: () => won,
    getPos: () => ({ ...pos }),
    getYaw: () => yaw,
    getCharacterYaw: () => characterYaw,
    getPitch: () => pitch,
    isTorchOn: () => torchOn,
    isPuzzleView: () => Boolean(puzzleView),
    syncHorizonBackdrop: (cam, hide) => {
      tableMountain.sync(cam, hide, active)
    },
    getPuzzleView: () => {
      if (puzzleView === 'circuit') {
        // Frame breakers + flat schematic (schematic ~ -6.2; hut further back).
        return { x: circuit.origin.x, z: circuit.origin.z - 1.5, height: 28 }
      }
      if (puzzleView === 'cable') {
        return { x: cables.origin.x, z: cables.origin.z, height: 20 }
      }
      if (puzzleView === 'generator') {
        return {
          x: generator.origin.x,
          z: generator.origin.z + 3.15,
          height: 22,
        }
      }
      return null
    },
  }
}
