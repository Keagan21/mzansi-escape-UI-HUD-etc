// level8Beats.js — Clinic / school / crate / spaza interact flags.

import { LEVEL8_ANCHORS, LEVEL8_INTERACT_RADIUS } from './level8City.js'

export function createLevel8Beats() {
  return {
    clinic: false,
    school: false,
    crate: false,
    spaza: false,
    carrying: false,
  }
}

/** @param {ReturnType<typeof createLevel8Beats>} beats */
export function neighboursDone(beats) {
  return Number(beats.clinic) + Number(beats.school) + Number(beats.spaza)
}

/** @param {ReturnType<typeof createLevel8Beats>} beats */
export function navTarget(beats) {
  if (!beats.clinic) return LEVEL8_ANCHORS.clinic
  if (!beats.school) return LEVEL8_ANCHORS.school
  if (!beats.crate) return LEVEL8_ANCHORS.crate
  if (!beats.spaza) return LEVEL8_ANCHORS.spaza
  return LEVEL8_ANCHORS.home
}

function near(px, pz, spot, radius = LEVEL8_INTERACT_RADIUS) {
  return Math.hypot(px - spot.x, pz - spot.z) <= radius
}

/**
 * @param {ReturnType<typeof createLevel8Beats>} beats
 * @param {number} px
 * @param {number} pz
 */
export function interactPrompt(beats, px, pz) {
  if (!beats.clinic && near(px, pz, LEVEL8_ANCHORS.clinic)) return 'E — talk to the clinic nurse'
  if (beats.clinic && !beats.school && near(px, pz, LEVEL8_ANCHORS.school)) {
    return 'E — check the school'
  }
  if (beats.school && !beats.crate && near(px, pz, LEVEL8_ANCHORS.crate)) {
    return 'E — pick up the dry crate'
  }
  if (beats.carrying && !beats.spaza && near(px, pz, LEVEL8_ANCHORS.spaza)) {
    return 'E — give the crate to the spaza owner'
  }
  if (beats.school && beats.crate && !beats.spaza && near(px, pz, LEVEL8_ANCHORS.spaza)) {
    return 'The owner needs the crate from the dry side of the lot'
  }
  if (neighboursDone(beats) >= 3 && near(px, pz, LEVEL8_ANCHORS.home, 14)) {
    return 'Home is on the stoep — walk in'
  }
  return ''
}

/**
 * @param {ReturnType<typeof createLevel8Beats>} beats
 * @param {number} px
 * @param {number} pz
 * @returns {{ kind: 'clinic' | 'school' | 'crate' | 'spaza' | 'blocked' | null, message: string }}
 */
export function tryInteract(beats, px, pz) {
  if (!beats.clinic && near(px, pz, LEVEL8_ANCHORS.clinic)) {
    beats.clinic = true
    return {
      kind: 'clinic',
      message: 'Fridge is still on. Take Vilakazi Ridge, then School Road west.',
    }
  }
  if (!beats.clinic && near(px, pz, LEVEL8_ANCHORS.school)) {
    return { kind: 'blocked', message: 'Clinic first — east on Clinic Road.' }
  }
  if (beats.clinic && !beats.school && near(px, pz, LEVEL8_ANCHORS.school)) {
    beats.school = true
    return {
      kind: 'school',
      message: 'Kids are inside. South on Vilakazi Ridge, then Spaza Lane east.',
    }
  }
  if (!beats.school && near(px, pz, LEVEL8_ANCHORS.spaza)) {
    return { kind: 'blocked', message: 'School first — west on School Road.' }
  }
  if (beats.school && !beats.crate && near(px, pz, LEVEL8_ANCHORS.crate)) {
    beats.crate = true
    beats.carrying = true
    return { kind: 'crate', message: 'Got the crate. Stay on Spaza Lane back to the shop.' }
  }
  if (beats.carrying && !beats.spaza && near(px, pz, LEVEL8_ANCHORS.spaza)) {
    beats.spaza = true
    beats.carrying = false
    return {
      kind: 'spaza',
      message: 'Crate’s in. Vilakazi Ridge south to Home.',
    }
  }
  if (beats.school && beats.crate && !beats.carrying && !beats.spaza && near(px, pz, LEVEL8_ANCHORS.spaza)) {
    return { kind: 'blocked', message: 'The crate washed back. Fetch it again.' }
  }
  return { kind: null, message: '' }
}

/** Drop the crate back on the dry pad after a soak. */
export function dropCrate(beats) {
  if (!beats.carrying) return false
  beats.carrying = false
  beats.crate = false
  return true
}

export function resetLevel8Beats(beats) {
  beats.clinic = false
  beats.school = false
  beats.crate = false
  beats.spaza = false
  beats.carrying = false
}
