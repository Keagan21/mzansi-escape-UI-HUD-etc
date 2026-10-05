// useRoadSceneEngine.js — Three.js scene setup, loaders, RAF loop, input, cleanup.

import { useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import {
  findFirstSkinnedMesh,
  findHipsBone,
  pinHipsXZ,
  pickLocomotionClip,
  pickRunClip,
  rebaseClipOntoBindPose,
  retargetClipToBones,
  retargetClipToRoot,
  retargetClipWorldSpace,
  rigRestDiffers,
  stripHipRootMotion,
  canonicalBoneKey,
} from '../mixamoAnimation.js'
import {
  CHARACTERS,
  KENNEY_RUN_FBX,
} from './characterAssets.js'
import { playCoinPickup, playRandomHonk } from './gameAudio.js'
import { submitBestScore } from './scores.js'
import { levelHighScoreKey } from './storageKeys.js'
import { resolveForwardAxis } from './movementInput.js'
import {
  applyLimbRunGait,
  LANE_STRAFE_FOR_RUN_EPS,
  proceduralRunState,
} from './limbRig.js'
import {
  CAM_H,
  CAM_LOOK_AHEAD_Z,
  CAM_Z_OFFSET,
  GRAVITY,
  JUMP_VELOCITY,
  LANES,
  LANE_SMOOTH,
  LEVEL_END_Z,
  LEVEL2_WALLET_COIN_COUNT,
  LOW_SPEC_RENDERING,
  MOVE_SPEED,
  PLAYER_FACING_Y,
  PLAYER_START_Z,
  POTHOLE_CLEAR_Y,
  POTHOLE_IGNORE_SLOW_VY,
  POTHOLE_SLOW_MULT,
  ROAD_LEN,
  ROLL_DURATION,
  TAXI_HIT_RX,
  TAXI_HIT_RZ,
  TAXI_SPAWN_MAX,
  TAXI_SPAWN_MIN,
  TAXI_SPEED,
  LEVEL2_CRASH_CONTINUE_COST,
} from './gameConstants.js'
import { buildPotholeData, createPotholeMeshes, disposePotholeMeshes } from './potholes.js'
import {
  buildCoinData,
  collectCoinsNearPlayer,
  createCoinMeshes,
  createCokeCollectibleMeshes,
  createEmptyCokeCollectibleMeshes,
  disposeCoinMeshes,
  updateCollectibleInstances,
} from './coins.js'
import { createCokeCollectibleAssetLoader } from './level2CokeCollectible.js'
import { buildStaticRoad } from './staticRoad.js'
import { disposeGeometries, disposeObject3D } from './threeDispose.js'
import { prepareOpenWorldPlayerModel, preparePlayerModel, prepareSowetoTowerModel } from './modelPrep.js'
import { spawnTaxi } from './taxiSpawner.js'
import { createCorridorManager } from './corridorManager.js'
import { ensureBuildingsLoaded } from '../BuildingFactory.js'
import { setNextLevelSignText } from './roadSign.js'
import { getLevelConfig } from './levels.js'
import { carMotionOffset, createPlayerCar } from './playerCar.js'
import {
  createLevel2CarInstance,
  disposeLevel2CarCache,
  isLevel2CarCached,
  preloadAllLevel2Cars,
  preloadLevel2Car as preloadLevel2CarAsset,
  whenLevel2CarReady,
} from './level2CarCache.js'
import {
  disposeLevel2HazardCarCache,
  getLevel2HazardCarTemplates,
  preloadAllLevel2HazardCars,
} from './level2HazardCarCache.js'
import {
  disposeTaxiCache,
  getTaxiTemplate,
  preloadTaxi,
} from './level1TaxiCache.js'
import { createLevel1TaxiAssetLoader } from './level1TaxiHazards.js'
import { spawnObstacle } from './obstacleSpawner.js'
import { createLevel3Session } from './level3Session.js'
import { createLevel4Session } from './level4Session.js'
import { createLevel5Session } from './level5Session.js'
import { createLevel6Session } from './level6Session.js'
import { createLevel8Session } from './level8Session.js'

export function useRoadSceneEngine({
  containerRef,
  gameStartedRef,
  playStartedRef,
  applyPlayerCharacterRef,
  applyPlayerForCurrentLevelRef,
  threeResetGameRef,
  setPausedRef,
  clearPausedRef,
  clearMovementKeysRef,
  pausedRef,
  levelBriefingOpenRef,
  dismissLevelBriefingRef,
  level6WarningOpenRef,
  confirmLevel6WarningRef,
  highScoreRef,
  recordBaselineRef,
  newRecordToastShownRef,
  menuScreenRef,
  currentLevelRef,
  selectedCharacterIdRef,
  selectedLevel2CarIdRef,
  preloadLevel2CarRef,
  startFromMenuRef,
    setHud,
    setPlayStarted,
    setMenuScreen,
    setNewRecordToast,
    playValveHintRef,
    level8FailActionsRef,
    creditWalletRef,
    autoForwardRef,
}) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x7a9ebc)
    scene.fog = new THREE.Fog(0x7a9ebc, 18, 620)

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      3000
    )

    const renderer = new THREE.WebGLRenderer({
      antialias: !LOW_SPEC_RENDERING,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(
      LOW_SPEC_RENDERING
        ? Math.min(window.devicePixelRatio, 1)
        : Math.min(window.devicePixelRatio, 1.25)
    )
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = LOW_SPEC_RENDERING
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    container.tabIndex = 0
    container.focus({ preventScroll: true })

    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a4a, 1.05)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(10, 30, 8)
    sun.castShadow = true
    const shadowMapSize = LOW_SPEC_RENDERING ? 512 : 1024
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 500
    sun.shadow.camera.left = -20
    sun.shadow.camera.right = 20
    sun.shadow.camera.top = 25
    sun.shadow.camera.bottom = -5
    scene.add(sun)

    const m = {
      asphalt: new THREE.MeshStandardMaterial({
        color: 0x2a2a30,
        roughness: 0.9,
        metalness: 0.05,
      }),
      line: new THREE.MeshStandardMaterial({
        color: 0xf0f0ea,
        roughness: 0.4,
      }),
      rail: new THREE.MeshStandardMaterial({
        color: 0x3a3a45,
        roughness: 0.5,
        metalness: 0.35,
      }),
      grass: new THREE.MeshStandardMaterial({
        color: 0x2f5a32,
        roughness: 0.95,
      }),
    }
    const envMaterials = {
      pole: new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.75,
      }),
      wire: new THREE.LineBasicMaterial({ color: 0x111111 }),
      crate: new THREE.MeshStandardMaterial({
        color: 0x8b6914,
        roughness: 0.9,
      }),
      umbrella: new THREE.MeshStandardMaterial({
        color: 0xe63946,
        roughness: 0.72,
      }),
    }

    const staticRoad = new THREE.Group()
    buildStaticRoad(staticRoad, m)
    staticRoad.position.set(0, 0, -ROAD_LEN / 2)
    scene.add(staticRoad)

    let corridor = {
      group: new THREE.Group(),
      reset() {},
      update() {},
      dispose() {
        scene.remove(this.group)
      },
    }
    scene.add(corridor.group)
    void ensureBuildingsLoaded()
      .then(() => {
        if (cancelled) return
        scene.remove(corridor.group)
        corridor = createCorridorManager(
          scene,
          envMaterials,
          getLevelConfig(currentLevelRef.current).buildingTheme ?? 'soweto'
        )
        const levelConfig = getLevelConfig(currentLevelRef.current)
        corridor.group.visible = levelConfig.playerKind !== 'openworld'
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[Corridor] Failed to load shop GLBs', err)
        }
      })
    const sowetoTowers = new THREE.Group()
    scene.add(sowetoTowers)
    const towerLoader = new GLTFLoader()
    const towerDracoLoader = new DRACOLoader()
    towerDracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    )
    towerLoader.setDRACOLoader(towerDracoLoader)
    const towerDefs = [
      { url: '/SowetoTower1.glb', x: -44 },
      { url: '/SowetoTower2.glb', x: 44 },
    ]
    for (const { url, x } of towerDefs) {
      towerLoader.load(
        url,
        (gltf) => {
          if (cancelled) return
          const tower = prepareSowetoTowerModel(gltf.scene)
          tower.position.set(x, tower.position.y, 0)
          sowetoTowers.add(tower)
        },
        undefined,
        (err) => {
          if (import.meta.env.DEV) {
            console.warn(`[SowetoTower] Failed to load ${url}`, err)
          }
        }
      )
    }

    let potholeData = []
    let potholeMeshes = null
    let coinData = []
    let coinMeshes = null
    let walletCoinData = []
    let walletCoinMeshes = null

    const textureLoader = new THREE.TextureLoader()

    const disposeWalletCoinMeshes = () => {
      if (walletCoinMeshes) {
        scene.remove(walletCoinMeshes.group)
        disposeCoinMeshes(walletCoinMeshes)
        walletCoinMeshes = null
      }
      walletCoinData = []
    }

    const rebuildRoadPickups = () => {
      if (potholeMeshes) {
        scene.remove(potholeMeshes.group)
        disposePotholeMeshes(potholeMeshes)
      }
      if (coinMeshes) {
        scene.remove(coinMeshes.group)
        disposeCoinMeshes(coinMeshes)
      }
      disposeWalletCoinMeshes()
      potholeData = buildPotholeData()
      potholeMeshes = createPotholeMeshes(potholeData)
      scene.add(potholeMeshes.group)
      const levelConfig = getLevelConfig(currentLevelRef.current)
      const collectibleVariant = levelConfig.collectibleVariant ?? 'coin'
      coinData = buildCoinData(potholeData)
      if (collectibleVariant === 'coke-bottle') {
        const cokeTemplate = cokeCollectibleAssets.getTemplate()
        if (cokeTemplate) {
          coinMeshes = createCokeCollectibleMeshes(coinData, cokeTemplate)
        } else {
          cokeCollectibleAssets.ensureLoaded()
          coinMeshes = createEmptyCokeCollectibleMeshes()
        }
        walletCoinData = buildCoinData(potholeData, {
          count: LEVEL2_WALLET_COIN_COUNT,
          excludePositions: coinData,
          excludeGap: 4.2,
        })
        walletCoinMeshes = createCoinMeshes(walletCoinData, textureLoader)
        scene.add(walletCoinMeshes.group)
      } else {
        coinMeshes = createCoinMeshes(coinData, textureLoader)
      }
      scene.add(coinMeshes.group)
    }
    rebuildRoadPickups()

    const player = new THREE.Group()
    scene.add(player)
    const openWorldPlayer = new THREE.Group()
    openWorldPlayer.name = 'openworld-player'
    scene.add(openWorldPlayer)

    const keys = { lastLaneSwap: 0, forward: false, back: false }
    const state = {
      playerZ: PLAYER_START_Z,
      previousPlayerZ: PLAYER_START_Z,
      lane: 1,
      laneX: 0,
      vy: 0,
      y: 0,
      rollT: 0,
    }
    const swapCooldown = 0.18

    const game = { over: false, won: false, nextSpawn: 0 }
    const taxis = []
    const obstacles = []
    let cancelled = false
    let activeHazardKind = null
    let collectibleCount = 0
    let crashInvulnUntil = 0

    const level3 = createLevel3Session({
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
      gameState: game,
      creditWalletRef,
      autoForwardRef,
    })

    const level4 = createLevel4Session({
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
      gameState: game,
      creditWalletRef,
      autoForwardRef,
    })
    const level5 = createLevel5Session({
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
      gameState: game,
      creditWalletRef,
      autoForwardRef,
    })
    const level6 = createLevel6Session({
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
      gameState: game,
      creditWalletRef,
      autoForwardRef,
      playerRoot: openWorldPlayer,
    })
    const level8 = createLevel8Session({
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
      gameState: game,
      creditWalletRef,
      autoForwardRef,
      playerRoot: openWorldPlayer,
    })
    if (playValveHintRef) {
      playValveHintRef.current = () => level4.playValveHint()
    }
    if (level8FailActionsRef) {
      level8FailActionsRef.current = {
        continueFromCheckpoint: () => level8.continueFromCheckpoint(),
      }
    }

    const openWorldSession = () => {
      const id = currentLevelRef.current
      if (id === 8) return level8
      if (id === 6) return level6
      if (id === 5) return level5
      if (id === 4) return level4
      return level3
    }

    const syncWorldMode = (levelConfig) => {
      const isOpenWorld = levelConfig.playerKind === 'openworld'
      const levelId = currentLevelRef.current
      level3.setActive(isOpenWorld && levelId === 3)
      level4.setActive(isOpenWorld && levelId === 4)
      level5.setActive(isOpenWorld && levelId === 5)
      level6.setActive(isOpenWorld && levelId === 6)
      level8.setActive(isOpenWorld && levelId === 8)
      staticRoad.visible = !isOpenWorld
      corridor.group.visible = !isOpenWorld
      sowetoTowers.visible = !isOpenWorld
      player.visible = !isOpenWorld
      openWorldPlayer.visible = isOpenWorld
      const endSign = staticRoad.getObjectByName('nextLevelSign')
      if (endSign) {
        setNextLevelSignText(endSign, `Next Level ${levelId + 1}`)
      }
      if (potholeMeshes) {
        potholeMeshes.group.visible = !isOpenWorld && levelConfig.potholesEnabled
      }
      if (coinMeshes) coinMeshes.group.visible = !isOpenWorld
      if (walletCoinMeshes) walletCoinMeshes.group.visible = !isOpenWorld
      if (isOpenWorld) {
        camera.far = 4000
        camera.near = 0.1
        camera.updateProjectionMatrix()
      } else {
        camera.far = 3000
        camera.updateProjectionMatrix()
      }
      if (isOpenWorld) {
        // Ensure an open-world character is applied (use selected or fallback)
        try {
          const cid = selectedCharacterIdRef.current || CHARACTERS[0]?.id
          console.log('[Level3] Activating openworld mode, applying character', cid)
          applyOpenWorldCharacter(cid)
        } catch (e) {
          console.warn('[Level3] Failed to apply openworld character', e)
        }
      }
    }

    clearMovementKeysRef.current = () => {
      keys.forward = false
      keys.back = false
      level3.clearKeys()
      level4.clearKeys()
      level5.clearKeys()
      level6.clearKeys()
      level8.clearKeys()
    }

    const inPothole = (px, pz, py, vy) => {
      if (py > POTHOLE_CLEAR_Y) return false
      if (vy > POTHOLE_IGNORE_SLOW_VY) return false
      for (const ph of potholeData) {
        if (Math.abs(pz - ph.z) > ph.halfZ) continue
        if (Math.abs(px - ph.x) > ph.halfX) continue
        return true
      }
      return false
    }

    const clearTaxis = () => {
      for (const tx of taxis) {
        scene.remove(tx.group)
        disposeObject3D(tx.group)
      }
      taxis.length = 0
    }

    const clearObstacles = () => {
      for (const obstacle of obstacles) {
        scene.remove(obstacle.group)
        disposeObject3D(obstacle.group)
      }
      obstacles.length = 0
    }

    const clearHazards = () => {
      clearTaxis()
      clearObstacles()
    }

    const scheduleTaxiSpawnsIfNeeded = () => {
      if (cancelled) return
      if (getLevelConfig(currentLevelRef.current).hazardKind !== 'taxi') return
      if (!getTaxiTemplate()) return
      game.nextSpawn = performance.now() / 1000 + 0.5
    }

    const scheduleObstacleSpawnsIfNeeded = () => {
      if (cancelled) return
      if (getLevelConfig(currentLevelRef.current).hazardKind !== 'obstacle') return
      if (getLevel2HazardCarTemplates().length === 0) return
      game.nextSpawn = performance.now() / 1000 + 0.5
    }

    const hazardLoaderHandlers = {
      onReady: () => {
        if (cancelled) return
        setHud((h) => ({ ...h, loading: false }))
        scheduleTaxiSpawnsIfNeeded()
        scheduleObstacleSpawnsIfNeeded()
      },
      onError: () => {
        if (cancelled) return
        setHud((h) => ({ ...h, loading: false, loadError: true }))
      },
    }
    let activeHazardLoaderLevel = null
    /** @type {import('./levels.js').HazardLoader | null} */
    let primaryHazardLoader = null

    const bindPrimaryHazardLoader = (levelConfig) => {
      primaryHazardLoader?.cancel?.()

      if (
        levelConfig.hazardKind === 'thug' ||
        levelConfig.hazardKind === 'looter' ||
        levelConfig.hazardKind === 'threat' ||
        levelConfig.hazardKind === 'none'
      ) {
        primaryHazardLoader = null
        activeHazardLoaderLevel = levelConfig.id
        if (!cancelled) setHud((h) => ({ ...h, loading: false }))
        return
      }

      if (activeHazardLoaderLevel === levelConfig.id) {
        if (levelConfig.hazardKind === 'obstacle') {
          primaryHazardLoader?.ensureLoaded?.()
          preloadAllLevel2HazardCars().then(() => scheduleObstacleSpawnsIfNeeded())
        } else if (levelConfig.hazardKind === 'taxi') {
          preloadTaxi().then(() => scheduleTaxiSpawnsIfNeeded())
        }
        return
      }

      primaryHazardLoader =
        levelConfig.hazardLoaderFactory?.(hazardLoaderHandlers) ??
        createLevel1TaxiAssetLoader(hazardLoaderHandlers)
      activeHazardLoaderLevel = levelConfig.id

      if (levelConfig.hazardKind === 'obstacle') {
        primaryHazardLoader?.ensureLoaded?.()
        preloadAllLevel2HazardCars().then(() => scheduleObstacleSpawnsIfNeeded())
      } else if (levelConfig.hazardKind === 'taxi') {
        primaryHazardLoader?.ensureLoaded?.()
      }
    }

    const applyLevelFog = (levelConfig) => {
      if (levelConfig.playerKind === 'openworld') {
        scene.fog = new THREE.FogExp2(
          levelConfig.fogColor ?? 0xd9925c,
          levelConfig.fogDensity ?? 0.0022
        )
        scene.background = new THREE.Color(levelConfig.backgroundColor ?? 0xd98c52)
        return
      }
      scene.fog = new THREE.Fog(
        levelConfig.fogColor ?? 0x7a9ebc,
        levelConfig.fogNear ?? 18,
        levelConfig.fogFar ?? 620
      )
      scene.background = new THREE.Color(levelConfig.fogColor ?? 0x7a9ebc)
    }

    const syncHazardsForLevel = (levelConfig) => {
      applyLevelFog(levelConfig)
      syncWorldMode(levelConfig)
      if (activeHazardKind === levelConfig.hazardKind) return
      if (levelConfig.hazardKind !== 'taxi') clearTaxis()
      if (levelConfig.hazardKind !== 'obstacle') clearObstacles()
      if (levelConfig.hazardKind === 'obstacle') {
        primaryHazardLoader?.ensureLoaded?.()
        preloadAllLevel2HazardCars().then(() => scheduleObstacleSpawnsIfNeeded())
      } else if (levelConfig.hazardKind === 'taxi') {
        primaryHazardLoader?.ensureLoaded?.()
        preloadTaxi().then(() => scheduleTaxiSpawnsIfNeeded())
      }
      activeHazardKind = levelConfig.hazardKind
    }

    const awardHazardPassed = () => {
      setHud((h) => {
        const score = h.score + 1
        const highScore = Math.max(h.highScore, score)
        if (highScore > h.highScore) {
          try {
            localStorage.setItem(
              levelHighScoreKey(currentLevelRef.current),
              String(highScore)
            )
          } catch {
            // ignore
          }
          void submitBestScore(currentLevelRef.current, highScore)
        }
        if (
          score > recordBaselineRef.current &&
          !newRecordToastShownRef.current
        ) {
          newRecordToastShownRef.current = true
          queueMicrotask(() => setNewRecordToast(true))
        }
        return { ...h, score, highScore }
      })
    }

    const updateHazardGroup = (hazardList, levelConfig, pz, started, dt, nowT) => {
      const hazardSpeed = levelConfig.hazardSpeed ?? TAXI_SPEED
      const hitRx = levelConfig.hitRx ?? TAXI_HIT_RX
      const hitRz = levelConfig.hitRz ?? TAXI_HIT_RZ
      // Near-miss window: a bit wider than the hit box so last-second swerves / jumps count.
      const nearMissRx = hitRx + 0.75
      const nearMissRz = hitRz + 2.5
      const canContinueCrash =
        levelConfig.collectibleVariant === 'coke-bottle' &&
        collectibleCount >= LEVEL2_CRASH_CONTINUE_COST
      for (let i = hazardList.length - 1; i >= 0; i--) {
        if (!started || game.over || game.won) break
        const hazard = hazardList[i]
        hazard.group.position.z += hazardSpeed * dt
        const tz = hazard.group.position.z
        const dx = Math.abs(LANES[hazard.lane] - state.laneX)
        if (
          !hazard.passed &&
          !hazard.closeCall &&
          Math.abs(tz - pz) < nearMissRz &&
          dx < nearMissRx
        ) {
          hazard.closeCall = true
        }
        const isVulnerable =
          nowT >= crashInvulnUntil &&
          (levelConfig.playerKind === 'car' ||
            (state.y < 0.55 && state.rollT < 0.08))
        const hit =
          Math.abs(tz - pz) < hitRz &&
          dx < hitRx &&
          isVulnerable
        if (hit) {
          if (canContinueCrash) {
            collectibleCount -= LEVEL2_CRASH_CONTINUE_COST
            crashInvulnUntil = nowT + 1.6
            game.nextSpawn = Math.max(game.nextSpawn, nowT + 1.2)
            scene.remove(hazard.group)
            disposeObject3D(hazard.group)
            hazardList.splice(i, 1)
            setHud((h) => ({
              ...h,
              coins: collectibleCount,
              continueNotice: `Crash! ${LEVEL2_CRASH_CONTINUE_COST} Coke used — keep going`,
            }))
            continue
          }
          game.over = true
          clearPausedRef.current?.()
          setHud((h) => ({ ...h, gameOver: true, continueNotice: '' }))
        } else if (tz > pz + 5 && !hazard.passed) {
          hazard.passed = true
          awardHazardPassed()
          if (levelConfig.hazardKind === 'taxi' && hazard.closeCall) {
            playRandomHonk()
          }
        }
        if (tz > pz + 35) {
          scene.remove(hazard.group)
          disposeObject3D(hazard.group)
          hazardList.splice(i, 1)
        }
      }
    }

    const resetGame = () => {
      clearHazards()
      activeHazardKind = null
      keys.forward = false
      keys.back = false
      level3.clearKeys()
      level4.clearKeys()
      level5.clearKeys()
      level6.clearKeys()
      level8.clearKeys()
      game.over = false
      game.won = false
      state.playerZ = PLAYER_START_Z
      state.previousPlayerZ = PLAYER_START_Z
      state.lane = 1
      state.laneX = 0
      state.vy = 0
      state.y = 0
      state.rollT = 0
      corridor.reset()
      game.nextSpawn = performance.now() / 1000 + 0.8
      collectibleCount = 0
      crashInvulnUntil = 0
      recordBaselineRef.current = highScoreRef.current
      newRecordToastShownRef.current = false
      setHud((h) => ({
        ...h,
        gameOver: false,
        levelComplete: false,
        score: 0,
        coins: 0,
        hp: 100,
        maxHp: 100,
        continueNotice: '',
      }))
      const levelConfig = getLevelConfig(currentLevelRef.current)
      if (levelConfig.playerKind === 'openworld') {
        openWorldSession().reset()
      }
      bindPrimaryHazardLoader(levelConfig)
      rebuildRoadPickups()
      applyLevelFog(levelConfig)
      syncWorldMode(levelConfig)
      potholeMeshes.group.visible = levelConfig.potholesEnabled
      syncHazardsForLevel(levelConfig)
      ensurePlayerForCurrentLevel()
    }
    threeResetGameRef.current = resetGame

    const loader = new GLTFLoader()
    const playerDracoLoader = new DRACOLoader()
    playerDracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    )
    loader.setDRACOLoader(playerDracoLoader)
    const fbxLoader = new FBXLoader()
    /** @type {Map<string, THREE.AnimationClip | null>} */
    const runClipCache = new Map()

    // --- Animation state (per-character run clip + mixer) ---
    const TORCH_WALK_URL = '/media/players/TorchWalk.glb'
    const LOCO_FADE = 0.18
    let runClip = null
    /** @type {THREE.AnimationClip | null} */
    let torchWalkClip = null
    /** Canonical bone name -> rest quaternion from TorchWalk.glb. */
    let torchRestByBone = new Map()
    /** Rest-pose armature the torch clip was authored on. */
    let torchSourceRoot = null
    let playerMixer = null
    let playerRunAction = null
    /** @type {THREE.AnimationAction | null} */
    let playerTorchWalkAction = null
    /** @type {'run' | 'torch'} */
    let locoMode = 'run'
    let charBindPose = null
    let charSkeleton = null
    let charHips = null
    /** @type {{ x: number, z: number } | null} */
    let charHipsBind = null
    const animClock = new THREE.Clock()

    const clearPlayerMixer = () => {
      if (playerMixer) {
        const cr = player.children[0] ?? openWorldPlayer.children[0]
        playerMixer.stopAllAction()
        if (cr) playerMixer.uncacheRoot(cr)
        playerMixer = null
        playerRunAction = null
        playerTorchWalkAction = null
      }
      locoMode = 'run'
      charHips = null
      charHipsBind = null
    }

    /**
     * @param {string} url
     * @param {(anims: THREE.AnimationClip[]) => THREE.AnimationClip | null} [pick]
     * @returns {Promise<THREE.AnimationClip | null>}
     */
    const loadAnimClipFromUrl = (url, pick = pickRunClip) => {
      if (runClipCache.has(url)) {
        return Promise.resolve(runClipCache.get(url) ?? null)
      }
      return new Promise((resolve, reject) => {
        const done = (clip) => {
          if (clip) runClipCache.set(url, clip)
          else runClipCache.set(url, null)
          resolve(clip)
        }
        if (/\.fbx$/i.test(url)) {
          fbxLoader.load(
            url,
            (group) => done(pick(group.animations)),
            undefined,
            reject
          )
        } else {
          loader.load(
            url,
            (gltf) => done(pick(gltf.animations)),
            undefined,
            reject
          )
        }
      })
    }

    const loadRunClipFromUrl = (url) => loadAnimClipFromUrl(url, pickRunClip)

    let torchLoadPromise = null
    const loadTorchWalk = () => {
      if (torchWalkClip && torchRestByBone.size && torchSourceRoot) return Promise.resolve(torchWalkClip)
      if (torchLoadPromise) return torchLoadPromise
      torchLoadPromise = new Promise((resolve, reject) => {
        loader.load(
          TORCH_WALK_URL,
          (gltf) => {
            const rest = new Map()
            gltf.scene.traverse((o) => {
              if (!o.name || o.isMesh || o.isCamera || o.isLight) return
              const key = canonicalBoneKey(o.name)
              if (key && !rest.has(key)) rest.set(key, o.quaternion.clone())
            })
            torchRestByBone = rest
            torchSourceRoot = gltf.scene
            torchWalkClip = pickLocomotionClip(gltf.animations)
            resolve(torchWalkClip)
          },
          undefined,
          (err) => {
            torchLoadPromise = null
            reject(err)
          }
        )
      })
      return torchLoadPromise
    }

    /**
     * Crossfade between normal run and Level 5 torch walk.
     * @param {'run' | 'torch'} mode
     */
    const setLocoMode = (mode) => {
      if (mode === locoMode) return
      const next =
        mode === 'torch' && playerTorchWalkAction
          ? playerTorchWalkAction
          : playerRunAction
      const prev =
        locoMode === 'torch' && playerTorchWalkAction
          ? playerTorchWalkAction
          : playerRunAction
      if (!next) return
      if (prev && prev !== next) prev.fadeOut(LOCO_FADE)
      next.enabled = true
      next.reset()
      next.setEffectiveWeight(1)
      next.fadeIn(LOCO_FADE)
      next.play()
      next.paused = false
      locoMode = next === playerTorchWalkAction ? 'torch' : 'run'
    }

    /**
     * @param {THREE.Object3D} root
     * @param {string} skinUrl
     */
    const applySkinToCharacter = (root, skinUrl) =>
      new Promise((resolve) => {
        if (!skinUrl) {
          resolve()
          return
        }
        textureLoader.load(
          skinUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace
            tex.anisotropy = 4
            root.traverse((o) => {
              if (!o.isMesh || !o.material) return
              const mats = Array.isArray(o.material) ? o.material : [o.material]
              for (const m of mats) {
                m.map = tex
                m.needsUpdate = true
              }
            })
            resolve()
          },
          undefined,
          () => resolve()
        )
      })

    const setupCharacterAnimation = (model) => {
      // Tear down any previous mixer
      if (playerMixer) {
        playerMixer.stopAllAction()
        playerMixer = null
        playerRunAction = null
        playerTorchWalkAction = null
      }
      locoMode = 'run'
      charBindPose = null
      charSkeleton = null
      charHips = null
      charHipsBind = null

      const sm = findFirstSkinnedMesh(model)
      if (!sm?.skeleton) return

      charSkeleton = sm.skeleton
      // Snapshot the rest pose so we can return to it when not running
      charBindPose = {}
      for (const b of sm.skeleton.bones) {
        charBindPose[b.name] = b.quaternion.clone()
      }
      charHips = findHipsBone(model)
      if (charHips) {
        charHipsBind = { x: charHips.position.x, z: charHips.position.z }
      }

      if (!runClip && !torchWalkClip) return

      playerMixer = new THREE.AnimationMixer(model)

      const bindLoco = (source, name, restByBone) => {
        if (!source) return null
        const useWorldRetarget =
          restByBone?.size &&
          torchSourceRoot &&
          rigRestDiffers(restByBone, charBindPose)
        const retargeted = useWorldRetarget
          ? retargetClipWorldSpace(source, torchSourceRoot, model)
          : (restByBone?.size
              ? rebaseClipOntoBindPose(
                  stripHipRootMotion(retargetClipToRoot(source, model)),
                  restByBone,
                  charBindPose
                )
              : stripHipRootMotion(retargetClipToRoot(source, model)))
        if (retargeted.tracks.length === 0) {
          // Kenney / older skins: fall back to first skinned mesh bone map.
          const mapped = stripHipRootMotion(retargetClipToBones(source, sm.skeleton))
          const fallback =
            restByBone?.size && !useWorldRetarget
              ? rebaseClipOntoBindPose(mapped, restByBone, charBindPose)
              : mapped
          if (fallback.tracks.length === 0) {
            if (import.meta.env.DEV) {
              console.warn(
                `[RunAnim] 0 tracks for ${name}. Bones:`,
                sm.skeleton.bones.map((b) => b.name)
              )
            }
            return null
          }
          fallback.name = name
          const action = playerMixer.clipAction(fallback)
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.clampWhenFinished = false
          return action
        }
        retargeted.name = name
        const action = playerMixer.clipAction(retargeted)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.clampWhenFinished = false
        return action
      }

      playerRunAction = bindLoco(runClip, 'run')
      playerTorchWalkAction = bindLoco(torchWalkClip, 'torch-walk', torchRestByBone)

      if (playerRunAction) {
        playerRunAction.play()
        playerRunAction.paused = true
      }
      if (playerTorchWalkAction) {
        playerTorchWalkAction.enabled = false
        playerTorchWalkAction.weight = 0
      }

      if (import.meta.env.DEV) {
        console.log('[RunAnim] loco actions', {
          run: Boolean(playerRunAction),
          torchWalk: Boolean(playerTorchWalkAction),
        })
      }
    }
    // --- End animation state ---

    const clearPlayerVisual = () => {
      while (player.children.length) {
        const child = player.children[0]
        player.remove(child)
        if (child.userData?.isPlayerCarGlb) continue
        disposeObject3D(child)
      }
    }

    const addPlaceholderPlayer = () => {
      clearPlayerVisual()
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.8, 0.35),
        new THREE.MeshStandardMaterial({
          color: 0x3b7cff,
          roughness: 0.4,
        })
      )
      body.position.y = 0.5
      body.castShadow = true
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xf2c48d,
          roughness: 0.5,
        })
      )
      head.position.y = 1.0
      head.castShadow = true
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 1.0),
        new THREE.MeshStandardMaterial({
          color: 0x222228,
          roughness: 0.3,
        })
      )
      board.position.set(0, 0.05, 0.15)
      board.castShadow = true
      player.add(body, head, board)
    }

    const loadPlayerCar = () => {
      if (getLevelConfig(currentLevelRef.current).playerKind !== 'car') return
      const gen = ++playerLoadGen
      pendingRunnerCharacterId = null
      clearPlayerMixer()
      clearPlayerVisual()
      const carId = selectedLevel2CarIdRef.current
      const carModel = createLevel2CarInstance(carId)
      let meshCount = 0
      carModel?.traverse((o) => {
        if (o.isMesh) meshCount += 1
      })
      if (cancelled || gen !== playerLoadGen) return
      if (getLevelConfig(currentLevelRef.current).playerKind !== 'car') return
      if (selectedLevel2CarIdRef.current !== carId) return

      if (carModel && meshCount > 0) {
        carModel.userData.isPlayerCarGlb = true
        carModel.visible = true
        player.add(carModel)
        loadedPlayerKind = 'car'
        loadedPlayerCarGlb = true
        loadedLevel2CarId = selectedLevel2CarIdRef.current
      } else {
        if (import.meta.env.DEV) {
          console.warn('[Level2PlayerCar] Falling back to procedural car mesh')
        }
        player.add(createPlayerCar())
        loadedPlayerKind = 'car'
        loadedPlayerCarGlb = false
        loadedLevel2CarId = selectedLevel2CarIdRef.current
      }
      loadedRunnerCharacterId = null
      pendingRunnerCharacterId = null
    }

    let playerLoadGen = 0
    let loadedPlayerKind = null
    let loadedPlayerCarGlb = false
    let loadedLevel2CarId = null
    let loadedRunnerCharacterId = null
    let pendingRunnerCharacterId = null
    let openWorldLoadGen = 0
    let loadedOpenWorldCharacterId = null
    let pendingOpenWorldCharacterId = null

    const hasRunnerCharacterModel = () => {
      const root = player.children[0]
      return !!root && !!findFirstSkinnedMesh(root)
    }

    const applyPlayerCharacter = (characterId) => {
      if (getLevelConfig(currentLevelRef.current).playerKind !== 'runner') return
      const char = CHARACTERS.find((c) => c.id === characterId)
      if (!char) return
      if (
        loadedRunnerCharacterId === characterId &&
        hasRunnerCharacterModel()
      ) {
        return
      }
      if (pendingRunnerCharacterId === characterId) return
      const gen = ++playerLoadGen
      pendingRunnerCharacterId = characterId
      runClip = null
      torchWalkClip = null
      clearPlayerMixer()
      addPlaceholderPlayer()

      const format = char.format ?? 'gltf'
      const runUrl = char.runAnimUrl ?? KENNEY_RUN_FBX

      const finishWithModel = (model) => {
        if (cancelled || gen !== playerLoadGen) return
        if (getLevelConfig(currentLevelRef.current).playerKind !== 'runner') return
        clearPlayerVisual()
        player.add(model)
        const sm = findFirstSkinnedMesh(model)
        if (sm) sm.frustumCulled = false
        loadedPlayerKind = 'runner'
        loadedRunnerCharacterId = characterId
        pendingRunnerCharacterId = null

        loadRunClipFromUrl(runUrl)
          .then((clip) => {
            if (cancelled || gen !== playerLoadGen) return
            runClip = clip
            setupCharacterAnimation(model)
          })
          .catch((err) => {
            if (import.meta.env.DEV) console.warn('[RunAnim] Failed to load run clip', err)
            if (cancelled || gen !== playerLoadGen) return
            runClip = null
            setupCharacterAnimation(model)
          })
      }

      const onModelLoadError = () => {
        if (cancelled || gen !== playerLoadGen) return
        pendingRunnerCharacterId = null
        addPlaceholderPlayer()
      }

      if (format === 'fbx') {
        fbxLoader.load(
          char.url,
          (group) => {
            if (cancelled || gen !== playerLoadGen) return
            const model = preparePlayerModel(group)
            const skin = char.skinUrl
            if (skin) {
              applySkinToCharacter(model, skin).then(() => {
                if (cancelled || gen !== playerLoadGen) return
                finishWithModel(model)
              })
            } else {
              finishWithModel(model)
            }
          },
          undefined,
          onModelLoadError
        )
      } else {
        loader.load(
          char.url,
          (gltf) => {
            if (cancelled || gen !== playerLoadGen) return
            const model = preparePlayerModel(gltf.scene)
            finishWithModel(model)
          },
          undefined,
          onModelLoadError
        )
      }
    }

    /**
     * Load and attach a character model for open-world player mode.
     * @param {string} characterId
     */
    const applyOpenWorldCharacter = (characterId) => {
      const char = CHARACTERS.find((c) => c.id === characterId)
      if (!char) return
      if (loadedOpenWorldCharacterId === characterId) return
      if (pendingOpenWorldCharacterId === characterId) return
      const gen = ++openWorldLoadGen
      pendingOpenWorldCharacterId = characterId

      const clearOpenWorldVisual = () => {
        while (openWorldPlayer.children.length) {
          const child = openWorldPlayer.children[0]
          openWorldPlayer.remove(child)
          disposeObject3D(child)
        }
      }

      const finishWithModel = (model) => {
        if (cancelled || gen !== openWorldLoadGen) return
        clearOpenWorldVisual()
        openWorldPlayer.add(model)
        const sm = findFirstSkinnedMesh(model)
        if (sm) sm.frustumCulled = false
        loadedOpenWorldCharacterId = characterId
        pendingOpenWorldCharacterId = null
        console.log('[Level3] Open-world character loaded:', characterId)

        const runUrl = char.runAnimUrl ?? KENNEY_RUN_FBX
        Promise.all([
          loadRunClipFromUrl(runUrl),
          loadTorchWalk().catch(() => null),
        ])
          .then(([clip, torchClip]) => {
            if (cancelled || gen !== openWorldLoadGen) return
            runClip = clip
            torchWalkClip = torchClip
            setupCharacterAnimation(model)
          })
          .catch(() => {
            if (cancelled || gen !== openWorldLoadGen) return
            runClip = null
            torchWalkClip = null
            setupCharacterAnimation(model)
          })
      }

      const onModelLoadError = () => {
        if (cancelled || gen !== openWorldLoadGen) return
        pendingOpenWorldCharacterId = null
        clearOpenWorldVisual()
      }

      const format = char.format ?? 'gltf'
      if (format === 'fbx') {
        fbxLoader.load(
          char.url,
          (group) => {
            if (cancelled || gen !== openWorldLoadGen) return
            const model = prepareOpenWorldPlayerModel(group)
            const skin = char.skinUrl
            if (skin) {
              applySkinToCharacter(model, skin).then(() => {
                if (cancelled || gen !== openWorldLoadGen) return
                finishWithModel(model)
              })
            } else {
              finishWithModel(model)
            }
          },
          undefined,
          onModelLoadError
        )
      } else {
        loader.load(
          char.url,
          (gltf) => {
            if (cancelled || gen !== openWorldLoadGen) return
            const model = prepareOpenWorldPlayerModel(gltf.scene)
            finishWithModel(model)
          },
          undefined,
          onModelLoadError
        )
      }
    }

    const tryApplyLevel2CarVisual = () => {
      if (cancelled) return
      const level = getLevelConfig(currentLevelRef.current)
      if (level.playerKind !== 'car') return
      const carId = selectedLevel2CarIdRef.current
      if (
        loadedPlayerKind === 'car' &&
        loadedPlayerCarGlb &&
        loadedLevel2CarId === carId
      ) {
        return
      }
      if (isLevel2CarCached(carId)) {
        loadPlayerCar()
        return
      }
      whenLevel2CarReady(carId, (template) => {
        if (cancelled) return
        if (selectedLevel2CarIdRef.current !== carId) return
        if (getLevelConfig(currentLevelRef.current).playerKind !== 'car') return
        if (!template) {
          playerLoadGen += 1
          clearPlayerMixer()
          loadPlayerCar()
          return
        }
        tryApplyLevel2CarVisual()
      })
    }

    const preloadLevel2Car = (carId) => {
      if (loadedLevel2CarId !== carId) {
        loadedLevel2CarId = null
        loadedPlayerCarGlb = false
      }
      preloadLevel2CarAsset(carId)
      whenLevel2CarReady(carId, () => {
        if (cancelled) return
        tryApplyLevel2CarVisual()
      })
    }

    const applyPlayerForCurrentLevel = () => {
      const level = getLevelConfig(currentLevelRef.current)
      if (level.playerKind === 'car') {
        const carId = selectedLevel2CarIdRef.current
        preloadLevel2CarAsset(carId)
        if (isLevel2CarCached(carId)) {
          tryApplyLevel2CarVisual()
        } else if (loadedPlayerKind !== 'car' || loadedLevel2CarId !== carId) {
          playerLoadGen += 1
          clearPlayerMixer()
          addPlaceholderPlayer()
          whenLevel2CarReady(carId, () => {
            if (cancelled) return
            tryApplyLevel2CarVisual()
          })
        }
        return
      }
      if (level.playerKind === 'openworld') {
        applyOpenWorldCharacter(selectedCharacterIdRef.current)
        return
      }
      applyPlayerCharacter(selectedCharacterIdRef.current)
    }

    const ensurePlayerForCurrentLevel = () => {
      const level = getLevelConfig(currentLevelRef.current)
      if (level.playerKind === 'car') {
        const carId = selectedLevel2CarIdRef.current
        if (
          loadedPlayerKind === 'car' &&
          loadedPlayerCarGlb &&
          loadedLevel2CarId === carId
        ) {
          return
        }
        applyPlayerForCurrentLevel()
        return
      }
      const characterId = selectedCharacterIdRef.current
      if (level.playerKind === 'openworld') {
        if (loadedOpenWorldCharacterId === characterId) return
        if (pendingOpenWorldCharacterId === characterId) return
        applyPlayerForCurrentLevel()
        return
      }
      if (
        loadedRunnerCharacterId === characterId &&
        hasRunnerCharacterModel()
      ) {
        return
      }
      if (pendingRunnerCharacterId === characterId) return
      applyPlayerForCurrentLevel()
    }
    applyPlayerCharacterRef.current = applyPlayerCharacter
    applyPlayerForCurrentLevelRef.current = ensurePlayerForCurrentLevel
    preloadLevel2CarRef.current = preloadLevel2Car
    preloadTaxi() // Preload taxi for level 1
    preloadAllLevel2Cars()
    preloadAllLevel2HazardCars()
    const cokeCollectibleAssets = createCokeCollectibleAssetLoader({
      onReady: () => {
        if (cancelled) return
        if (
          getLevelConfig(currentLevelRef.current).collectibleVariant ===
          'coke-bottle'
        ) {
          rebuildRoadPickups()
        }
      },
    })
    ensurePlayerForCurrentLevel()
    const initialConfig = getLevelConfig(currentLevelRef.current)
    applyLevelFog(initialConfig)
    syncWorldMode(initialConfig)
    bindPrimaryHazardLoader(initialConfig)

    const isGameplayActive = () =>
      gameStartedRef.current &&
      playStartedRef.current &&
      !pausedRef.current &&
      !levelBriefingOpenRef?.current &&
      !level6WarningOpenRef?.current &&
      !game.over &&
      !game.won

    const setLane = (dir) => {
      const t = performance.now() / 1000
      if (t - keys.lastLaneSwap < swapCooldown) return
      if (dir < 0 && state.lane > 0) {
        state.lane--
        keys.lastLaneSwap = t
      } else if (dir > 0 && state.lane < 2) {
        state.lane++
        keys.lastLaneSwap = t
      }
    }

    const onKeyDown = (e) => {
      if (e.defaultPrevented) return
      if (!gameStartedRef.current || !playStartedRef.current) {
        if (e.code === 'Escape' && menuScreenRef.current !== 'main') {
          e.preventDefault()
          setMenuScreen('main')
          return
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault()
          if (menuScreenRef.current === 'main') {
            startFromMenuRef.current?.()
            containerRef.current?.focus()
          }
        }
        return
      }
      if (level6WarningOpenRef?.current) {
        e.preventDefault()
        if (e.code === 'Enter' && !e.repeat) {
          confirmLevel6WarningRef.current?.()
        }
        return
      }
      if (levelBriefingOpenRef?.current) {
        if (
          e.code === 'Enter' ||
          e.code === 'Space' ||
          e.code === 'Escape'
        ) {
          e.preventDefault()
          dismissLevelBriefingRef.current?.()
        } else {
          e.preventDefault()
        }
        return
      }
      if (
        !e.repeat &&
        (e.code === 'KeyP' || e.code === 'Escape') &&
        !game.over &&
        !game.won
      ) {
        e.preventDefault()
        setPausedRef.current((p) => {
          if (!p) {
            keys.forward = false
            keys.back = false
            level3.clearKeys()
            level4.clearKeys()
            level5.clearKeys()
            level6.clearKeys()
            level8.clearKeys()
            document.exitPointerLock?.()
          }
          const next = !p
          pausedRef.current = next
          return next
        })
        return
      }
      if (pausedRef.current) return
      if (e.code === 'KeyR') {
        e.preventDefault()
        if (game.over || game.won) resetGame()
        return
      }
      if (game.over || game.won) return
      const level = getLevelConfig(currentLevelRef.current)
      if (level.playerKind === 'openworld') {
        if (openWorldSession().handleKeyDown(e.code)) e.preventDefault()
        return
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault()
        keys.forward = true
        return
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault()
        keys.back = true
        return
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault()
        setLane(-1)
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault()
        setLane(1)
      } else if (e.code === 'Space') {
        e.preventDefault()
        if (!level.jumpEnabled) return
        if (state.y <= 0.01 && state.rollT <= 0) {
          state.vy = JUMP_VELOCITY
        }
      }
    }

    const onKeyUp = (e) => {
      if (level6WarningOpenRef?.current || levelBriefingOpenRef?.current) return
      const level = getLevelConfig(currentLevelRef.current)
      if (level.playerKind === 'openworld') {
        openWorldSession().handleKeyUp(e.code)
        return
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.back = false
    }

    let touchX = 0
    let touchY = 0
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      touchX = e.touches[0].clientX
      touchY = e.touches[0].clientY
    }
    const onTouchEnd = (e) => {
      if (!isGameplayActive()) return
      if (e.changedTouches.length !== 1) return
      const dx = e.changedTouches[0].clientX - touchX
      const dy = e.changedTouches[0].clientY - touchY
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 32) {
        setLane(dx > 0 ? 1 : -1)
      } else if (Math.abs(dy) > 28) {
        const level = getLevelConfig(currentLevelRef.current)
        if (dy < 0) {
          if (level.jumpEnabled) {
            if (state.y <= 0.01 && state.rollT <= 0) state.vy = JUMP_VELOCITY
          } else {
            keys.forward = true
            window.setTimeout(() => {
              keys.forward = false
            }, 280)
          }
        } else {
          if (!level.rollEnabled) return
          if (state.y <= 0.01 && state.rollT <= 0) state.rollT = ROLL_DURATION
        }
      }
    }

    let lastT = performance.now() / 1000
    let raf = 0
    let prevOpenPos = { x: 0, z: 0 }

    const update = (nowMs) => {
      const started = isGameplayActive()
      const t = nowMs / 1000
      const dt = Math.min(0.05, t - lastT)
      if (pausedRef.current && gameStartedRef.current && playStartedRef.current && !game.over && !game.won) {
        lastT = t
        renderer.render(scene, camera)
        raf = requestAnimationFrame(update)
        return
      }
      lastT = t
      const animDelta = animClock.getDelta()
      const levelConfig = getLevelConfig(currentLevelRef.current)
      const isOpenWorld = levelConfig.playerKind === 'openworld'

      if (isOpenWorld) {
        openWorldSession().update(dt, started)
      }

      // Corridor Z: negative is toward the finish. Back overrides auto-forward.
      const move =
        isOpenWorld || !started || game.over || game.won
          ? 0
          : -resolveForwardAxis(keys, Boolean(autoForwardRef?.current))
      if (!isOpenWorld && started && !game.over && !game.won) {
        potholeMeshes.group.visible = levelConfig.potholesEnabled
        let vMult = 1
        if (
          levelConfig.potholesEnabled &&
          move !== 0 &&
          inPothole(
            state.laneX,
            state.playerZ,
            state.y,
            state.vy
          )
        ) {
          vMult = POTHOLE_SLOW_MULT
        }
        state.playerZ += move * (levelConfig.moveSpeed ?? MOVE_SPEED) * vMult * dt
        state.playerZ = Math.max(
          -ROAD_LEN + 1.5,
          Math.min(0.5, state.playerZ)
        )
        if (state.playerZ <= LEVEL_END_Z) {
          game.won = true
          clearPausedRef.current?.()
          setHud((h) => ({ ...h, levelComplete: true }))
        }
      }

      if (!isOpenWorld && started && levelConfig.rollEnabled && state.rollT > 0) {
        state.rollT = Math.max(0, state.rollT - dt)
        const k = 1 - state.rollT / ROLL_DURATION
        const rollH = 0.42 + 0.58 * Math.sin(k * Math.PI)
        player.scale.set(1, rollH, 1.05)
        state.vy = 0
        state.y = 0
      } else if (!isOpenWorld && started) {
        if (levelConfig.jumpEnabled) {
          state.vy -= GRAVITY * dt
          state.y += state.vy * dt
          if (state.y < 0) {
            state.y = 0
            state.vy = 0
          }
        } else {
          state.vy = 0
          state.y = 0
          state.rollT = 0
        }
        player.scale.set(1, 1, 1)
      }

      const targetX = LANES[state.lane]
      if (!isOpenWorld && started) {
        state.laneX += (targetX - state.laneX) * (1 - Math.exp(-LANE_SMOOTH * dt))
      }
      const onGround = state.y <= 0.01
      const strafing =
        started &&
        !game.over &&
        !game.won &&
        Math.abs(LANES[state.lane] - state.laneX) > LANE_STRAFE_FOR_RUN_EPS
      // Run cycle when moving along the road (W/S) or changing lanes (A/D).
      const moving = move !== 0 || strafing
      const wantRun =
        started &&
        !game.over &&
        !game.won &&
        onGround &&
        state.rollT <= 0 &&
        moving

      const charRoot = player.children[0]
      let runBobY = 0

      if (levelConfig.playerKind === 'runner') {
        if (playerMixer && playerRunAction) {
          // Drive the real running animation (TestCharacter run.fbx)
          if (wantRun) {
            playerRunAction.paused = false
            playerMixer.update(animDelta)
            pinHipsXZ(charHips, charHipsBind)
            const o = proceduralRunState(t)
            runBobY = o.bob
            if (charRoot) {
              charRoot.rotation.x = o.pitch * 0.25
              charRoot.rotation.z = o.roll * 0.25
            }
          } else {
            // Pause clip and snap back to the rest pose so the character stands still
            playerRunAction.paused = true
            if (charBindPose && charSkeleton) {
              for (const b of charSkeleton.bones) {
                const bq = charBindPose[b.name]
                if (bq) b.quaternion.copy(bq)
              }
            }
            if (charRoot) {
              charRoot.rotation.x = 0
              charRoot.rotation.z = 0
            }
          }
        } else {
          // Fallback: procedural limb gait while run clip is still loading
          const skin = charRoot ? findFirstSkinnedMesh(charRoot) : null
          if (skin?.skeleton) {
            applyLimbRunGait(skin.skeleton, t, wantRun)
          }
          if (wantRun && charRoot) {
            const o = proceduralRunState(t)
            runBobY = o.bob
            charRoot.rotation.x = o.pitch
            charRoot.rotation.z = o.roll
          } else if (charRoot) {
            charRoot.rotation.x = 0
            charRoot.rotation.z = 0
          }
        }
      } else if (levelConfig.playerKind === 'car') {
        runBobY = carMotionOffset(t, moving)
        if (charRoot) {
          charRoot.rotation.x = moving ? 0.03 * Math.sin(t * 18) : 0
          charRoot.rotation.z = 0
        }
      } else if (levelConfig.playerKind === 'openworld') {
        const ow = openWorldSession()
        const openRoot = openWorldPlayer.children[0]
        if (openRoot && typeof ow.getPos === 'function') {
          const p = ow.getPos()
          openWorldPlayer.position.set(p.x, Math.max(0, p.y - 1.7), p.z)
          const charYaw = typeof ow.getCharacterYaw === 'function' ? ow.getCharacterYaw() : Math.PI
          openRoot.rotation.y = charYaw - PLAYER_FACING_Y

          const moveDist = Math.hypot(p.x - prevOpenPos.x, p.z - prevOpenPos.z)
          const moving = moveDist > 0.01
          const torchOn =
            typeof ow.isTorchOn === 'function' ? Boolean(ow.isTorchOn()) : false
          if (playerMixer && (playerRunAction || playerTorchWalkAction)) {
            if (moving) {
              setLocoMode(torchOn && playerTorchWalkAction ? 'torch' : 'run')
              const loco =
                locoMode === 'torch' && playerTorchWalkAction
                  ? playerTorchWalkAction
                  : playerRunAction
              if (loco) loco.paused = false
              playerMixer.update(animDelta)
              pinHipsXZ(charHips, charHipsBind)
            } else {
              if (playerRunAction) playerRunAction.paused = true
              if (playerTorchWalkAction) playerTorchWalkAction.paused = true
              if (charBindPose && charSkeleton) {
                for (const b of charSkeleton.bones) {
                  const bq = charBindPose[b.name]
                  if (bq) b.quaternion.copy(bq)
                }
              }
            }
          }
          prevOpenPos.x = p.x
          prevOpenPos.z = p.z
        }
      }

      const py = state.y
      const pz = state.playerZ
      player.position.set(state.laneX, py + runBobY, pz)

      // Top-down puzzle camera when Level 4 pipe puzzle is active.
      if (isOpenWorld) {
        const ow = openWorldSession()
        const puzzle = typeof ow.getPuzzleView === 'function' ? ow.getPuzzleView() : null
        if (puzzle) {
          camera.up.set(0, 1, 0)
          camera.position.set(puzzle.x, puzzle.height, puzzle.z)
          // Fixed top-down: lookAt straight down is unstable and can flip X.
          camera.rotation.set(-Math.PI / 2, 0, 0)
        } else if (typeof ow.applyCamera === 'function') {
          camera.up.set(0, 1, 0)
          ow.applyCamera(camera)
        } else {
          camera.up.set(0, 1, 0)
          const openRoot = openWorldPlayer.children[0]
          if (openRoot) {
            const px = openWorldPlayer.position.x
            const pz2 = openWorldPlayer.position.z
            const py2 = openWorldPlayer.position.y
            const yaw = typeof ow.getYaw === 'function' ? ow.getYaw() : 0
            const pitch =
              typeof ow.getPitch === 'function' ? ow.getPitch() : 0
            const dist = 5.5
            const cosP = Math.cos(pitch * 0.55)
            const bx = px - Math.sin(yaw) * dist * cosP
            const bz = pz2 - Math.cos(yaw) * dist * cosP
            const by = py2 + 2.4 + Math.sin(pitch) * 1.8
            camera.position.set(bx, by, bz)
            camera.lookAt(px, py2 + 1.35, pz2)
          }
        }
        if (typeof ow.syncHorizonBackdrop === 'function') {
          ow.syncHorizonBackdrop(camera, Boolean(puzzle))
        }
      }

      if (!isOpenWorld) {
        staticRoad.userData.roadBillboards?.update(dt)
        const scrollSpeed =
          started && !game.over && !game.won
            ? -move * (levelConfig.moveSpeed ?? MOVE_SPEED)
            : 0
        corridor.update(scrollSpeed, dt, pz)
      }
      const px = state.laneX
      if (!isOpenWorld) {
        const camH =
          levelConfig.playerKind === 'car'
            ? CAM_H * 1.35
            : levelConfig.rollEnabled && state.rollT > 0
              ? CAM_H * 0.55
              : CAM_H
        const camX = px * 0.18
        camera.position.set(camX, py + runBobY + camH, pz + CAM_Z_OFFSET)
        camera.lookAt(px, py + runBobY + 0.0, pz - CAM_LOOK_AHEAD_Z)
        sowetoTowers.position.z = camera.position.z - 170
      }

      let coinPickups = 0
      if (!isOpenWorld && started && !game.over && !game.won) {
        coinPickups = collectCoinsNearPlayer(
          coinData,
          px,
          pz,
          state.previousPlayerZ
        )
        if (coinPickups > 0) {
          playCoinPickup(coinPickups)
          collectibleCount += coinPickups
          setHud((h) => ({
            ...h,
            coins: collectibleCount,
          }))
          if ((levelConfig.collectibleVariant ?? 'coin') !== 'coke-bottle') {
            creditWalletRef?.current?.(coinPickups)
          }
        }
        if (walletCoinData.length) {
          const walletPickups = collectCoinsNearPlayer(
            walletCoinData,
            px,
            pz,
            state.previousPlayerZ
          )
          if (walletPickups > 0) {
            playCoinPickup(walletPickups)
            creditWalletRef?.current?.(walletPickups)
          }
        }
      }
      updateCollectibleInstances(coinMeshes, coinData, t)
      if (walletCoinMeshes) {
        updateCollectibleInstances(walletCoinMeshes, walletCoinData, t)
      }
      state.previousPlayerZ = pz

      if (
        !isOpenWorld &&
        started &&
        !game.over &&
        !game.won &&
        t > game.nextSpawn
      ) {
        const taxiTemplate =
          getTaxiTemplate() ?? primaryHazardLoader?.getTemplate?.() ?? null
        const obstacleTemplates = getLevel2HazardCarTemplates()
        const spawnMin = levelConfig.spawnMin ?? TAXI_SPAWN_MIN
        const spawnMax = levelConfig.spawnMax ?? TAXI_SPAWN_MAX
        if (levelConfig.hazardKind === 'taxi' && taxiTemplate) {
          taxis.push(
            spawnTaxi(scene, taxiTemplate, state.playerZ, taxis)
          )
          game.nextSpawn =
            t + spawnMin + Math.random() * (spawnMax - spawnMin)
        } else if (
          levelConfig.hazardKind === 'obstacle' &&
          obstacleTemplates.length > 0
        ) {
          const spawned = spawnObstacle(
            scene,
            obstacleTemplates,
            state.playerZ,
            obstacles
          )
          if (spawned) obstacles.push(spawned)
          game.nextSpawn =
            t + spawnMin + Math.random() * (spawnMax - spawnMin)
        }
      }

      if (!isOpenWorld) {
        if (levelConfig.hazardKind === 'taxi') {
          updateHazardGroup(taxis, levelConfig, pz, started, dt, t)
        } else if (levelConfig.hazardKind === 'obstacle') {
          updateHazardGroup(obstacles, levelConfig, pz, started, dt, t)
        }
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)

    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = Math.max(container.clientHeight, 1)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const onBlur = () => {
      keys.forward = false
      keys.back = false
      level3.clearKeys()
      level4.clearKeys()
      level5.clearKeys()
      level6.clearKeys()
      level8.clearKeys()
    }
    const onPointerDown = () => {
      container.focus({ preventScroll: true })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onKeyDown, { capture: true, passive: false })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    container.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      cancelled = true
      primaryHazardLoader?.cancel?.()
      disposeLevel2CarCache()
      disposeLevel2HazardCarCache()
      cokeCollectibleAssets.cancel()
      clearMovementKeysRef.current = () => {}
      applyPlayerCharacterRef.current = null
      applyPlayerForCurrentLevelRef.current = null
      preloadLevel2CarRef.current = null
      threeResetGameRef.current = null
      if (playValveHintRef) playValveHintRef.current = null
      if (level8FailActionsRef) level8FailActionsRef.current = null
      playerLoadGen += 1
      cancelAnimationFrame(raf)
      clearPlayerMixer()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
      container.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
      level3.dispose()
      level4.dispose()
      level5.dispose()
      level6.dispose()
      level8.dispose()
      clearHazards()
      primaryHazardLoader?.cancel?.()
      disposeTaxiCache()
      cokeCollectibleAssets.dispose()
      if (potholeMeshes) {
        scene.remove(potholeMeshes.group)
        disposePotholeMeshes(potholeMeshes)
      }
      if (coinMeshes) {
        scene.remove(coinMeshes.group)
        disposeCoinMeshes(coinMeshes)
      }
      disposeWalletCoinMeshes()
      staticRoad.userData.roadBillboards?.dispose()
      scene.remove(staticRoad)
      staticRoad.traverse((obj) => {
        obj.userData.disposeSign?.()
      })
      disposeGeometries(staticRoad)
      corridor.dispose()
      scene.remove(sowetoTowers)
      disposeObject3D(sowetoTowers)
      Object.values(m).forEach((mat) => mat.dispose())
      Object.values(envMaterials).forEach((mat) => mat.dispose())
      clearPlayerVisual()
      scene.remove(openWorldPlayer)
      disposeObject3D(openWorldPlayer)
      scene.remove(player)
      disposeObject3D(player)
      towerDracoLoader.dispose()
      playerDracoLoader.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
    // Mount-once Three.js scene; refs hold latest callbacks/state for the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHud, setPlayStarted, setMenuScreen, setNewRecordToast])
}
