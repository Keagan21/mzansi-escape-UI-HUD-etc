// RoadScene.jsx — Game shell: React state, menu actions, overlays, canvas mount.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GameHudTop } from './components/GameHudTop.jsx'
import { GameHudHealth } from './components/GameHudHealth.jsx'
import { GameOverBanner } from './components/GameOverBanner.jsx'
import { GameplayHint } from './components/GameplayHint.jsx'
import { LevelBriefing } from './components/LevelBriefing.jsx'
import { Level6ContentWarning } from './components/Level6ContentWarning.jsx'
import { Level3Objective } from './components/Level3Objective.jsx'
import { Level4Objective } from './components/Level4Objective.jsx'
import { Level5Objective } from './components/Level5Objective.jsx'
import { Level6Objective } from './components/Level6Objective.jsx'
import { Level8Objective } from './components/Level8Objective.jsx'
import { GBVImpactOverlay } from './components/GBVImpactOverlay.jsx'
import { FloodImpactOverlay } from './components/FloodImpactOverlay.jsx'
import { Level8FailOverlay } from './components/Level8FailOverlay.jsx'
import { LevelCompleteMenu } from './components/LevelCompleteMenu.jsx'
import { LoadErrorOverlay } from './components/LoadErrorOverlay.jsx'
import { LoadingOverlay } from './components/LoadingOverlay.jsx'
import { NewRecordToast } from './components/NewRecordToast.jsx'
import { PauseMenu } from './components/PauseMenu.jsx'
import { PauseToolbar } from './components/PauseToolbar.jsx'
import { RoadSceneCanvas } from './components/RoadSceneCanvas.jsx'
import { StartMenu } from './components/StartMenu.jsx'
import { WalletHud } from './components/WalletHud.jsx'
import { NavCompass } from './components/NavCompass.jsx'
import { useAuth } from './AuthContext.jsx'
import { CHARACTERS } from './game/characterAssets.js'
import { setMusicMuted, startBgm, stopBgm } from './game/gameAudio.js'
import { getLevelBriefing } from './game/levelBriefings.js'
import { getLevelConfig, isLevelPlayable } from './game/levels.js'
import { sanitizeStoredBest } from './game/scores.js'
import {
  flushAccountProgressSave,
  queueAccountProgressSave,
  syncAccountProgress,
} from './game/playerProgress.js'
import {
  creditWallet as persistCreditWallet,
  isUnlocked,
  purchaseUnlock,
  readUnlocks,
  readWallet,
} from './game/store.js'
import {
  readStoredCharacterId,
  readStoredLevel2CarId,
  readStoredLevelHighScore,
  readStoredMusicMuted,
  readStoredAutoForward,
  STORAGE_KEY_MUSIC_MUTED,
  STORAGE_KEY_AUTO_FORWARD,
  writeStoredCharacterId,
  writeStoredLevel2CarId,
  levelHighScoreKey,
} from './game/storageKeys.js'
import { LEVEL2_PLAYER_CARS } from './game/level2CarAssets.js'
import { useRoadSceneEngine } from './game/useRoadSceneEngine.js'

