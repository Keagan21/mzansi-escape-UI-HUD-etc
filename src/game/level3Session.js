// level3Session.js — Open-world Level 3: FPS movement, thugs, Park Station win condition.

import * as THREE from 'three'
import { sanitizeStoredBest, submitBestScore } from './scores.js'
import { levelHighScoreKey } from './storageKeys.js'
import {
  BLOCK,
  STREET_W,
  buildJoburgCbdCity,
  buildParkStationPrecinct,
  computeParkStationPlacement,
  LEVEL3_WORLD_BOUND,
} from './level3City.js'
import {
  buildBillboards,
  LEVEL3_BILLBOARD_ADS,
  spotsFromPlan,
} from './level3Billboards.js'
import { preloadParkStation } from './level3ParkStationAssets.js'
import { PLAYER_FACING_Y, LOW_SPEC_RENDERING, OPEN_WORLD_SHADOW_EXTENT } from './gameConstants.js'
import { playCoinPickup } from './gameAudio.js'
import { resolveForwardAxis } from './movementInput.js'
import {
  clearThugs,
  MAX_THUGS,
  pickThugSpawnPoint,
  preloadLevel3Thugs,
  PUNCH_COOLDOWN,
  spawnThug,
  FIRST_SPAWN_DELAY,
  SPAWN_INTERVAL_MAX,
  SPAWN_INTERVAL_MIN,
  tryPunchThugs,
  updateThugs,
  areLevel3ThugsReady,
} from './level3Thugs.js'
import {
  buildLevel3CoinData,
  collectLevel3CoinsNearPlayer,
  createLevel3CoinMeshes,
  disposeCoinMeshes,
  LEVEL3_BUS_FARE,
  resetLevel3Coins,
  updateCollectibleInstances,
} from './level3Coins.js'
import { createNavArrow } from './navArrow.js'
import { createLevel3Ambient } from './level3Ambient.js'

export const LEVEL3_MAX_HP = 100
export const LEVEL3_PLAYER_HEIGHT = 1.7
export const LEVEL3_MOVE_SPEED = 16
export const LEVEL3_SPRINT_MULT = 1.65
export const LEVEL3_INVULN_TIME = 0.85

