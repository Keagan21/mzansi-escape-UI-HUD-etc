// level8Session.js — Soweto Homecoming: third-person flood route, no combat.

import * as THREE from 'three'
import { getLevel6ViewIndex, getLevel6ViewStep } from './level6View.js'
import {
  buildSowetoStormCity,
  LEVEL8_ALL_TIPS_BONUS_MS,
  LEVEL8_ANCHORS,
  LEVEL8_CHECKPOINTS,
  LEVEL8_MAX_SOAKINGS,
  LEVEL8_SOAK_BONUS_MS,
  LEVEL8_WIN_RADIUS,
  LEVEL8_WORLD_BOUNDS,
  navStreetGuide,
} from './level8City.js'
import {
  createSoakTracker,
  LEVEL8_CURRENT_PUSH,
  LEVEL8_RAIN_WINDOW_S,
  LEVEL8_SHALLOW_SPEED,
  sampleWater,
} from './level8Water.js'
import {
  createLevel8Beats,
  dropCrate,
  interactPrompt,
  navTarget,
  neighboursDone,
  resetLevel8Beats,
  tryInteract,
} from './level8Beats.js'
import {
  buildLevel8CoinData,
  buildLevel8HeartData,
  buildLevel8TipData,
  collectLevel8CoinsNearPlayer,
  collectLevel8HeartsNearPlayer,
  createLevel8CoinMeshes,
  createLevel8HeartMeshes,
  createLevel8TipMeshes,
  disposeCoinMeshes,
  findLevel8TipNear,
  resetLevel8Coins,
  resetLevel8Hearts,
  resetLevel8Tips,
  updateCollectibleInstances,
  updateLevel8HeartMeshes,
  updateLevel8TipMeshes,
} from './level8Collectibles.js'
import { createLevel8People } from './level8People.js'
import { createLevel8Decor } from './level8Decor.js'
import { createLevel8Ambient } from './level8Ambient.js'
import { buildBillboards, LEVEL8_BILLBOARD_ADS } from './level3Billboards.js'
import { playCoinPickup, playIncorrectBuzzer, playLevelComplete } from './gameAudio.js'
import { sanitizeStoredBest, submitBestScore } from './scores.js'
import { levelHighScoreKey } from './storageKeys.js'
import { createNavArrow } from './navArrow.js'
import { LEVEL6_SPRINT_SPEED, LEVEL6_WALK_SPEED } from './gameConstants.js'

export const LEVEL8_PLAYER_HEIGHT = 1.7
export const LEVEL8_MAX_HP = 100
export const LEVEL8_TAXI_DAMAGE = 34
export const LEVEL8_INVULN_TIME = 0.9
export const LEVEL8_START_HEARTS = 1
export const LEVEL8_GAME_OVER_COPY = 'The water took you. Get to high ground next time.'
export const LEVEL8_TAXI_FAIL_COPY = 'A taxi knocked you down. The mission is over.'
export const LEVEL8_NO_COMBAT_COPY = "You can't punch a flood."

export const LEVEL8_NAVIGATOR = {
  spawn: 'Take Vilakazi Ridge south, then turn EAST onto Clinic Road (Shell on the corner).',
  clinic: 'Back onto Vilakazi Ridge, then WEST on School Road (Engen on the corner).',
  school: 'South on Vilakazi Ridge, then EAST onto Spaza Lane.',
  spaza: 'Crate’s dry. Stay on Spaza Lane, then Vilakazi Ridge south to Home.',
  crate: 'Got the crate. Follow Spaza Lane back to the shop.',
  homeNav: 'All three checked. Stay on Vilakazi Ridge south — Home is on the hill.',
  soak1: 'Close. Stay on Vilakazi Ridge.',
  soak2: "One more soaking and you’re done. High ground only — Vilakazi Ridge.",
  nearWater: 'Current. Step back onto the named street.',
  win: 'You made it. The house is above the waterline.',
}

