// level6Session.js — Open-world Level 6: Cape Flats stealth maze (third-person, no combat).

import * as THREE from 'three'
import { getLevel6ViewIndex, getLevel6ViewStep } from './level6View.js'
import {
  buildCapeFlatsCity,
  LEVEL6_ANCHORS,
  LEVEL6_CHECKPOINT_RADIUS,
  LEVEL6_CHECKPOINTS as CITY_CHECKPOINTS,
  LEVEL6_WORLD_BOUNDS,
} from './level6City.js'
import {
  alertLevel6Threat,
  calmLevel6Threats,
  createLevel6Threats,
  detectPlayer,
  disposeLevel6Threats,
  LEVEL6_CROUCH_VISION_RANGE,
  LEVEL6_VISION_RANGE,
  nearestThreatDistance,
  preloadLevel6Threats,
  resetLevel6Threats,
  setLevel6ThreatsVisible,
  updateLevel6Threats,
} from './level6Threats.js'
import {
  buildLevel6CoinData,
  buildLevel6TipData,
  collectLevel6CoinsNearPlayer,
  createLevel6CoinMeshes,
  createLevel6TipMeshes,
  disposeCoinMeshes,
  findLevel6TipNear,
  LEVEL6_ALL_TIPS_BONUS_MS,
  resetLevel6Coins,
  resetLevel6Tips,
  updateCollectibleInstances,
  updateLevel6TipMeshes,
} from './level6Collectibles.js'
import { playCoinPickup, playIncorrectBuzzer, playLevelComplete } from './gameAudio.js'
import { createNavArrow } from './navArrow.js'
import { sanitizeStoredBest, submitBestScore } from './scores.js'
import { levelHighScoreKey } from './storageKeys.js'
import {
  LEVEL6_CROUCH_SPEED,
  LEVEL6_MAX_STRIKES as MAX_STRIKES_CONST,
  LEVEL6_RESPAWN_DELAY as RESPAWN_DELAY_CONST,
  LEVEL6_SPRINT_SPEED,
  LEVEL6_WALK_SPEED,
} from './gameConstants.js'

export const LEVEL6_MAX_STRIKES = MAX_STRIKES_CONST
/** ms before respawn at the last checkpoint. */
export const LEVEL6_RESPAWN_DELAY = RESPAWN_DELAY_CONST
export { LEVEL6_WALK_SPEED, LEVEL6_CROUCH_SPEED, LEVEL6_SPRINT_SPEED }
export const LEVEL6_CHECKPOINTS = CITY_CHECKPOINTS
export const LEVEL6_PLAYER_HEIGHT = 1.7
/** Bonus per unused strike, subtracted from the run time on a win. */
export const LEVEL6_STRIKE_BONUS_MS = 15000
export const LEVEL6_WIN_RADIUS = 12

export const LEVEL6_GAME_OVER_COPY = 'You were found. The Cape Flats took you.'
export const LEVEL6_NO_COMBAT_COPY = "You can't fight your way out of this one."

export const LEVEL6_NAVIGATOR = {
  spawn: 'Stay hidden. Reach the Thuthuzela Care Centre.',
  checkpoint1: 'Good. Keep moving. Watch the patrol patterns.',
  checkpoint2: 'Halfway there. The next zone is tighter — crouch when unsure.',
  checkpoint3: "Almost. One more stretch. Don't rush it.",
  strike1: 'Close call. Stay in the shadows.',
  strike2: "One more and it's over. Be smart.",
  nearThreat: 'Danger close. Stop moving.',
  win: 'You made it. You are safe now.',
}

const CAM_OFFSET = new THREE.Vector3(0, 5.5, 10)
const CAM_OFFSET_CROUCH = new THREE.Vector3(0, 3.5, 9)
const CAM_TARGET_OFFSET = new THREE.Vector3(0, 1.7, 0)
const CAM_LERP = 0.12
const CROUCH_SCALE_Y = 0.55
const GRACE_AFTER_RESPAWN = 1.5
const NEAR_THREAT_RANGE = 10
const STRIKE_NAV_HOLD_MS = 5000
const PROMPT_HOLD_MS = 4200
const TIP_PROMPT_HOLD_MS = 7000
/** HUD flash lifetimes — cleared afterwards so a pause/resume doesn't replay them. */
const CHECKPOINT_FLASH_MS = 2200
const STRIKE_FLASH_MS = 900
const SKY = 0x080c14
const FLASH_RED = new THREE.Color(0xff0000)