const PLAYER_START = { x: 0, y: 1.7, z: 60 }

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
export function createLevel3Session(deps) {
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

  void preloadParkStation()
  void preloadLevel3Thugs()

  const city = buildJoburgCbdCity(scene)
  const parkPlacement = computeParkStationPlacement()
  const parkStation = buildParkStationPrecinct(
    city.group,
    parkPlacement.x,
    parkPlacement.z,
    city.colliders
  )

  // Advertising billboards along CBD streets and the Park Station approach.
  const billboards = buildBillboards(
    city.group,
    spotsFromPlan(BLOCK, STREET_W, [
      ['ns', 0, 1, 1],
      ['ns', 0, 1, -1],
      ['ns', 0, 3, -1],
      ['ns', 0, 4, 1],
      ['ew', 4, -2, 1],
      ['ew', 4, -1, -1],
      ['ns', -2, 3, -1],
      ['ns', 1, 1, 1],
      ['ns', 2, -1, 1],
      ['ew', 0, 2, 1],
      ['ew', -2, 1, -1],
      ['ns', -3, 1, -1],
      ['ns', 1, -3, 1],
      ['ew', 1, -3, 1],
      ['ew', 2, 3, -1],
    ]),
    LEVEL3_BILLBOARD_ADS
  )
  city.colliders.push(...billboards.colliders)

  const cityLife = createLevel3Ambient(city.group, {
    addCollider: (c) => city.colliders.push(c),
  })

  const coinData = buildLevel3CoinData()
  const coinMeshes = createLevel3CoinMeshes(coinData, new THREE.TextureLoader())
  city.group.add(coinMeshes.group)
  const navArrow = createNavArrow(city.group, { color: 0x7dffb0 })

  const sun = new THREE.DirectionalLight(0xffddaa, 2.2)
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
  scene.add(sun)
  scene.add(sun.target)
  scene.add(new THREE.AmbientLight(0x9aa5c9, 0.55))
  scene.add(new THREE.HemisphereLight(0xffdcae, 0x2c2c3a, 0.6))

  /** @type {import('./level3Thugs.js').Thug[]} */
  const thugs = []
  let active = false

  const pos = { ...PLAYER_START }
  let yaw = 0
  let pitch = 0
  // Start facing +Z toward Park Station (see facing math below).
  let characterYaw = Math.PI
  let hp = LEVEL3_MAX_HP
  let invulnT = 0
  let punchT = 0
  let score = 0
  let coins = 0
  let runElapsedMs = 0
  let gameOver = false
  let won = false
  let nextSpawn = 0
  let pointerLocked = false
  let beaconPulse = 0
  let damageFlash = 0
  let lastHudSig = ''

  const keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
  }

  const resolvePlayerCollision = (x, z, radius = 0.45) => {
    let nx = x
    let nz = z
    for (const c of city.colliders) {
      const dx = nx - c.x
      const dz = nz - c.z
      const ox = c.hw + radius - Math.abs(dx)
      const oz = c.hd + radius - Math.abs(dz)
      if (ox > 0 && oz > 0) {
        if (ox < oz) nx += dx > 0 ? ox : -ox
        else nz += dz > 0 ? oz : -oz
      }
    }
    nx = Math.max(-LEVEL3_WORLD_BOUND, Math.min(LEVEL3_WORLD_BOUND, nx))
    nz = Math.max(-LEVEL3_WORLD_BOUND, Math.min(LEVEL3_WORLD_BOUND, nz))
    return { x: nx, z: nz }
  }

  const awardThugDefeated = (count) => {
    if (count <= 0) return
    score += count
    setHud((h) => ({ ...h, score }))
  }

  const onPlayerHit = (damage) => {
    if (invulnT > 0 || gameOver || won) return
    hp = Math.max(0, hp - damage)
    invulnT = LEVEL3_INVULN_TIME
    damageFlash = 0.4 // Screen flash duration
    setHud((h) => ({ ...h, hp, maxHp: LEVEL3_MAX_HP }))
    if (hp <= 0) {
      gameOver = true
      gameState.over = true
      clearPausedRef.current?.()
      setHud((h) => ({ ...h, gameOver: true, hp: 0 }))
      if (document.pointerLockElement === container) {
        document.exitPointerLock()
      }
    }
  }

  const tryPunch = () => {
    if (punchT > 0 || gameOver || won) return
    punchT = PUNCH_COOLDOWN
    const defeated = tryPunchThugs(thugs, pos.x, pos.z, characterYaw - PLAYER_FACING_Y)
    awardThugDefeated(defeated)
  }

  const reset = () => {
    clearThugs(thugs, city.group)
    pos.x = PLAYER_START.x
    pos.y = PLAYER_START.y
    pos.z = PLAYER_START.z
    yaw = 0
    pitch = 0
    characterYaw = Math.PI
    hp = LEVEL3_MAX_HP
    invulnT = 0
    punchT = 0
    score = 0
    coins = 0
    runElapsedMs = 0
    gameOver = false
    won = false
    gameState.over = false
    gameState.won = false
    nextSpawn = performance.now() / 1000 + FIRST_SPAWN_DELAY
    resetLevel3Coins(coinData, coinMeshes)
    recordBaselineRef.current = highScoreRef.current
    newRecordToastShownRef.current = false
    damageFlash = 0
    setHud((h) => ({
      ...h,
      gameOver: false,
      levelComplete: false,
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      runTimeMs: 0,
      hp: LEVEL3_MAX_HP,
      maxHp: LEVEL3_MAX_HP,
    }))
  }

  const setActive = (on) => {
    active = on
    city.group.visible = on
    if (!on) navArrow.setVisible(false)
    if (on) {
      scene.fog = new THREE.FogExp2(0xd9925c, 0.0022)
      scene.background = new THREE.Color(0xd98c52)
      void preloadLevel3Thugs()
      renderer.compile(scene, camera)
    }
  }

  const onPointerLockChange = () => {
    pointerLocked = document.pointerLockElement === container
  }

  const onMouseMove = (e) => {
    if (!pointerLocked || !active || gameOver || won) return
    const sens = 0.0022
    yaw -= e.movementX * sens
    pitch -= e.movementY * sens
    pitch = Math.max(-1.35, Math.min(1.35, pitch))
  }

  const onMouseDown = (e) => {
    if (!active || gameOver || won) return
    if (e.button === 0) {
      if (document.pointerLockElement !== container) {
        container.requestPointerLock?.()
        return
      }
      tryPunch()
    }
  }

  const handleKeyDown = (code) => {
    if (!active || gameOver || won) return false
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = true
    if (code === 'KeyS' || code === 'ArrowDown') keys.back = true
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = true
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.sprint = true
    if (code === 'Space') tryPunch()
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

    beaconPulse += dt * 3
    const beacon = parkStation.group.getObjectByName('park-beacon')
    if (beacon?.material) {
      beacon.material.opacity = 0.45 + Math.sin(beaconPulse) * 0.3
      beacon.rotation.y += dt * 1.2
    }
    
    // Animate beacon rings
    const beaconRing = parkStation.group.getObjectByName('park-beacon-ring')
    if (beaconRing) {
      beaconRing.rotation.z += dt * 0.8
      beaconRing.material.opacity = 0.4 + Math.sin(beaconPulse * 1.5) * 0.2
    }
    
    const beaconRing2 = parkStation.group.getObjectByName('park-beacon-ring-2')
    if (beaconRing2) {
      beaconRing2.rotation.z -= dt * 0.6
      beaconRing2.material.opacity = 0.3 + Math.sin(beaconPulse * 1.2) * 0.15
    }

    billboards.update(dt)
    cityLife.update(dt)

    // Update damage flash
    damageFlash = Math.max(0, damageFlash - dt)

    // Apply screen flash effect when damaged
    if (damageFlash > 0) {
      const flashIntensity = damageFlash / 0.4
      const baseColor = new THREE.Color(0xd98c52)
      const flashColor = new THREE.Color(0xff0000)
      scene.background.copy(baseColor).lerp(flashColor, flashIntensity * 0.3)
      
      if (scene.fog) {
        const baseFogColor = new THREE.Color(0xd9925c)
        scene.fog.color.copy(baseFogColor).lerp(flashColor, flashIntensity * 0.2)
      }
    } else {
      scene.background.setHex(0xd98c52)
      if (scene.fog) {
        scene.fog.color.setHex(0xd9925c)
      }
    }

    if (!started || gameOver || won) {
      navArrow.setVisible(false)
      return
    }

    runElapsedMs += dt * 1000

    invulnT = Math.max(0, invulnT - dt)
    punchT = Math.max(0, punchT - dt)

    // GTA-style controls: A/D rotate character, W/S move forward/back relative to character
    const rotationSpeed = 3.5 // How fast A/D rotates character
    const fwd = resolveForwardAxis(keys, Boolean(autoForwardRef?.current))
    const rotation = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    
    let spd = LEVEL3_MOVE_SPEED * (keys.sprint ? LEVEL3_SPRINT_MULT : 1)

    // A/D turn the character; negate so D = right, A = left (Three.js +Y is CCW).
    if (Math.abs(rotation) > 0.01) {
      characterYaw -= rotation * rotationSpeed * dt
    }

    // Travel direction matches avatar facing (open-world model has no runner 180° prep).
    let mx = -Math.sin(characterYaw) * fwd * spd * dt
    let mz = -Math.cos(characterYaw) * fwd * spd * dt

    const resolved = resolvePlayerCollision(pos.x + mx, pos.z + mz)
    pos.x = resolved.x
    pos.z = resolved.z
    sun.position.set(pos.x - 80, 180, pos.z - 50)
    sun.target.position.set(pos.x, 0, pos.z)
    sun.target.updateMatrixWorld()

    const t = performance.now() / 1000
    if (!areLevel3ThugsReady()) void preloadLevel3Thugs()
    if (t > nextSpawn && thugs.length < MAX_THUGS) {
      const spawn = pickThugSpawnPoint(pos.x, pos.z, city.colliders, yaw)
      const thug = spawnThug(city.group, spawn.x, spawn.z, spawn.type)
      let spawned = 0
      if (thug) {
        thugs.push(thug)
        spawned = 1
      }
      nextSpawn =
        spawned > 0
          ? t + SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN)
          : t + 0.4
    }

    updateThugs(thugs, {
      px: pos.x,
      pz: pos.z,
      colliders: city.colliders,
      dt,
      onPlayerHit,
      playerInvuln: invulnT > 0,
      scene: city.group,
    })

    const picked = collectLevel3CoinsNearPlayer(coinData, pos.x, pos.z)
    if (picked > 0) {
      playCoinPickup(picked)
      coins += picked
      creditWalletRef?.current?.(picked)
      setHud((h) => ({ ...h, coins }))
    }
    updateCollectibleInstances(coinMeshes, coinData, t)

    const distToStation = parkStation.getDistanceToGoal(pos.x, pos.z)
    const goal = parkStation.getGoalCenter()
    navArrow.update(pos, goal, { dt, yaw })
    const atStation = parkStation.isAtGoal(pos.x, pos.z)
    let busFareNeeded = 0
    if (atStation) {
      if (coins >= LEVEL3_BUS_FARE) {
        won = true
        gameState.won = true
        clearPausedRef.current?.()
        const timeMs = Math.max(1, Math.round(runElapsedMs))
        let prevBest = sanitizeStoredBest(
          currentLevelRef.current,
          Number(highScoreRef.current) || 0
        )
        const isRecord = prevBest <= 0 || timeMs < prevBest
        const bestTime = isRecord ? timeMs : prevBest
        if (isRecord) {
          try {
            localStorage.setItem(
              levelHighScoreKey(currentLevelRef.current),
              String(bestTime)
            )
          } catch {
            // ignore
          }
          highScoreRef.current = bestTime
          void submitBestScore(currentLevelRef.current, bestTime, {
            lowerIsBetter: true,
          })
          if (!newRecordToastShownRef.current) {
            newRecordToastShownRef.current = true
            queueMicrotask(() => setNewRecordToast(true))
          }
        }
        setHud((h) => ({
          ...h,
          levelComplete: true,
          coins,
          busFareNeeded: 0,
          runTimeMs: timeMs,
          highScore: bestTime,
        }))
        if (document.pointerLockElement === container) {
          document.exitPointerLock()
        }
      } else {
        busFareNeeded = LEVEL3_BUS_FARE - coins
      }
    }

    const distHud = Math.round(distToStation)
    const timeHud = Math.round(runElapsedMs)
    const hudSig = `${hp}|${coins}|${busFareNeeded}|${timeHud}|${distHud}`
    if (hudSig !== lastHudSig) {
      lastHudSig = hudSig
      setHud((h) => ({
        ...h,
        hp,
        maxHp: LEVEL3_MAX_HP,
        coins,
        busFareNeeded,
        runTimeMs: timeHud,
        distanceToGoal: distHud,
      }))
    }
  }

  const dispose = () => {
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    container.removeEventListener('mousemove', onMouseMove)
    container.removeEventListener('mousedown', onMouseDown)
    clearThugs(thugs, city.group)
    city.group.remove(coinMeshes.group)
    disposeCoinMeshes(coinMeshes)
    navArrow.dispose()
    billboards.dispose()
    cityLife.dispose()
    parkStation.group.userData.cancelParkStationLoad?.()
    city.dispose()
    scene.remove(sun.target)
    scene.remove(sun)
    if (document.pointerLockElement === container) {
      document.exitPointerLock()
    }
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
    getParkStation: () => parkStation.getGoalCenter(),
  }
}