const CAM_OFFSET = new THREE.Vector3(0, 5.8, 11)
const CAM_TARGET_OFFSET = new THREE.Vector3(0, 1.7, 0)
const CAM_LERP = 0.12
const GRACE_AFTER_RESPAWN = 1.4
const CHECKPOINT_FLASH_MS = 2200
const SOAK_FLASH_MS = 900
const PROMPT_HOLD_MS = 4200
const TIP_PROMPT_HOLD_MS = 7000
const BARK_HOLD_MS = 3200
const SKY = 0x8aa0b4
const SKY_STORM = 0x4a5c70
const FLASH_BLUE = new THREE.Color(0x4db8ff)
const PLAYER_START = {
  x: LEVEL8_ANCHORS.spawn.x,
  y: LEVEL8_PLAYER_HEIGHT,
  z: LEVEL8_ANCHORS.spawn.z,
}

const BILLBOARD_SPOTS = [
  { x: -13.6, z: 106, rotationY: 0.06 },
  { x: 13.6, z: 58, rotationY: -0.06 },
  { x: 13.6, z: 22, rotationY: -0.06 },
  { x: -13.6, z: 18, rotationY: 0.06 },
  { x: 13.6, z: -22, rotationY: -0.06 },
  { x: -13.6, z: -88, rotationY: 0.06 },
]

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
 *   playerRoot?: THREE.Object3D
 * }} deps
 */