export function RoadScene() {
  const { user, authReady, scoresReady } = useAuth()
  const containerRef = useRef(null)
  const gameStartedRef = useRef(false)
  const playStartedRef = useRef(false)
  const applyPlayerCharacterRef = useRef(null)
  const applyPlayerForCurrentLevelRef = useRef(null)
  const preloadLevel2CarRef = useRef(() => {})
  const threeResetGameRef = useRef(null)
  const playValveHintRef = useRef(null)
  const level8FailActionsRef = useRef(null)
  const setPausedRef = useRef(() => {})
  const clearMovementKeysRef = useRef(() => {})
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [levelBriefingOpen, setLevelBriefingOpen] = useState(false)
  const levelBriefingOpenRef = useRef(false)
  const dismissLevelBriefingRef = useRef(() => {})
  const [level6WarningOpen, setLevel6WarningOpen] = useState(false)
  const level6WarningOpenRef = useRef(false)
  const confirmLevel6WarningRef = useRef(() => {})
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    readStoredCharacterId
  )
  const [selectedLevel2CarId, setSelectedLevel2CarId] = useState(
    readStoredLevel2CarId
  )
  const [walletBalance, setWalletBalance] = useState(readWallet)
  const [unlockedIds, setUnlockedIds] = useState(readUnlocks)
  const creditWalletRef = useRef(() => {})
  const [hud, setHud] = useState({
    loading: true,
    loadError: false,
    gameOver: false,
    levelComplete: false,
    score: 0,
    coins: 0,
    busFareNeeded: 0,
    highScore: readStoredLevelHighScore(1),
    hp: 100,
    maxHp: 100,
    distanceToGoal: null,
    continueNotice: '',
  })
  const [playStarted, setPlayStarted] = useState(false)
  const [level4HintDismissed, setLevel4HintDismissed] = useState(false)
  const [musicMuted, setMusicMutedState] = useState(readStoredMusicMuted)
  const [autoForward, setAutoForwardState] = useState(readStoredAutoForward)
  const autoForwardRef = useRef(autoForward)
  const [menuScreen, setMenuScreen] = useState('main')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [menuSelectedLevel, setMenuSelectedLevel] = useState(1)
  const currentLevelRef = useRef(1)
  const menuSelectedLevelRef = useRef(1)
  const startFromMenuRef = useRef(null)
  const selectedCharacterIdRef = useRef(selectedCharacterId)
  const selectedLevel2CarIdRef = useRef(selectedLevel2CarId)
  const [newRecordToast, setNewRecordToast] = useState(false)
  /** Level 6 / 8: win overlay already dismissed with CONTINUE. */
  const [impactAcknowledgedWinId, setImpactAcknowledgedWinId] = useState(0)
  const highScoreRef = useRef(hud.highScore)
  const recordBaselineRef = useRef(0)
  const newRecordToastShownRef = useRef(false)

  useEffect(() => {
    highScoreRef.current = hud.highScore
  }, [hud.highScore])

  useEffect(() => {
    if (!newRecordToast) return undefined
    const t = window.setTimeout(() => setNewRecordToast(false), 2800)
    return () => window.clearTimeout(t)
  }, [newRecordToast])

  useEffect(() => {
    if (!hud.continueNotice) return undefined
    const t = window.setTimeout(() => {
      setHud((h) => ({ ...h, continueNotice: '' }))
    }, 2200)
    return () => window.clearTimeout(t)
  }, [hud.continueNotice])

  const clearPausedRef = useRef(() => {})
  useLayoutEffect(() => {
    setPausedRef.current = setPaused
    clearPausedRef.current = () => {
      pausedRef.current = false
      setPausedRef.current(false)
    }
  }, [setPaused])
  useLayoutEffect(() => {
    if (levelBriefingOpen || level6WarningOpen) {
      pausedRef.current = true
      return
    }
    pausedRef.current = paused
  }, [paused, levelBriefingOpen, level6WarningOpen])

  useLayoutEffect(() => {
    levelBriefingOpenRef.current = levelBriefingOpen
  }, [levelBriefingOpen])

  useLayoutEffect(() => {
    playStartedRef.current = playStarted
  }, [playStarted])

  useEffect(() => {
    setMusicMuted(musicMuted)
  }, [musicMuted])

  useEffect(() => {
    autoForwardRef.current = autoForward
  }, [autoForward])

  useEffect(() => {
    if (playStarted) {
      startBgm()
    } else {
      stopBgm()
    }
  }, [playStarted])

  const selectMenuLevel = useCallback((levelNumber) => {
    if (!isLevelPlayable(levelNumber)) return
    setMenuSelectedLevel(levelNumber)
    menuSelectedLevelRef.current = levelNumber
  }, [])

  const syncHudHighScoreForLevel = useCallback((levelNumber) => {
    const raw = readStoredLevelHighScore(levelNumber)
    const highScore = sanitizeStoredBest(levelNumber, raw)
    if (highScore !== raw) {
      try {
        localStorage.setItem(levelHighScoreKey(levelNumber), String(highScore))
      } catch {
        // ignore
      }
    }
    highScoreRef.current = highScore
    setHud((h) => ({ ...h, highScore }))
  }, [])

  useEffect(() => {
    if (!authReady || !user) return undefined
    // AuthProvider already hydrates scores; refresh HUD when that finishes
    // (and once more if scores were already ready when this effect ran).
    if (!scoresReady) return undefined
    syncHudHighScoreForLevel(currentLevelRef.current)
    return undefined
  }, [authReady, user, scoresReady, syncHudHighScoreForLevel])

  useEffect(() => {
    if (!authReady || !user) return undefined
    let cancelled = false
    const uid = user.uid
    ;(async () => {
      const progressResult = await Promise.allSettled([syncAccountProgress(uid)])
      if (cancelled) return
      const settled = progressResult[0]
      if (settled.status === 'fulfilled' && settled.value) {
        const progress = settled.value
        setWalletBalance(progress.wallet)
        setUnlockedIds(progress.unlocks)
        setSelectedCharacterId(progress.selectedCharacterId)
        setSelectedLevel2CarId(progress.selectedLevel2CarId)
      }
    })().catch(() => {
      // Firestore may be unavailable until rules/database are ready.
    })
    return () => {
      cancelled = true
    }
  }, [authReady, user])

  const toggleMusicMuted = useCallback(() => {
    setMusicMutedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY_MUSIC_MUTED, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const toggleAutoForward = useCallback(() => {
    setAutoForwardState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY_AUTO_FORWARD, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const applyCreditWallet = useCallback((amount) => {
    const n = Math.floor(Number(amount) || 0)
    if (n <= 0) return
    setWalletBalance(persistCreditWallet(n))
    queueAccountProgressSave()
  }, [])

  useLayoutEffect(() => {
    creditWalletRef.current = applyCreditWallet
  }, [applyCreditWallet])

  const closeLevel6Warning = useCallback(() => {
    level6WarningOpenRef.current = false
    setLevel6WarningOpen(false)
  }, [])

  const freezeForLevelBriefing = useCallback((levelNumber) => {
    if (getLevelBriefing(levelNumber)) {
      document.exitPointerLock?.()
      pausedRef.current = true
      if (levelNumber === 6) {
        level6WarningOpenRef.current = true
        setLevel6WarningOpen(true)
        levelBriefingOpenRef.current = false
        setLevelBriefingOpen(false)
        return true
      }
      level6WarningOpenRef.current = false
      setLevel6WarningOpen(false)
      levelBriefingOpenRef.current = true
      setLevelBriefingOpen(true)
      return true
    }
    pausedRef.current = false
    level6WarningOpenRef.current = false
    setLevel6WarningOpen(false)
    levelBriefingOpenRef.current = false
    setLevelBriefingOpen(false)
    return false
  }, [])

  const confirmLevel6Warning = useCallback(() => {
    if (!level6WarningOpenRef.current) return
    level6WarningOpenRef.current = false
    setLevel6WarningOpen(false)
    document.exitPointerLock?.()
    pausedRef.current = true
    levelBriefingOpenRef.current = true
    setLevelBriefingOpen(true)
  }, [])

  const dismissLevelBriefing = useCallback(() => {
    levelBriefingOpenRef.current = false
    setLevelBriefingOpen(false)
    if (!paused) {
      pausedRef.current = false
    }
    containerRef.current?.focus()
  }, [paused])

  useLayoutEffect(() => {
    dismissLevelBriefingRef.current = dismissLevelBriefing
  }, [dismissLevelBriefing])

  useLayoutEffect(() => {
    confirmLevel6WarningRef.current = confirmLevel6Warning
  }, [confirmLevel6Warning])

  const startGameplay = useCallback(
    (levelNumber) => {
      if (!isLevelPlayable(levelNumber)) return
      if (levelNumber === 1 && (hud.loading || hud.loadError)) return
      setMenuSelectedLevel(levelNumber)
      menuSelectedLevelRef.current = levelNumber
      setCurrentLevel(levelNumber)
      currentLevelRef.current = levelNumber
      gameStartedRef.current = true
      playStartedRef.current = true
      syncHudHighScoreForLevel(levelNumber)
      clearMovementKeysRef.current()
      threeResetGameRef.current?.()
      applyPlayerForCurrentLevelRef.current?.()
      setPlayStarted(true)
      setPaused(false)
      freezeForLevelBriefing(levelNumber)
      setLevel4HintDismissed(false)
      setNewRecordToast(false)
      setMenuScreen('main')
      setHud((h) => ({
        ...h,
        levelComplete: false,
        gameOver: false,
        score: 0,
        coins: 0,
        busFareNeeded: 0,
        hp: levelNumber === 3 || levelNumber === 4 || levelNumber === 5 ? 100 : h.hp,
        maxHp: levelNumber === 3 || levelNumber === 4 || levelNumber === 5 ? 100 : h.maxHp,
        thirst: levelNumber === 4 ? 100 : h.thirst,
        maxThirst: levelNumber === 4 ? 100 : h.maxThirst,
        battery: levelNumber === 5 ? 100 : h.battery,
        maxBattery: levelNumber === 5 ? 100 : h.maxBattery,
        strikesUsed: levelNumber === 6 ? 0 : h.strikesUsed,
        soakingsUsed: levelNumber === 8 ? 0 : h.soakingsUsed,
        tipsCollected: levelNumber === 6 || levelNumber === 8 ? 0 : h.tipsCollected,
        neighboursDone: levelNumber === 8 ? 0 : h.neighboursDone,
        distanceToGoal:
          (levelNumber >= 3 && levelNumber <= 6) || levelNumber === 8 ? null : h.distanceToGoal,
        pipeFixed: false,
        pipeTimer: null,
        prompt: '',
        nodesRestored: 0,
        navigatorMessage: levelNumber === 5 ? '' : h.navigatorMessage,
        continueNotice: '',
      }))
      containerRef.current?.focus()
    },
    [hud.loadError, hud.loading, freezeForLevelBriefing, syncHudHighScoreForLevel]
  )

  const beginGameAtLevel = useCallback(
    (levelNumber) => {
      if (!isLevelPlayable(levelNumber)) return
      if (levelNumber === 1 && (hud.loading || hud.loadError)) return
      if (playStartedRef.current) return
      startGameplay(levelNumber)
    },
    [hud.loadError, hud.loading, startGameplay]
  )

  const beginGame = useCallback(() => {
    beginGameAtLevel(menuSelectedLevelRef.current)
  }, [beginGameAtLevel])

  const startFromMenu = useCallback(() => {
    beginGameAtLevel(menuSelectedLevelRef.current)
  }, [beginGameAtLevel])

  useLayoutEffect(() => {
    startFromMenuRef.current = startFromMenu
  }, [startFromMenu])

  const resumeGame = useCallback(() => {
    if (levelBriefingOpenRef.current) return
    pausedRef.current = false
    setPaused(false)
    containerRef.current?.focus()
  }, [])

  const openPauseMenu = useCallback(() => {
    clearMovementKeysRef.current()
    pausedRef.current = true
    setPaused(true)
  }, [])

  const restartFromPause = useCallback(() => {
    clearMovementKeysRef.current()
    pausedRef.current = false
    levelBriefingOpenRef.current = false
    setLevelBriefingOpen(false)
    closeLevel6Warning()
    threeResetGameRef.current?.()
    setPaused(false)
    containerRef.current?.focus()
  }, [closeLevel6Warning])

  const backToMainMenuFromGame = useCallback(() => {
    clearMovementKeysRef.current()
    setPaused(false)
    pausedRef.current = false
    levelBriefingOpenRef.current = false
    setLevelBriefingOpen(false)
    closeLevel6Warning()
    gameStartedRef.current = false
    playStartedRef.current = false
    setPlayStarted(false)
    stopBgm()
    setNewRecordToast(false)
    setCurrentLevel(1)
    currentLevelRef.current = 1
    setMenuScreen('main')
    setHud((h) => ({
      ...h,
      levelComplete: false,
      gameOver: false,
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      continueNotice: '',
    }))
    threeResetGameRef.current?.()
  }, [closeLevel6Warning])

  const signInToSaveFromWin = useCallback(() => {
    clearMovementKeysRef.current()
    setPaused(false)
    pausedRef.current = false
    levelBriefingOpenRef.current = false
    setLevelBriefingOpen(false)
    closeLevel6Warning()
    gameStartedRef.current = false
    playStartedRef.current = false
    setPlayStarted(false)
    stopBgm()
    setNewRecordToast(false)
    setHud((h) => ({
      ...h,
      levelComplete: false,
      gameOver: false,
      score: 0,
      coins: 0,
      busFareNeeded: 0,
      continueNotice: '',
    }))
    threeResetGameRef.current?.()
    setMenuScreen('account')
  }, [closeLevel6Warning])

  const tryExit = useCallback(() => {
    window.close()
  }, [])

  const restartLevelFromWin = useCallback(() => {
    pausedRef.current = false
    levelBriefingOpenRef.current = false
    setLevelBriefingOpen(false)
    closeLevel6Warning()
    setPaused(false)
    threeResetGameRef.current?.()
    containerRef.current?.focus()
  }, [closeLevel6Warning])

  const nextLevelFromWin = useCallback(() => {
    const next = currentLevelRef.current + 1
    currentLevelRef.current = next
    setMenuSelectedLevel(next)
    menuSelectedLevelRef.current = next
    setCurrentLevel(next)
    syncHudHighScoreForLevel(next)
    setPaused(false)
    freezeForLevelBriefing(next)
    setLevel4HintDismissed(false)
    threeResetGameRef.current?.()
    containerRef.current?.focus()
  }, [freezeForLevelBriefing, syncHudHighScoreForLevel])

  const setCharacter = useCallback((id) => {
    if (!CHARACTERS.some((c) => c.id === id)) return
    if (!isUnlocked('character', id)) return
    setSelectedCharacterId(id)
    writeStoredCharacterId(id)
    void flushAccountProgressSave()
  }, [])

  const setLevel2Car = useCallback((id) => {
    if (!LEVEL2_PLAYER_CARS.some((c) => c.id === id)) return
    if (!isUnlocked('car', id)) return
    setSelectedLevel2CarId(id)
    writeStoredLevel2CarId(id)
    void flushAccountProgressSave()
  }, [])

  const buyStoreItem = useCallback((kind, id) => {
    const result = purchaseUnlock(kind, id)
    setWalletBalance(result.balance)
    setUnlockedIds(result.unlocks)
    if (!result.ok) return
    if (kind === 'character') {
      setSelectedCharacterId(id)
      writeStoredCharacterId(id)
    } else if (kind === 'car') {
      setSelectedLevel2CarId(id)
      writeStoredLevel2CarId(id)
    }
    void flushAccountProgressSave()
  }, [])

  useEffect(() => {
    currentLevelRef.current = currentLevel
  }, [currentLevel])

  useEffect(() => {
    preloadLevel2CarRef.current?.(selectedLevel2CarId)
  }, [selectedLevel2CarId])

  useEffect(() => {
    applyPlayerForCurrentLevelRef.current?.()
  }, [selectedCharacterId, currentLevel])

  useEffect(() => {
    menuSelectedLevelRef.current = menuSelectedLevel
  }, [menuSelectedLevel])

  useEffect(() => {
    selectedCharacterIdRef.current = selectedCharacterId
  }, [selectedCharacterId])

  useEffect(() => {
    selectedLevel2CarIdRef.current = selectedLevel2CarId
  }, [selectedLevel2CarId])

  const menuScreenRef = useRef('main')
  useEffect(() => {
    menuScreenRef.current = menuScreen
  }, [menuScreen])

  const levelConfig = getLevelConfig(currentLevel)
  const showGBVOverlay =
    playStarted &&
    currentLevel === 6 &&
    Boolean(hud.levelComplete) &&
    (hud.winId ?? 0) !== impactAcknowledgedWinId
  const showFloodOverlay =
    playStarted &&
    currentLevel === 8 &&
    Boolean(hud.levelComplete) &&
    (hud.winId ?? 0) !== impactAcknowledgedWinId
  const continueFromImpactOverlay = useCallback(() => {
    setImpactAcknowledgedWinId(hud.winId ?? 0)
  }, [hud.winId])

  const continueLevel8FromCheckpoint = useCallback(() => {
    level8FailActionsRef.current?.continueFromCheckpoint?.()
    containerRef.current?.focus()
  }, [])

  const restartLevel8FromScratch = useCallback(() => {
    threeResetGameRef.current?.()
    containerRef.current?.focus()
  }, [])

  useRoadSceneEngine({
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
  })

  return (
    <>
      {hud.loading && <LoadingOverlay />}
      {hud.loadError && <LoadErrorOverlay />}
      {!hud.loading && !hud.loadError && !playStarted && (
        <StartMenu
          menuScreen={menuScreen}
          onBeginGame={beginGame}
          onSelectLevel={selectMenuLevel}
          menuSelectedLevel={menuSelectedLevel}
          onNavigate={setMenuScreen}
          onExit={tryExit}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={setCharacter}
          selectedLevel2CarId={selectedLevel2CarId}
          onSelectLevel2Car={setLevel2Car}
          musicMuted={musicMuted}
          onToggleMusicMuted={toggleMusicMuted}
          autoForward={autoForward}
          onToggleAutoForward={toggleAutoForward}
          walletBalance={walletBalance}
          unlockedIds={unlockedIds}
          onBuyStoreItem={buyStoreItem}
        />
      )}
      {playStarted && level6WarningOpen && !hud.levelComplete && !hud.gameOver && (
        <Level6ContentWarning />
      )}
      {playStarted &&
        levelBriefingOpen &&
        !level6WarningOpen &&
        !hud.levelComplete &&
        !hud.gameOver && (
          <LevelBriefing
            level={currentLevel}
            fromPause={paused}
            onDismiss={dismissLevelBriefing}
          />
        )}
      {playStarted &&
        !hud.levelComplete &&
        !hud.gameOver &&
        !paused &&
        !levelBriefingOpen &&
        !level6WarningOpen && (
        <GameplayHint
          level={currentLevel}
          autoForward={autoForward}
          dismissed={
            (currentLevel === 4 || currentLevel === 5 || currentLevel === 6 || currentLevel === 8) &&
            level4HintDismissed
          }
          onDismiss={
            currentLevel === 4 || currentLevel === 5 || currentLevel === 6 || currentLevel === 8
              ? () => setLevel4HintDismissed(true)
              : undefined
          }
        />
      )}
      {playStarted &&
        !hud.loading &&
        !hud.loadError &&
        !hud.gameOver &&
        !hud.levelComplete &&
        !paused &&
        !levelBriefingOpen &&
        !level6WarningOpen && <PauseToolbar onPause={openPauseMenu} />}
      {playStarted &&
        paused &&
        !levelBriefingOpen &&
        !level6WarningOpen &&
        !hud.gameOver &&
        !hud.levelComplete && (
        <PauseMenu
          onResume={resumeGame}
          onRestart={restartFromPause}
          onMainMenu={backToMainMenuFromGame}
          onHowToPlay={() => {
            levelBriefingOpenRef.current = true
            setLevelBriefingOpen(true)
          }}
          musicMuted={musicMuted}
          onToggleMusicMuted={toggleMusicMuted}
          autoForward={autoForward}
          onToggleAutoForward={toggleAutoForward}
        />
      )}
      {showGBVOverlay && <GBVImpactOverlay onContinue={continueFromImpactOverlay} />}
      {showFloodOverlay && <FloodImpactOverlay onContinue={continueFromImpactOverlay} />}
      {hud.levelComplete && playStarted && !showGBVOverlay && !showFloodOverlay && (
        <LevelCompleteMenu
          level={currentLevel}
          score={hud.score}
          coins={hud.coins}
          highScore={hud.highScore}
          runTimeMs={hud.runTimeMs ?? 0}
          signedIn={Boolean(user)}
          hazardPastLabel={levelConfig.hazardPastLabel}
          collectibleLabel={levelConfig.collectibleLabel ?? 'Coins'}
          onSignInToSave={signInToSaveFromWin}
          onNextLevel={nextLevelFromWin}
          onRestartLevel={restartLevelFromWin}
          onMainMenu={backToMainMenuFromGame}
        />
      )}
      {hud.gameOver &&
        playStarted &&
        !hud.levelComplete &&
        currentLevel === 8 &&
        hud.level8FailChoice && (
          <Level8FailOverlay
            hearts={hud.hearts ?? 0}
            failReason={hud.failReason ?? 'soak'}
            onContinue={continueLevel8FromCheckpoint}
            onRestart={restartLevel8FromScratch}
          />
        )}
      {hud.gameOver &&
        playStarted &&
        !hud.levelComplete &&
        !(currentLevel === 8 && hud.level8FailChoice) && (
        <GameOverBanner
          level={currentLevel}
          score={hud.score}
          coins={hud.coins}
          scoreLabel={levelConfig.scoreLabel}
          collectibleLabel={levelConfig.collectibleLabel ?? 'Coins'}
        />
      )}
      {hud.continueNotice && playStarted && !hud.gameOver && !hud.levelComplete && (
        <p className="game-over-banner game-continue-banner" role="status">
          {hud.continueNotice}
        </p>
      )}
      {newRecordToast && playStarted && !showGBVOverlay && !showFloodOverlay && (
        <NewRecordToast
          onClose={
            currentLevel === 4 ? () => setNewRecordToast(false) : undefined
          }
        />
      )}
      {playStarted &&
        currentLevel === 3 &&
        !hud.levelComplete &&
        !hud.gameOver &&
        !paused &&
        !levelBriefingOpen && (
        <>
          <GameHudHealth hp={hud.hp ?? 100} maxHp={hud.maxHp ?? 100} />
          <Level3Objective
            distance={hud.distanceToGoal}
            coins={hud.coins ?? 0}
            busFareNeeded={hud.busFareNeeded ?? 0}
            runTimeMs={hud.runTimeMs ?? 0}
            bestTimeMs={hud.highScore ?? 0}
          />
        </>
      )}
      {playStarted &&
        currentLevel === 4 &&
        !hud.levelComplete &&
        !hud.gameOver &&
        !paused &&
        !levelBriefingOpen && (
        <>
          <GameHudHealth
            hp={hud.thirst ?? 100}
            maxHp={hud.maxThirst ?? 100}
            variant="thirst"
          />
          <Level4Objective
            distance={hud.distanceToGoal}
            runTimeMs={hud.runTimeMs ?? 0}
            bestTimeMs={hud.highScore ?? 0}
            pipeFixed={Boolean(hud.pipeFixed)}
            newlandsFixed={Boolean(hud.newlandsFixed)}
            steenbrasFixed={Boolean(hud.steenbrasFixed)}
            handles={hud.handles ?? 0}
            handlesNeeded={hud.handlesNeeded ?? 4}
            pipeTimer={hud.pipeTimer}
            prompt={hud.prompt ?? ''}
            promptDock={hud.promptDock ?? 'inline'}
            nodesRestored={hud.nodesRestored ?? 0}
            valveHintAvailable={Boolean(hud.valveHintAvailable)}
            onValveHint={() => playValveHintRef.current?.()}
          />
        </>
      )}
      {playStarted &&
        currentLevel === 5 &&
        !hud.levelComplete &&
        !hud.gameOver &&
        !paused &&
        !levelBriefingOpen && (
          <Level5Objective
            distance={hud.distanceToGoal}
            runTimeMs={hud.runTimeMs ?? 0}
            bestTimeMs={hud.highScore ?? 0}
            battery={hud.battery ?? 100}
            maxBattery={hud.maxBattery ?? 100}
            hp={hud.hp ?? 100}
            maxHp={hud.maxHp ?? 100}
            navigatorMessage={hud.navigatorMessage ?? ''}
            node1Fixed={Boolean(hud.node1Fixed ?? hud.circuitFixed)}
            node2Fixed={Boolean(hud.node2Fixed ?? hud.cableFixed)}
            node3Fixed={Boolean(hud.node3Fixed ?? hud.generatorFixed)}
            circuitTimer={hud.circuitTimer}
            cableProgress={hud.cableProgress ?? null}
            prompt={hud.prompt ?? ''}
            promptDock={hud.promptDock ?? 'inline'}
            nodesRestored={hud.nodesRestored ?? 0}
            puzzleView={hud.puzzleView ?? null}
          />
        )}
      {playStarted &&
        currentLevel === 6 &&
        !hud.levelComplete &&
        !hud.gameOver &&
        !paused &&
        !levelBriefingOpen &&
        !level6WarningOpen && (
          <Level6Objective
            distance={hud.distanceToGoal}
            runTimeMs={hud.runTimeMs ?? 0}
            bestTimeMs={hud.highScore ?? 0}
            strikesUsed={hud.strikesUsed ?? 0}
            maxStrikes={hud.maxStrikes ?? 3}
            navigatorMessage={hud.navigatorMessage ?? ''}
            tipsCollected={hud.tipsCollected ?? 0}
            tipsTotal={hud.tipsTotal ?? 8}
            prompt={hud.prompt ?? ''}
            crouching={Boolean(hud.crouching)}
            sprinting={Boolean(hud.sprinting)}
            checkpointFlashAt={hud.checkpointFlashAt ?? 0}
            strikeFlashAt={hud.strikeFlashAt ?? 0}
          />
        )}
      {playStarted &&
        currentLevel === 8 &&
        !hud.levelComplete &&
        !hud.gameOver &&
        !paused &&
        !levelBriefingOpen && (
        <>
          <GameHudHealth hp={hud.hp ?? 100} maxHp={hud.maxHp ?? 100} />
          <Level8Objective
            distance={hud.distanceToGoal}
            runTimeMs={hud.runTimeMs ?? 0}
            bestTimeMs={hud.highScore ?? 0}
            soakingsUsed={hud.soakingsUsed ?? 0}
            maxSoakings={hud.maxSoakings ?? 3}
            navigatorMessage={hud.navigatorMessage ?? ''}
            nextStreet={hud.nextStreet ?? ''}
            tipsCollected={hud.tipsCollected ?? 0}
            tipsTotal={hud.tipsTotal ?? 8}
            neighboursDone={hud.neighboursDone ?? 0}
            waterStage={hud.waterStage ?? 0}
            prompt={hud.prompt ?? ''}
            sprinting={Boolean(hud.sprinting)}
            carryingCrate={Boolean(hud.carryingCrate)}
            rainHeavy={Boolean(hud.rainHeavy)}
            checkpointFlashAt={hud.checkpointFlashAt ?? 0}
            soakFlashAt={hud.soakFlashAt ?? 0}
            hearts={hud.hearts ?? 1}
            hp={hud.hp ?? 100}
            maxHp={hud.maxHp ?? 100}
          />
        </>
        )}
      {playStarted &&
        !hud.loading &&
        !hud.loadError &&
        !hud.gameOver &&
        !hud.levelComplete &&
        !paused &&
        !levelBriefingOpen &&
        !level6WarningOpen && <WalletHud balance={walletBalance} />}
      <NavCompass />
      {playStarted &&
        currentLevel !== 3 &&
        currentLevel !== 4 &&
        currentLevel !== 5 &&
        currentLevel !== 6 &&
        currentLevel !== 8 &&
        !levelBriefingOpen && (
        <GameHudTop
          level={currentLevel}
          highScore={hud.highScore}
          coins={hud.coins}
          score={hud.score}
          scoreLabel={levelConfig.scoreLabel}
          collectibleLabel={levelConfig.collectibleLabel ?? 'Coins'}
        />
      )}
      <RoadSceneCanvas containerRef={containerRef} />
    </>
  )
}
