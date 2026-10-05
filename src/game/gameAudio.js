// gameAudio.js — Background music, taxi honks, and collectible pickup SFX.

/** Adjust background music loudness here (0–1). */
export const BGM_VOLUME = 0.3

/** Adjust car honk loudness here (0–1). */
export const SFX_VOLUME = 0.7

const GAME_AUDIO = '/game audio'
const BGM_SRC = `${GAME_AUDIO}/background-music.mp3`
const COIN_SRC = `${GAME_AUDIO}/coin-pickup.mp3`
const HONK_SRCS = [
  `${GAME_AUDIO}/car-honk-1.mp3`,
  `${GAME_AUDIO}/car-honk-2.mp3`,
  `${GAME_AUDIO}/car-honk-3.mp3`,
]

/** @type {HTMLAudioElement | null} */
let bgm = null
let musicMuted = false
let bgmShouldPlay = false

function ensureBgm() {
  if (!bgm) {
    bgm = new Audio(BGM_SRC)
    bgm.loop = true
    bgm.preload = 'auto'
  }
  bgm.volume = musicMuted ? 0 : BGM_VOLUME
  return bgm
}

export function isMusicMuted() {
  return musicMuted
}

export function setMusicMuted(muted) {
  musicMuted = Boolean(muted)
  if (!bgm) return
  bgm.volume = musicMuted ? 0 : BGM_VOLUME
  if (musicMuted) {
    bgm.pause()
  } else if (bgmShouldPlay) {
    void bgm.play().catch(() => {})
  }
}

export function startBgm() {
  bgmShouldPlay = true
  const audio = ensureBgm()
  if (musicMuted) {
    audio.pause()
    return
  }
  audio.volume = BGM_VOLUME
  if (audio.paused) {
    void audio.play().catch(() => {})
  }
}

export function stopBgm() {
  bgmShouldPlay = false
  if (!bgm) return
  bgm.pause()
  bgm.currentTime = 0
}

function playSfx(src) {
  const audio = new Audio(src)
  audio.volume = SFX_VOLUME
  void audio.play().catch(() => {})
}

/**
 * Play a random taxi honk. Mute only affects BGM, not SFX.
 * Clones the element so rapid dodges can overlap.
 */
export function playRandomHonk() {
  playSfx(HONK_SRCS[Math.floor(Math.random() * HONK_SRCS.length)])
}

/**
 * Coin pickup for Level 1 and Level 3. Clones the element so stacked pickups overlap.
 * @param {number} [count]
 */
export function playCoinPickup(count = 1) {
  const n = Math.max(1, Math.min(4, count))
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      playSfx(COIN_SRC)
    } else {
      setTimeout(() => playSfx(COIN_SRC), i * 45)
    }
  }
}

const LEVEL4_AUDIO = `${GAME_AUDIO}/level4`
const SEQUENCE_SRCS = [
  `${LEVEL4_AUDIO}/SequenceSound1.mp3`,
  `${LEVEL4_AUDIO}/SequenceSound2.mp3`,
  `${LEVEL4_AUDIO}/SequenceSound3.mp3`,
  `${LEVEL4_AUDIO}/SequenceSound4.mp3`,
]
const INCORRECT_BUZZER_SRC = `${LEVEL4_AUDIO}/IncorrectBuzzer.mp3`
const LEVEL_COMPLETE_SRC = `${LEVEL4_AUDIO}/LevelCompleteSound.mp3`

/** Unique tone per Newlands valve colour (0 red … 3 green). */
export function playSequenceTone(index) {
  const src = SEQUENCE_SRCS[index]
  if (!src) return
  playSfx(src)
}

export function playIncorrectBuzzer() {
  playSfx(INCORRECT_BUZZER_SRC)
}

export function playLevelComplete() {
  playSfx(LEVEL_COMPLETE_SRC)
}