const PLAYER_START = {
  x: LEVEL6_ANCHORS.spawn.x,
  y: LEVEL6_PLAYER_HEIGHT,
  z: LEVEL6_ANCHORS.spawn.z,
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
 *   playerRoot?: THREE.Object3D
 * }} deps
 */
export function createLevel6Session(deps) {
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

  const city = buildCapeFlatsCity(scene)
  const navArrow = createNavArrow(city.group, { color: 0x44ff88 })
  const threats = createLevel6Threats(city.group)
  const tipData = buildLevel6TipData()
  const tipMeshes = createLevel6TipMeshes(tipData)
  city.group.add(tipMeshes.group)
  const coinData = buildLevel6CoinData()
  const coinMeshes = createLevel6CoinMeshes(coinData, new THREE.TextureLoader())
  city.group.add(coinMeshes.group)

  const moon = new THREE.DirectionalLight(0x6a7fa8, 0.22)
  moon.position.set(-60, 120, 80)
  const ambient = new THREE.AmbientLight(0x8090b0, 0.06)
  const hemi = new THREE.HemisphereLight(0x223355, 0x1a140c, 0.1)
  /** Faint cool glow around the player so the silhouette reads against the sand. */
  const playerGlow = new THREE.PointLight(0x9fb4ff, 0.7, 9, 1.6)
  moon.visible = false
  ambient.visible = false
  hemi.visible = false
  playerGlow.visible = false
  scene.add(moon, moon.target, ambient, hemi, playerGlow)

  let active = false
  const pos = { ...PLAYER_START }
  let characterYaw = 0
  let runElapsedMs = 0
  let gameOver = false
  let won = false
  let strikesUsed = 0
  let respawnMs = 0
  let graceT = 0
  let flashT = 0
  let strikeFlashAt = 0
  let checkpointFlashAt = 0
  let tipsCollected = 0
  let crouchToggle = false
  let crouchHeld = false
  let cKeyDown = false
  let crouchBlend = 0
  let snapCamera = true
  let sprintingNow = false
  let movingNow = false
  let appliedViewIndex = getLevel6ViewIndex()
  /** @type {{ text: string, until: number }} */
  let timedPrompt = { text: '', until: 0 }
  /** @type {{ text: string, until: number }} */
  let navOverride = { text: '', until: 0 }
  const activated = new Set(['start'])
  let lastCheckpoint = LEVEL6_CHECKPOINTS[0]
  let furthestCheckpoint = 0

  const keys = { forward: false, back: false, left: false, right: false, sprint: false }
  const camTarget = new THREE.Vector3()
  const camLook = new THREE.Vector3()
  const camOffset = new THREE.Vector3()

  const isCrouching = () => crouchToggle || crouchHeld

  const applyNightLook = () => {
    scene.fog = new THREE.FogExp2(0x0c1018, 0.022)
    scene.background = new THREE.Color(SKY)
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
    nx = Math.max(LEVEL6_WORLD_BOUNDS.minX, Math.min(LEVEL6_WORLD_BOUNDS.maxX, nx))
    nz = Math.max(LEVEL6_WORLD_BOUNDS.minZ, Math.min(LEVEL6_WORLD_BOUNDS.maxZ, nz))
    return { x: nx, z: nz }
  }

  const level6NavTarget = () =>
    LEVEL6_CHECKPOINTS[furthestCheckpoint + 1] ?? LEVEL6_ANCHORS.careCentre

  const navigatorMessage = () => {
    if (won) return LEVEL6_NAVIGATOR.win
    if (navOverride.text && performance.now() < navOverride.until) return navOverride.text
    if (nearestThreatDistance(threats, pos.x, pos.z) < NEAR_THREAT_RANGE) {
      return LEVEL6_NAVIGATOR.nearThreat
    }
    if (furthestCheckpoint >= 3) return LEVEL6_NAVIGATOR.checkpoint3
    if (furthestCheckpoint === 2) return LEVEL6_NAVIGATOR.checkpoint2
    if (furthestCheckpoint === 1) return LEVEL6_NAVIGATOR.checkpoint1
    return LEVEL6_NAVIGATOR.spawn
  }

  const currentPrompt = () => {
    if (timedPrompt.text && performance.now() < timedPrompt.until) return timedPrompt.text
    if (respawnMs > 0) return 'Spotted — pulling back to the last checkpoint…'
    if (findLevel6TipNear(tipData, pos.x, pos.z) >= 0) return 'E — read the community note'
    return ''
  }

  let lastHudSig = ''
  const syncHud = () => {
    const now = Date.now()
    if (checkpointFlashAt && now - checkpointFlashAt > CHECKPOINT_FLASH_MS) checkpointFlashAt = 0
    if (strikeFlashAt && now - strikeFlashAt > STRIKE_FLASH_MS) strikeFlashAt = 0
    const goal = LEVEL6_ANCHORS.careCentre
    const distanceToGoal = Math.round(Math.hypot(pos.x - goal.x, pos.z - goal.z))
    const timeHud = Math.floor(runElapsedMs / 100) * 100
    const nav = navigatorMessage()
    const prompt = currentPrompt()
    const crouching = isCrouching()
    const sig = [
      strikesUsed,
      nav,
      prompt,
      crouching,
      sprintingNow,
      timeHud,
      distanceToGoal,
      tipsCollected,
      checkpointFlashAt,
      strikeFlashAt,
    ].join('|')
    if (sig === lastHudSig) return
    lastHudSig = sig
    setHud((h) => ({
      ...h,
      strikesUsed,
      maxStrikes: LEVEL6_MAX_STRIKES,
      navigatorMessage: nav,
      prompt,
      crouching,
      sprinting: sprintingNow,
      runTimeMs: timeHud,
      distanceToGoal,
      tipsCollected,
      tipsTotal: tipData.length,
      coins: tipsCollected,
      checkpointFlashAt,
      strikeFlashAt,
    }))
  }

  const failRun = () => {
    gameOver = true
    gameState.over = true
    clearPausedRef.current?.()
    setHud((h) => ({
      ...h,
      gameOver: true,
      strikesUsed,
      maxStrikes: LEVEL6_MAX_STRIKES,
      navigatorMessage: LEVEL6_GAME_OVER_COPY,
      coins: tipsCollected,
    }))
  }

  /** @param {import('./level6Threats.js').Threat} [threat] */
  const registerStrike = (threat) => {
    if (respawnMs > 0 || graceT > 0 || gameOver || won) return
    strikesUsed += 1
    flashT = 0.6
    strikeFlashAt = Date.now()
    if (threat) alertLevel6Threat(threat, pos)
    playIncorrectBuzzer()
    if (strikesUsed >= LEVEL6_MAX_STRIKES) {
      syncHud()
      failRun()
      return
    }
    respawnMs = LEVEL6_RESPAWN_DELAY
    navOverride = {
      text: strikesUsed === 1 ? LEVEL6_NAVIGATOR.strike1 : LEVEL6_NAVIGATOR.strike2,
      until: performance.now() + LEVEL6_RESPAWN_DELAY + STRIKE_NAV_HOLD_MS,
    }
    clearKeys()
  }

  const respawnAtCheckpoint = () => {
    pos.x = lastCheckpoint.x
    pos.z = lastCheckpoint.z
    characterYaw = 0
    graceT = GRACE_AFTER_RESPAWN
    calmLevel6Threats(threats)
    snapCamera = true
  }

  const updateCheckpoints = () => {
    LEVEL6_CHECKPOINTS.forEach((cp, i) => {
      if (activated.has(cp.id)) return
      if (Math.hypot(pos.x - cp.x, pos.z - cp.z) > LEVEL6_CHECKPOINT_RADIUS) return
      activated.add(cp.id)
      lastCheckpoint = cp
      furthestCheckpoint = Math.max(furthestCheckpoint, i)
      city.setCheckpointActive(cp.id, true)
      checkpointFlashAt = Date.now()
      navOverride = { text: '', until: 0 }
      playCoinPickup(1)
    })
  }

  const completeLevel = () => {
    if (won) return
    won = true
    gameState.won = true
    playLevelComplete()
    clearPausedRef.current?.()
    const unusedStrikes = Math.max(0, LEVEL6_MAX_STRIKES - strikesUsed)
    const allTips = tipsCollected >= tipData.length
    const rawMs = Math.round(runElapsedMs)
    const timeMs = Math.max(
      1000,
      rawMs - unusedStrikes * LEVEL6_STRIKE_BONUS_MS - (allTips ? LEVEL6_ALL_TIPS_BONUS_MS : 0)
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
      void submitBestScore(currentLevelRef.current, bestTime, { lowerIsBetter: true })
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
      strikesUsed,
      navigatorMessage: LEVEL6_NAVIGATOR.win,
      prompt: '',
    }))
  }

  const tryReadTip = () => {
    const idx = findLevel6TipNear(tipData, pos.x, pos.z)
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

  const refuseCombat = () => {
    if (!active || gameOver || won) return
    showPrompt(LEVEL6_NO_COMBAT_COPY)
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
    strikesUsed = 0
    respawnMs = 0
    graceT = 0
    flashT = 0
    strikeFlashAt = 0
    checkpointFlashAt = 0
    tipsCollected = 0
    crouchToggle = false
    crouchHeld = false
    cKeyDown = false
    crouchBlend = 0
    sprintingNow = false
    movingNow = false
    snapCamera = true
    timedPrompt = { text: '', until: 0 }
    navOverride = { text: '', until: 0 }
    activated.clear()
    activated.add('start')
    lastCheckpoint = LEVEL6_CHECKPOINTS[0]
    furthestCheckpoint = 0
    city.resetCheckpoints()
    city.setCheckpointActive('start', true)
    clearKeys()
    resetLevel6Threats(threats)
    resetLevel6Tips(tipData)
    resetLevel6Coins(coinData, coinMeshes)
    if (playerRoot) playerRoot.scale.set(1, 1, 1)
    lastHudSig = ''
    setHud((h) => ({
      ...h,
      gameOver: false,
      levelComplete: false,
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      runTimeMs: 0,
      strikesUsed: 0,
      maxStrikes: LEVEL6_MAX_STRIKES,
      tipsCollected: 0,
      tipsTotal: tipData.length,
      prompt: '',
      promptDock: 'inline',
      crouching: false,
      sprinting: false,
      checkpointFlashAt: 0,
      strikeFlashAt: 0,
      navigatorMessage: LEVEL6_NAVIGATOR.spawn,
      distanceToGoal: Math.round(
        Math.hypot(
          PLAYER_START.x - LEVEL6_ANCHORS.careCentre.x,
          PLAYER_START.z - LEVEL6_ANCHORS.careCentre.z
        )
      ),
    }))
  }

  const setActive = (on) => {
    active = on
    city.group.visible = on
    setLevel6ThreatsVisible(threats, on)
    moon.visible = on
    ambient.visible = on
    hemi.visible = on
    playerGlow.visible = on
    if (on) {
      applyNightLook()
      snapCamera = true
      if (document.pointerLockElement === container) document.exitPointerLock()
      void preloadLevel6Threats()
    } else {
      clearKeys()
      navArrow.setVisible(false)
      if (playerRoot) playerRoot.scale.set(1, 1, 1)
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
    if (code === 'ControlLeft' || code === 'ControlRight') crouchHeld = true
    if (code === 'KeyC' && !cKeyDown) {
      cKeyDown = true
      crouchToggle = !crouchToggle
    }
    if (code === 'Space') refuseCombat()
    if (code === 'KeyE') tryReadTip()
    return true
  }

  const handleKeyUp = (code) => {
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = false
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = false
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = false
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = false
    if (code === 'ControlLeft' || code === 'ControlRight') crouchHeld = false
    if (code === 'KeyC') cKeyDown = false
  }

  function clearKeys() {
    keys.forward = false
    keys.back = false
    keys.left = false
    keys.right = false
    keys.sprint = false
    crouchHeld = false
    cKeyDown = false
  }

  /**
   * @param {number} dt
   * @param {boolean} started
   */
  const update = (dt, started) => {
    if (!active) return

    flashT = Math.max(0, flashT - dt)
    if (scene.background?.isColor) {
      scene.background.setHex(SKY)
      if (flashT > 0) scene.background.lerp(FLASH_RED, (flashT / 0.6) * 0.45)
    }

    const crouching = isCrouching()
    crouchBlend += ((crouching ? 1 : 0) - crouchBlend) * Math.min(1, dt * 10)
    if (playerRoot) playerRoot.scale.set(1, 1 - (1 - CROUCH_SCALE_Y) * crouchBlend, 1)
    playerGlow.position.set(pos.x, 2.4, pos.z + 1.5)
    moon.target.position.set(pos.x, 0, pos.z)
    moon.target.updateMatrixWorld()

    const t = performance.now() / 1000
    city.update(dt)
    updateLevel6TipMeshes(tipMeshes, tipData, t)
    updateCollectibleInstances(coinMeshes, coinData, t)

    const frozen = !started || gameOver || won
    updateLevel6Threats(threats, {
      dt: frozen ? 0 : dt,
      blockers: city.blockers,
      coneRange: crouching ? LEVEL6_CROUCH_VISION_RANGE : LEVEL6_VISION_RANGE,
      frozen: respawnMs > 0,
    })

    if (frozen) {
      movingNow = false
      sprintingNow = false
      navArrow.setVisible(false)
      return
    }

    runElapsedMs += dt * 1000
    graceT = Math.max(0, graceT - dt)

    if (respawnMs > 0) {
      respawnMs -= dt * 1000
      movingNow = false
      sprintingNow = false
      navArrow.update(pos, level6NavTarget(), { dt, yaw: Math.PI })
      if (respawnMs <= 0) {
        respawnMs = 0
        respawnAtCheckpoint()
      }
      syncHud()
      return
    }

    // Camera never rotates, so W is always -Z (toward the Care Centre).
    const fwd = resolveForward()
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    let iz = -fwd
    const len = Math.hypot(ix, iz)
    const prevX = pos.x
    const prevZ = pos.z
    sprintingNow = false
    if (len > 0) {
      ix /= len
      iz /= len
      sprintingNow = keys.sprint && !crouching
      const speed = crouching
        ? LEVEL6_CROUCH_SPEED
        : sprintingNow
          ? LEVEL6_SPRINT_SPEED
          : LEVEL6_WALK_SPEED
      const resolved = resolvePlayerCollision(pos.x + ix * speed * dt, pos.z + iz * speed * dt)
      pos.x = resolved.x
      pos.z = resolved.z
      characterYaw = Math.atan2(-ix, -iz)
    }
    movingNow = Math.hypot(pos.x - prevX, pos.z - prevZ) > 0.002

    updateCheckpoints()

    const coinPicked = collectLevel6CoinsNearPlayer(coinData, pos.x, pos.z)
    if (coinPicked > 0) {
      playCoinPickup(coinPicked)
      creditWalletRef?.current?.(coinPicked)
    }

    if (graceT <= 0) {
      const player = {
        x: pos.x,
        z: pos.z,
        crouching,
        sprinting: sprintingNow,
        moving: movingNow,
      }
      for (const threat of threats) {
        if (detectPlayer(threat, player, city.blockers)) {
          registerStrike(threat)
          break
        }
      }
      if (gameOver) return
    }

    const goal = LEVEL6_ANCHORS.careCentre
    navArrow.update(pos, level6NavTarget(), { dt, yaw: Math.PI })
    if (Math.hypot(pos.x - goal.x, pos.z - goal.z) < LEVEL6_WIN_RADIUS) {
      completeLevel()
      return
    }

    syncHud()
  }

  const resolveForward = () => {
    if (keys.back) return -1
    if (keys.forward || autoForwardRef?.current) return 1
    return 0
  }

  /** Fixed-angle follow camera; called by the engine instead of its chase cam. */
  const applyCamera = (cam) => {
    const step = getLevel6ViewStep()
    const viewIndex = getLevel6ViewIndex()
    if (cam.fov !== step.fov) {
      cam.fov = step.fov
      cam.updateProjectionMatrix()
    }
    camOffset.copy(CAM_OFFSET).lerp(CAM_OFFSET_CROUCH, crouchBlend).multiplyScalar(step.scale)
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
    navArrow.dispose()
    container.removeEventListener('mousedown', onMouseDown)
    disposeLevel6Threats(threats, city.group)
    city.group.remove(tipMeshes.group)
    tipMeshes.dispose()
    city.group.remove(coinMeshes.group)
    disposeCoinMeshes(coinMeshes)
    city.dispose()
    scene.remove(moon.target)
    scene.remove(moon)
    scene.remove(ambient)
    scene.remove(hemi)
    scene.remove(playerGlow)
    playerGlow.dispose()
    if (playerRoot) playerRoot.scale.set(1, 1, 1)
  }

  container.addEventListener('mousedown', onMouseDown)
  city.group.visible = false
  setLevel6ThreatsVisible(threats, false)

  return {
    setActive,
    reset,
    update,
    dispose,
    handleKeyDown,
    handleKeyUp,
    clearKeys,
    registerStrike,
    applyCamera,
    isGameOver: () => gameOver,
    isWon: () => won,
    isCrouching,
    getPos: () => ({ ...pos }),
    getYaw: () => 0,
    getCharacterYaw: () => characterYaw,
    getPitch: () => 0,
    getStrikesUsed: () => strikesUsed,
  }
}
