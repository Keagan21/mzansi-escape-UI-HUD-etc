// level8Ambient.js — Rain bed, crowd murmur, kids, voices, distant taxi honks.

import { playRandomHonk } from './gameAudio.js'

const LEVEL8_AUDIO = '/game audio/level8'

function tryPlayFile(src, volume) {
  const audio = new Audio(src)
  audio.volume = volume
  void audio.play().catch(() => {})
  return audio
}

function makeNoiseBuffer(ctx, seconds = 1.5) {
  const n = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < n; i++) {
    last = last * 0.96 + (Math.random() * 2 - 1) * 0.04
    data[i] = last
  }
  return buf
}

function blip(ctx, dest, freq, dur, type = 'triangle', gain = 0.08) {
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.7), t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g)
  g.connect(dest)
  o.start(t)
  o.stop(t + dur + 0.05)
}

/**
 * GTA-style township bed. Real files in public/game audio/level8/ play when present;
 * otherwise a lightweight Web Audio fallback keeps the street alive.
 */
export function createLevel8Ambient() {
  /** @type {AudioContext | null} */
  let ctx = null
  let master = null
  let rainGain = null
  let crowdGain = null
  let rainSrc = null
  let crowdSrc = null
  let active = false
  let started = false
  let rainFile = null
  let crowdFile = null
  let nextVoice = 2.5
  let nextKid = 4
  let nextHonk = 5
  let thunderCool = 0

  const ensure = () => {
    if (ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.42
    master.connect(ctx.destination)

    const noise = makeNoiseBuffer(ctx, 2)

    rainSrc = ctx.createBufferSource()
    rainSrc.buffer = noise
    rainSrc.loop = true
    const rainFilter = ctx.createBiquadFilter()
    rainFilter.type = 'highpass'
    rainFilter.frequency.value = 900
    rainGain = ctx.createGain()
    rainGain.gain.value = 0.18
    rainSrc.connect(rainFilter)
    rainFilter.connect(rainGain)
    rainGain.connect(master)
    rainSrc.start()

    crowdSrc = ctx.createBufferSource()
    crowdSrc.buffer = noise
    crowdSrc.loop = true
    const crowdFilter = ctx.createBiquadFilter()
    crowdFilter.type = 'bandpass'
    crowdFilter.frequency.value = 420
    crowdFilter.Q.value = 0.7
    crowdGain = ctx.createGain()
    crowdGain.gain.value = 0.07
    crowdSrc.connect(crowdFilter)
    crowdFilter.connect(crowdGain)
    crowdGain.connect(master)
    crowdSrc.start()
  }

  const resume = () => {
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  const playVoice = (kind, closeness = 0.5) => {
    if (!ctx) return
    resume()
    const dest = master
    if (kind === 'kid') {
      blip(ctx, dest, 740, 0.09, 'square', 0.05 * closeness)
      blip(ctx, dest, 920, 0.12, 'triangle', 0.04 * closeness)
      blip(ctx, dest, 640, 0.16, 'sine', 0.035 * closeness)
      tryPlayFile(`${LEVEL8_AUDIO}/kids-laugh.mp3`, 0.28 * closeness)
      return
    }
    blip(ctx, dest, 180 + Math.random() * 90, 0.18, 'sawtooth', 0.04 * closeness)
    blip(ctx, dest, 240 + Math.random() * 80, 0.22, 'triangle', 0.035 * closeness)
    tryPlayFile(`${LEVEL8_AUDIO}/voices.mp3`, 0.22 * closeness)
  }

  const playThunder = (heavy = true) => {
    ensure()
    if (!ctx) return
    resume()
    if (thunderCool > 0) return
    thunderCool = heavy ? 0.35 : 0.7
    const t = ctx.currentTime
    const crack = ctx.createBufferSource()
    crack.buffer = makeNoiseBuffer(ctx, 0.55)
    const hip = ctx.createBiquadFilter()
    hip.type = 'highpass'
    hip.frequency.setValueAtTime(1200, t)
    hip.frequency.exponentialRampToValueAtTime(180, t + 0.18)
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(heavy ? 0.95 : 0.45, t)
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
    crack.connect(hip)
    hip.connect(crackGain)
    crackGain.connect(master)
    crack.start(t)
    crack.stop(t + 0.4)

    const rumble = ctx.createOscillator()
    rumble.type = 'sawtooth'
    rumble.frequency.setValueAtTime(42, t + 0.04)
    rumble.frequency.exponentialRampToValueAtTime(18, t + 1.8)
    const rumbleFilter = ctx.createBiquadFilter()
    rumbleFilter.type = 'lowpass'
    rumbleFilter.frequency.value = 90
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.setValueAtTime(0.001, t)
    rumbleGain.gain.exponentialRampToValueAtTime(heavy ? 0.55 : 0.22, t + 0.08)
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 2.1)
    rumble.connect(rumbleFilter)
    rumbleFilter.connect(rumbleGain)
    rumbleGain.connect(master)
    rumble.start(t)
    rumble.stop(t + 2.2)

    const boom = ctx.createOscillator()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(70, t + 0.12)
    boom.frequency.exponentialRampToValueAtTime(28, t + 1.1)
    const boomGain = ctx.createGain()
    boomGain.gain.setValueAtTime(0.001, t + 0.12)
    boomGain.gain.exponentialRampToValueAtTime(heavy ? 0.42 : 0.18, t + 0.16)
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
    boom.connect(boomGain)
    boomGain.connect(master)
    boom.start(t + 0.12)
    boom.stop(t + 1.5)

    tryPlayFile(`${LEVEL8_AUDIO}/thunder.mp3`, heavy ? 0.78 : 0.4)
  }

  const playSplash = () => {
    if (!ctx) return
    resume()
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = makeNoiseBuffer(ctx, 0.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(900, t)
    src.connect(f)
    f.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + 0.5)
    tryPlayFile(`${LEVEL8_AUDIO}/splash.mp3`, 0.45)
  }

  return {
    setActive(on) {
      active = on
      if (!on) {
        if (rainFile) {
          rainFile.pause()
          rainFile = null
        }
        if (crowdFile) {
          crowdFile.pause()
          crowdFile = null
        }
        if (master) master.gain.value = 0
        started = false
        return
      }
      ensure()
      resume()
      if (master) master.gain.value = 0.42
      if (!rainFile) {
        rainFile = new Audio(`${LEVEL8_AUDIO}/rain.mp3`)
        rainFile.loop = true
        rainFile.volume = 0.22
        void rainFile.play().catch(() => {
          rainFile = null
        })
      }
      if (!crowdFile) {
        crowdFile = new Audio(`${LEVEL8_AUDIO}/crowd.mp3`)
        crowdFile.loop = true
        crowdFile.volume = 0.16
        void crowdFile.play().catch(() => {
          crowdFile = null
        })
      }
    },
    /**
     * @param {number} dt
     * @param {{ rainHeavy?: boolean, peopleNear?: number, soak?: boolean, honk?: boolean, barkKind?: 'kid' | 'adult' | null, thunder?: boolean }} state
     */
    update(dt, state) {
      if (!active) return
      ensure()
      resume()
      started = true
      thunderCool = Math.max(0, thunderCool - dt)
      if (rainGain) {
        const target = state.rainHeavy ? 0.48 : 0.16
        rainGain.gain.value += (target - rainGain.gain.value) * Math.min(1, dt * 2)
      }
      if (rainFile) rainFile.volume = state.rainHeavy ? 0.52 : 0.2
      if (crowdGain) {
        const near = Math.max(0, 1 - (state.peopleNear ?? 20) / 18)
        crowdGain.gain.value = 0.05 + near * (state.rainHeavy ? 0.14 : 0.08)
      }
      if (state.soak) playSplash()
      if (state.honk) playRandomHonk()
      if (state.thunder) playThunder(true)
      if (state.barkKind) playVoice(state.barkKind, state.rainHeavy ? 1 : 0.85)

      nextVoice -= dt
      nextKid -= dt
      nextHonk -= dt
      if (nextVoice <= 0) {
        nextVoice = state.rainHeavy ? 2.2 + Math.random() * 3.2 : 5 + Math.random() * 7
        if ((state.peopleNear ?? 99) < (state.rainHeavy ? 28 : 16)) playVoice('adult', 0.7)
      }
      if (nextKid <= 0) {
        nextKid = state.rainHeavy ? 3 + Math.random() * 4 : 7 + Math.random() * 8
        if ((state.peopleNear ?? 99) < (state.rainHeavy ? 30 : 20)) playVoice('kid', 0.65)
      }
      if (nextHonk <= 0) {
        nextHonk = 8 + Math.random() * 12
        playRandomHonk()
      }
      void started
    },
    splash: playSplash,
    thunder: () => playThunder(true),
    dispose() {
      this.setActive(false)
      try {
        rainSrc?.stop()
        crowdSrc?.stop()
      } catch {
        // ignore
      }
      void ctx?.close()
      ctx = null
    },
  }
}