export function createLevel8Session(deps) {
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
    playerRoot,
  } = deps

  void camera
  void renderer
  void recordBaselineRef

  const city = buildSowetoStormCity(scene)
  const billboards = buildBillboards(city.group, BILLBOARD_SPOTS, LEVEL8_BILLBOARD_ADS, {
    name: 'level8-billboards',
    variant: 'roadside',
    emissive: 0.5,
  })
  city.colliders.push(...billboards.colliders)
  const people = createLevel8People(city.group, {
    addCollider: (c) => city.colliders.push(c),
  })
  const decor = createLevel8Decor(city.group, city.colliders)
  const ambient = createLevel8Ambient()
  const tipData = buildLevel8TipData()
  const tipMeshes = createLevel8TipMeshes(tipData)
  city.group.add(tipMeshes.group)
  const coinData = buildLevel8CoinData()
  const coinMeshes = createLevel8CoinMeshes(coinData, new THREE.TextureLoader())
  city.group.add(coinMeshes.group)
  const heartData = buildLevel8HeartData()
  const heartMeshes = createLevel8HeartMeshes(heartData)
  city.group.add(heartMeshes.group)
  const navArrow = createNavArrow(city.group, { color: 0x7ee0ff })
  const beats = createLevel8Beats()
  const soak = createSoakTracker()

  const sun = new THREE.DirectionalLight(0xc5d4e4, 1.05)
  sun.position.set(-40, 70, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(512, 512)
  const fill = new THREE.HemisphereLight(0x9eb4c8, 0x3a3228, 0.55)
  const ambientLight = new THREE.AmbientLight(0x6a7c8c, 0.28)
  sun.visible = false
  fill.visible = false
  ambientLight.visible = false
  scene.add(sun, fill, ambientLight)

  let active = false
  const pos = { ...PLAYER_START }
  let characterYaw = 0
  let runElapsedMs = 0
  let gameOver = false
  let won = false
  let soakingsUsed = 0
  let hp = LEVEL8_MAX_HP
  let hearts = LEVEL8_START_HEARTS
  let invulnT = 0
  let failReason = 'soak'
  let stormLocked = false
  let respawnMs = 0
  let graceT = 0
  let flashT = 0
  let soakFlashAt = 0
  let checkpointFlashAt = 0
  let tipsCollected = 0
  let snapCamera = true
  let sprintingNow = false
  let rainLeft = 0
  let lightningT = 0
  let carriedCrate = null
  let eDown = false
  let appliedViewIndex = getLevel6ViewIndex()
  /** @type {{ text: string, until: number }} */
  let timedPrompt = { text: '', until: 0 }
  /** @type {{ text: string, until: number }} */
  let navOverride = { text: '', until: 0 }
  const activated = new Set(['start'])
  let lastCheckpoint = LEVEL8_CHECKPOINTS[0]

  const keys = { forward: false, back: false, left: false, right: false, sprint: false }
  const camTarget = new THREE.Vector3()
  const camLook = new THREE.Vector3()
  const camOffset = new THREE.Vector3()

  const carryCrateVisual = () => {
    if (!beats.carrying) {
      if (carriedCrate) carriedCrate.visible = false
      city.setCrateCarrying(false)
      return
    }
    city.setCrateCarrying(true)
    if (!carriedCrate && playerRoot) {
      carriedCrate = city.crateGroup.clone()
      carriedCrate.visible = true
      carriedCrate.position.set(0.35, 1.15, 0.2)
      playerRoot.add(carriedCrate)
    }
    if (carriedCrate) carriedCrate.visible = true
  }

  const applyStormLook = (heavy) => {
    const fog = heavy ? 0.012 : 0.006
    const bg = heavy ? SKY_STORM : SKY
    scene.fog = new THREE.FogExp2(bg, fog)
    scene.background = new THREE.Color(bg)
  }

  const showPrompt = (text, holdMs = PROMPT_HOLD_MS) => {
    timedPrompt = { text, until: performance.now() + holdMs }
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
    nx = Math.max(LEVEL8_WORLD_BOUNDS.minX, Math.min(LEVEL8_WORLD_BOUNDS.maxX, nx))
    nz = Math.max(LEVEL8_WORLD_BOUNDS.minZ, Math.min(LEVEL8_WORLD_BOUNDS.maxZ, nz))
    return { x: nx, z: nz }
  }

  const navigatorMessage = () => {
    if (won) return LEVEL8_NAVIGATOR.win
    if (navOverride.text && performance.now() < navOverride.until) return navOverride.text
    const sample = sampleWater(pos.x, pos.z, city.getWaterStage())
    if (sample.inCurrent || sample.deep) return LEVEL8_NAVIGATOR.nearWater
    if (neighboursDone(beats) >= 3) return LEVEL8_NAVIGATOR.homeNav
    if (beats.carrying) return LEVEL8_NAVIGATOR.crate
    if (beats.school) return LEVEL8_NAVIGATOR.school
    if (beats.clinic) return LEVEL8_NAVIGATOR.clinic
    return LEVEL8_NAVIGATOR.spawn
  }

  const currentPrompt = () => {
    if (timedPrompt.text && performance.now() < timedPrompt.until) return timedPrompt.text
    if (respawnMs > 0) return 'Washed back — last checkpoint…'
    if (beats.carrying) return 'Carrying crate — take it to the spaza'
    const interact = interactPrompt(beats, pos.x, pos.z)
    if (interact) return interact
    if (findLevel8TipNear(tipData, pos.x, pos.z) >= 0) return 'E — read the flood-safety note'
    return ''
  }

  let lastHudSig = ''
  const syncHud = () => {
    const now = Date.now()
    if (checkpointFlashAt && now - checkpointFlashAt > CHECKPOINT_FLASH_MS) checkpointFlashAt = 0
    if (soakFlashAt && now - soakFlashAt > SOAK_FLASH_MS) soakFlashAt = 0
    const goal = navTarget(beats)
    const distanceToGoal = Math.round(Math.hypot(pos.x - goal.x, pos.z - goal.z))
    const timeHud = Math.floor(runElapsedMs / 100) * 100
    const nav = navigatorMessage()
    const prompt = currentPrompt()
    const nDone = neighboursDone(beats)
    const guide = navStreetGuide(beats)
    const nextStreet = `${guide.street} · ${guide.turn}`
    const sig = [
      soakingsUsed,
      hp,
      hearts,
      nav,
      prompt,
      nextStreet,
      sprintingNow,
      timeHud,
      distanceToGoal,
      tipsCollected,
      nDone,
      city.getWaterStage(),
      beats.carrying,
      checkpointFlashAt,
      soakFlashAt,
      rainLeft > 0 || stormLocked,
    ].join('|')
    if (sig === lastHudSig) return
    lastHudSig = sig
    setHud((h) => ({
      ...h,
      soakingsUsed,
      maxSoakings: LEVEL8_MAX_SOAKINGS,
      hp,
      maxHp: LEVEL8_MAX_HP,
      hearts,
      navigatorMessage: nav,
      nextStreet,
      prompt,
      sprinting: sprintingNow,
      carryingCrate: beats.carrying,
      runTimeMs: timeHud,
      distanceToGoal,
      tipsCollected,
      tipsTotal: tipData.length,
      neighboursDone: nDone,
      waterStage: city.getWaterStage(),
      rainHeavy: rainLeft > 0 || stormLocked,
      coins: tipsCollected,
      checkpointFlashAt,
      soakFlashAt,
    }))
  }

  const failRun = (reason = 'soak') => {
    failReason = reason
    gameOver = true
    gameState.over = true
    clearPausedRef.current?.()
    setHud((h) => ({
      ...h,
      gameOver: true,
      level8FailChoice: true,
      failReason,
      soakingsUsed,
      maxSoakings: LEVEL8_MAX_SOAKINGS,
      hp: reason === 'taxi' ? 0 : hp,
      maxHp: LEVEL8_MAX_HP,
      hearts,
      navigatorMessage: reason === 'taxi' ? LEVEL8_TAXI_FAIL_COPY : LEVEL8_GAME_OVER_COPY,
      coins: tipsCollected,
    }))
  }

  const continueFromCheckpoint = () => {
    if (!gameOver || hearts <= 0) return false
    hearts -= 1
    hp = LEVEL8_MAX_HP
    gameOver = false
    gameState.over = false
    invulnT = 1.4
    graceT = GRACE_AFTER_RESPAWN
    if (soakingsUsed >= LEVEL8_MAX_SOAKINGS) soakingsUsed = LEVEL8_MAX_SOAKINGS - 1
    respawnAtCheckpoint()
    lastHudSig = ''
    setHud((h) => ({
      ...h,
      gameOver: false,
      level8FailChoice: false,
      failReason: '',
      hp,
      hearts,
      soakingsUsed,
      continueNotice: `Heart used — continue from checkpoint (${hearts} left)`,
      navigatorMessage: navigatorMessage(),
    }))
    return true
  }

  const restartFromScratch = () => {
    const leftover = hearts
    reset()
    hearts = leftover > 0 ? leftover : LEVEL8_START_HEARTS
    lastHudSig = ''
    setHud((h) => ({ ...h, hearts, level8FailChoice: false, failReason: '' }))
  }

  const armCheckpoint = (id) => {
    const cp = LEVEL8_CHECKPOINTS.find((c) => c.id === id)
    if (!cp || activated.has(id)) return
    activated.add(id)
    lastCheckpoint = cp
    city.setCheckpointActive(id, true)
    checkpointFlashAt = Date.now()
    playCoinPickup(1)
  }

  const registerSoak = () => {
    if (respawnMs > 0 || graceT > 0 || gameOver || won) return
    soakingsUsed += 1
    flashT = 0.55
    soakFlashAt = Date.now()
    playIncorrectBuzzer()
    ambient.splash()
    if (dropCrate(beats)) {
      city.setCrateCarrying(false)
      if (carriedCrate) carriedCrate.visible = false
      showPrompt('The crate washed back to the dry pad.')
    }
    if (soakingsUsed >= LEVEL8_MAX_SOAKINGS) {
      syncHud()
      failRun('soak')
      return
    }
    navOverride = {
      text: soakingsUsed === 1 ? LEVEL8_NAVIGATOR.soak1 : LEVEL8_NAVIGATOR.soak2,
      until: performance.now() + 5000,
    }
    clearKeys()
    respawnAtCheckpoint()
  }

  const respawnAtCheckpoint = () => {
    pos.x = lastCheckpoint.x
    pos.z = lastCheckpoint.z
    characterYaw = 0
    graceT = GRACE_AFTER_RESPAWN
    soak.reset()
    snapCamera = true
  }

  const completeLevel = () => {
    if (won) return
    if (neighboursDone(beats) < 3) {
      showPrompt('Check the clinic, school and spaza before you go home.')
      return
    }
    won = true
    gameState.won = true
    playLevelComplete()
    clearPausedRef.current?.()
    const unused = Math.max(0, LEVEL8_MAX_SOAKINGS - soakingsUsed)
    const allTips = tipsCollected >= tipData.length
    const rawMs = Math.round(runElapsedMs)
    const timeMs = Math.max(
      1000,
      rawMs - unused * LEVEL8_SOAK_BONUS_MS - (allTips ? LEVEL8_ALL_TIPS_BONUS_MS : 0)
    )
    const prevBest = sanitizeStoredBest(currentLevelRef.current, Number(highScoreRef.current) || 0)
    const isRecord = prevBest <= 0 || timeMs < prevBest
    const bestTime = isRecord ? timeMs : prevBest
    if (isRecord) {
      try {
        localStorage.setItem(levelHighScoreKey(currentLevelRef.current), String(bestTime))
      } catch {
        // ignore
      }
      highScoreRef.current = bestTime
      void submitBestScore(currentLevelRef.current, timeMs, { lowerIsBetter: true })
      if (!newRecordToastShownRef.current) {
        newRecordToastShownRef.current = true
        queueMicrotask(() => setNewRecordToast(true))
      }
    }
    const winId = Date.now()
    setHud((h) => ({
      ...h,
      levelComplete: true,
      winId,
      coins: tipsCollected,
      tipsCollected,
      runTimeMs: timeMs,
      rawRunTimeMs: rawMs,
      highScore: bestTime,
      soakingsUsed,
      navigatorMessage: LEVEL8_NAVIGATOR.win,
      prompt: '',
    }))
  }

  const tryReadTip = () => {
    const idx = findLevel8TipNear(tipData, pos.x, pos.z)
    if (idx < 0) return false
    const tip = tipData[idx]
    tip.collected = true
    tipsCollected += 1
    playCoinPickup(1)
    const allDone = tipsCollected >= tipData.length
    showPrompt(
      `Note ${tipsCollected}/${tipData.length}: ${tip.fact}` +
        (allDone ? ' — All notes found: −8s bonus.' : ''),
      TIP_PROMPT_HOLD_MS
    )
    return true
  }

  const tryAction = () => {
    if (tryReadTip()) return
    const result = tryInteract(beats, pos.x, pos.z)
    if (!result.kind) return
    showPrompt(result.message, 4800)
    if (result.kind === 'clinic') {
      city.setWaterStage(1)
      armCheckpoint('clinic')
    } else if (result.kind === 'school') {
      city.setWaterStage(2)
      rainLeft = LEVEL8_RAIN_WINDOW_S
      stormLocked = true
      city.setRainHeavy(true)
      armCheckpoint('school')
    } else if (result.kind === 'spaza') {
      city.setWaterStage(3)
      armCheckpoint('spaza')
    }
    carryCrateVisual()
  }

  const refuseCombat = () => {
    if (!active || gameOver || won) return
    showPrompt(LEVEL8_NO_COMBAT_COPY)
  }

  const reset = () => {
    pos.x = PLAYER_START.x
    pos.y = PLAYER_START.y
    pos.z = PLAYER_START.z
    characterYaw = 0
    runElapsedMs = 0
    gameOver = false
    won = false
    gameState.over = false
    gameState.won = false
    soakingsUsed = 0
    hp = LEVEL8_MAX_HP
    hearts = hearts > 0 ? hearts : LEVEL8_START_HEARTS
    invulnT = 0
    failReason = 'soak'
    stormLocked = false
    respawnMs = 0
    graceT = 0
    flashT = 0
    soakFlashAt = 0
    checkpointFlashAt = 0
    tipsCollected = 0
    rainLeft = 0
    lightningT = 0
    sprintingNow = false
    snapCamera = true
    timedPrompt = { text: '', until: 0 }
    navOverride = { text: '', until: 0 }
    activated.clear()
    activated.add('start')
    lastCheckpoint = LEVEL8_CHECKPOINTS[0]
    resetLevel8Beats(beats)
    soak.reset()
    city.resetCheckpoints()
    city.setCheckpointActive('start', true)
    city.setWaterStage(0)
    city.setRainHeavy(false)
    city.setCrateCarrying(false)
    if (carriedCrate) carriedCrate.visible = false
    clearKeys()
    resetLevel8Tips(tipData)
    resetLevel8Coins(coinData, coinMeshes)
    resetLevel8Hearts(heartData)
    lastHudSig = ''
    applyStormLook(false)
    setHud((h) => ({
      ...h,
      gameOver: false,
      levelComplete: false,
      level8FailChoice: false,
      failReason: '',
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      runTimeMs: 0,
      soakingsUsed: 0,
      maxSoakings: LEVEL8_MAX_SOAKINGS,
      hp: LEVEL8_MAX_HP,
      maxHp: LEVEL8_MAX_HP,
      hearts,
      tipsCollected: 0,
      tipsTotal: tipData.length,
      neighboursDone: 0,
      waterStage: 0,
      prompt: '',
      carryingCrate: false,
      sprinting: false,
      rainHeavy: false,
      checkpointFlashAt: 0,
      soakFlashAt: 0,
      navigatorMessage: LEVEL8_NAVIGATOR.spawn,
      nextStreet: `${navStreetGuide(beats).street} · ${navStreetGuide(beats).turn}`,
      distanceToGoal: Math.round(
        Math.hypot(PLAYER_START.x - LEVEL8_ANCHORS.clinic.x, PLAYER_START.z - LEVEL8_ANCHORS.clinic.z)
      ),
    }))
  }

  const setActive = (on) => {
    active = on
    city.group.visible = on
    people.setVisible(on)
    sun.visible = on
    fill.visible = on
    ambientLight.visible = on
    ambient.setActive(on)
    if (on) {
      applyStormLook(stormLocked || rainLeft > 0)
      snapCamera = true
      if (document.pointerLockElement === container) document.exitPointerLock()
    } else {
      clearKeys()
      if (carriedCrate) carriedCrate.visible = false
      camera.fov = 60
      camera.updateProjectionMatrix()
    }
  }

  const onMouseDown = (e) => {
    if (!active || e.button !== 0) return
    refuseCombat()
  }

  const handleKeyDown = (code) => {
    if (!active || gameOver || won) return false
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = true
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = true
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = true
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = true
    if (code === 'Space') refuseCombat()
    if (code === 'KeyE' && !eDown) {
      eDown = true
      tryAction()
    }
    return true
  }

  const handleKeyUp = (code) => {
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = false
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = false
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = false
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = false
    if (code === 'KeyE') eDown = false
  }

  function clearKeys() {
    keys.forward = false
    keys.back = false
    keys.left = false
    keys.right = false
    keys.sprint = false
    eDown = false
  }

  const resolveForward = () => {
    if (keys.back) return -1
    if (keys.forward || autoForwardRef?.current) return 1
    return 0
  }

  const update = (dt, started) => {
    if (!active) return

    flashT = Math.max(0, flashT - dt)
    lightningT = Math.max(0, lightningT - dt)
    invulnT = Math.max(0, invulnT - dt)
    const stormOn = stormLocked || rainLeft > 0
    if (stormLocked) {
      city.setRainHeavy(true)
    } else if (rainLeft > 0) {
      rainLeft = Math.max(0, rainLeft - dt)
      if (rainLeft <= 0) city.setRainHeavy(false)
    }
    let thunderNow = false
    if (stormOn && lightningT <= 0 && Math.random() < dt * 0.72) {
      lightningT = 0.16 + Math.random() * 0.14
      thunderNow = true
    }
    if (scene.background?.isColor) {
      applyStormLook(stormOn)
      if (flashT > 0) scene.background.lerp(FLASH_BLUE, (flashT / 0.55) * 0.5)
      else if (lightningT > 0) scene.background.lerp(new THREE.Color(0xf7fbff), 0.82)
    }
    sun.intensity = lightningT > 0 ? 4.6 : 1.05
    fill.intensity = lightningT > 0 ? 1.35 : 0.55

    city.update(dt)
    billboards.update(dt)
    people.update(dt)
    const t = performance.now() / 1000
    updateLevel8TipMeshes(tipMeshes, tipData, t)
    updateCollectibleInstances(coinMeshes, coinData, t)
    updateLevel8HeartMeshes(heartMeshes, heartData, t)
    carryCrateVisual()

    const frozen = !started || gameOver || won
    if (frozen) {
      sprintingNow = false
      navArrow.update(pos, null, { visible: false, dt })
      ambient.update(dt, {
        rainHeavy: stormOn,
        peopleNear: 99,
        thunder: thunderNow,
      })
      return
    }

    runElapsedMs += dt * 1000
    graceT = Math.max(0, graceT - dt)

    const bark = people.pollBark(pos.x, pos.z, stormOn)
    const honk = people.pollHonk()
    ambient.update(dt, {
      rainHeavy: stormOn,
      peopleNear: people.nearestDistance(pos.x, pos.z),
      honk: Boolean(honk),
      barkKind: bark?.kind ?? null,
      thunder: thunderNow,
    })
    if (bark) showPrompt(bark.text, stormOn ? 3800 : BARK_HOLD_MS)

    if (respawnMs > 0) {
      respawnMs -= dt * 1000
      sprintingNow = false
      if (respawnMs <= 0) {
        respawnMs = 0
        respawnAtCheckpoint()
      }
      syncHud()
      return
    }

    const fwd = resolveForward()
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    let iz = -fwd
    const len = Math.hypot(ix, iz)
    const sample = sampleWater(pos.x, pos.z, city.getWaterStage())
    sprintingNow = false
    if (len > 0) {
      ix /= len
      iz /= len
      sprintingNow = keys.sprint
      let speed = sprintingNow ? LEVEL6_SPRINT_SPEED : LEVEL6_WALK_SPEED
      if (sample.shallow || sample.deep) speed *= LEVEL8_SHALLOW_SPEED
      const resolved = resolvePlayerCollision(pos.x + ix * speed * dt, pos.z + iz * speed * dt)
      pos.x = resolved.x
      pos.z = resolved.z
      characterYaw = Math.atan2(-ix, -iz)
    }
    if (sample.inCurrent) {
      const pushed = resolvePlayerCollision(
        pos.x + sample.currentX * (LEVEL8_CURRENT_PUSH / 5.2) * dt * 0.35,
        pos.z + sample.currentZ * (LEVEL8_CURRENT_PUSH / 5.2) * dt * 0.35
      )
      pos.x = pushed.x
      pos.z = pushed.z
    }

    if (graceT <= 0) {
      const wash = soak.tick(sample, dt)
      if (wash.soaking) {
        sprintingNow = false
        if (wash.washed) registerSoak()
        syncHud()
        return
      }
    }

    const coinPicked = collectLevel8CoinsNearPlayer(coinData, pos.x, pos.z)
    if (coinPicked > 0) {
      playCoinPickup(coinPicked)
      creditWalletRef?.current?.(coinPicked)
    }
    const heartsPicked = collectLevel8HeartsNearPlayer(heartData, pos.x, pos.z)
    if (heartsPicked > 0) {
      hearts += heartsPicked
      playCoinPickup(heartsPicked)
      showPrompt(`Heart token +${heartsPicked} · ${hearts} to continue after a fail`)
    }

    if (invulnT <= 0) {
      const taxiHit = people.hitMovingTaxi(pos.x, pos.z, 2.35)
      if (taxiHit) {
        hp = Math.max(0, hp - LEVEL8_TAXI_DAMAGE)
        invulnT = LEVEL8_INVULN_TIME
        flashT = 0.4
        playIncorrectBuzzer()
        const awayX = pos.x - taxiHit.x || (pos.x >= 0 ? 1 : -1)
        const awayZ = pos.z - taxiHit.z
        const len = Math.max(0.001, Math.hypot(awayX, awayZ))
        const pushed = resolvePlayerCollision(pos.x + (awayX / len) * 2.2, pos.z + (awayZ / len) * 1.1)
        pos.x = pushed.x
        pos.z = pushed.z
        showPrompt(hp > 0 ? 'Taxi hit! Get off the road!' : LEVEL8_TAXI_FAIL_COPY)
        if (hp <= 0) {
          failRun('taxi')
          return
        }
      }
    }

    navArrow.update(pos, navTarget(beats), { dt })

    if (Math.hypot(pos.x - LEVEL8_ANCHORS.home.x, pos.z - LEVEL8_ANCHORS.home.z) < LEVEL8_WIN_RADIUS) {
      completeLevel()
      return
    }

    syncHud()
  }

  const applyCamera = (cam) => {
    const step = getLevel6ViewStep()
    const viewIndex = getLevel6ViewIndex()
    if (cam.fov !== step.fov) {
      cam.fov = step.fov
      cam.updateProjectionMatrix()
    }
    camOffset.copy(CAM_OFFSET).multiplyScalar(step.scale)
    camTarget.set(pos.x, 0, pos.z).add(camOffset)
    if (snapCamera || appliedViewIndex !== viewIndex) {
      cam.position.copy(camTarget)
      appliedViewIndex = viewIndex
      snapCamera = false
    } else {
      cam.position.lerp(camTarget, CAM_LERP)
    }
    camLook.set(pos.x, 0, pos.z).add(CAM_TARGET_OFFSET)
    cam.lookAt(camLook)
  }

  const dispose = () => {
    container.removeEventListener('mousedown', onMouseDown)
    if (carriedCrate && playerRoot) playerRoot.remove(carriedCrate)
    people.dispose()
    decor.dispose()
    ambient.dispose()
    billboards.dispose()
    city.group.remove(tipMeshes.group)
    tipMeshes.dispose()
    city.group.remove(coinMeshes.group)
    disposeCoinMeshes(coinMeshes)
    city.group.remove(heartMeshes.group)
    heartMeshes.dispose()
    navArrow.dispose?.()
    city.dispose()
    scene.remove(sun)
    scene.remove(fill)
    scene.remove(ambientLight)
  }

  container.addEventListener('mousedown', onMouseDown)
  city.group.visible = false
  people.setVisible(false)

  return {
    setActive,
    reset,
    update,
    dispose,
    handleKeyDown,
    handleKeyUp,
    clearKeys,
    applyCamera,
    continueFromCheckpoint,
    restartFromScratch,
    isGameOver: () => gameOver,
    isWon: () => won,
    getPos: () => ({ ...pos }),
    getYaw: () => 0,
    getCharacterYaw: () => characterYaw,
    getPitch: () => 0,
    getSoakingsUsed: () => soakingsUsed,
  }
}
