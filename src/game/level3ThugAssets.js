// level3ThugAssets.js — Mixamo Adam / Phara templates + locomotion + jab attack.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import {
  findFirstSkinnedMesh,
  findHipsBone,
  findPrimarySkinnedMesh,
  pickLocomotionClip,
  retargetClipToRoot,
  stripHipRootMotion,
} from '../mixamoAnimation.js'
import { prepareThugModel } from './modelPrep.js'
import { disposeObject3D } from './threeDispose.js'

const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

const JAB_URL = '/media/thugs/JabCross.glb'
const ATTACK_FADE = 0.1

/**
 * Mixamo GLBs served from public/media so they stay on disk
 * (the Characters/ folder is gitignored and OneDrive often drops it).
 */
export const LEVEL3_THUG_CHARACTERS = [
  {
    id: 'adam',
    label: 'Adam',
    url: '/media/thugs/Adam.glb',
  },
  {
    id: 'phara',
    label: 'Phara',
    url: '/media/thugs/Phara.glb',
  },
]

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(DRACO_DECODER)
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * @typedef {{
 *   root: THREE.Object3D
 *   clip: THREE.AnimationClip | null
 *   attackClip: THREE.AnimationClip | null
 *   sourceClip?: THREE.AnimationClip | null
 *   id: string
 * }} ThugTemplate
 */

/** @type {Map<string, ThugTemplate>} */
const templates = new Map()
/** @type {Map<string, Promise<ThugTemplate | null>>} */
const inflight = new Map()
/** @type {THREE.AnimationClip | null} */
let jabSourceClip = null
/** @type {Promise<THREE.AnimationClip | null> | null} */
let jabLoadPromise = null
let thugsReady = false

/**
 * @param {string} url
 * @returns {Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>}
 */
function loadGltf(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject)
  })
}

/**
 * Prefer a jab / punch / cross clip; otherwise the first animation in the file.
 * @param {THREE.AnimationClip[]} animations
 */
function pickAttackClip(animations) {
  if (!animations?.length) return null
  const named = animations.find((c) =>
    /jab|punch|cross|attack|hit/i.test(c.name || '')
  )
  return named ?? animations[0]
}

async function loadJabSourceClip() {
  if (jabSourceClip) return jabSourceClip
  if (jabLoadPromise) return jabLoadPromise
  jabLoadPromise = (async () => {
    try {
      const gltf = await loadGltf(JAB_URL)
      const clip = pickAttackClip(gltf.animations)
      if (!clip) return null
      jabSourceClip = clip
      return clip
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Level3Thug] Failed to load JabCross.glb', err)
      }
      return null
    } finally {
      jabLoadPromise = null
    }
  })()
  return jabLoadPromise
}

/**
 * Retarget jab onto a skeleton / full bone tree. Always strip hip root motion
 * so the punch stays in place.
 * @param {THREE.AnimationClip} source
 * @param {THREE.Object3D} root
 */
function retargetAttackClip(source, root) {
  const clip = stripHipRootMotion(retargetClipToRoot(source, root))
  if (clip.tracks.length === 0) return null
  clip.name = 'jab-cross'
  return clip
}

/**
 * @param {typeof LEVEL3_THUG_CHARACTERS[number]} def
 * @returns {Promise<ThugTemplate | null>}
 */
async function loadThugTemplate(def) {
  const cached = templates.get(def.id)
  if (cached) return cached
  const pending = inflight.get(def.id)
  if (pending) return pending

  const promise = (async () => {
    try {
      const gltf = await loadGltf(def.url)
      const root = gltf.scene
      if (!findPrimarySkinnedMesh(root) && !findFirstSkinnedMesh(root)) {
        disposeObject3D(root)
        return null
      }

      prepareThugModel(root)
      const sourceClip = pickLocomotionClip(gltf.animations)
      let clip = sourceClip
      if (clip) {
        const retargeted = stripHipRootMotion(retargetClipToRoot(clip, root))
        if (retargeted.tracks.length > 0) clip = retargeted
      }

      const template = {
        root,
        clip,
        attackClip: null,
        sourceClip,
        id: def.id,
      }
      templates.set(def.id, template)
      return template
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Level3Thug] Failed to prepare', def.id, err)
      }
      return null
    } finally {
      inflight.delete(def.id)
    }
  })()

  inflight.set(def.id, promise)
  return promise
}

/**
 * Adam's embedded run is the odd Mixamo cycle. Phara's locomotion is the
 * good drunk-run — retarget it onto Adam's full bone tree (not the first
 * partial skin, which omits Hips and breaks the gait).
 */
function sharePharaRunOnAdam() {
  const phara = templates.get('phara')
  const adam = templates.get('adam')
  const src = phara?.sourceClip ?? phara?.clip
  if (!src || !adam?.root) return

  const retargeted = stripHipRootMotion(retargetClipToRoot(src, adam.root))
  if (retargeted.tracks.length === 0) {
    if (import.meta.env.DEV) {
      const sm = findPrimarySkinnedMesh(adam.root)
      console.warn(
        '[Level3Thug] Could not retarget Phara run onto Adam. Bones:',
        sm?.skeleton?.bones.map((b) => b.name)
      )
    }
    return
  }
  retargeted.name = 'phara-run'
  adam.clip = retargeted
  if (import.meta.env.DEV) {
    console.log(
      `[Level3Thug] Adam now uses Phara run (${retargeted.tracks.length} tracks)`
    )
  }
}

async function attachJabClips() {
  const src = await loadJabSourceClip()
  if (!src) return

  for (const [id, template] of templates) {
    if (!template.root) continue
    template.attackClip = retargetAttackClip(src, template.root)
    if (import.meta.env.DEV) {
      console.log(
        `[Level3Thug] ${id} jab tracks: ${template.attackClip?.tracks.length ?? 0}`
      )
    }
  }

  // If Adam's jab is thin, fall back to Phara's jab retargeted onto Adam's bones.
  const adam = templates.get('adam')
  const phara = templates.get('phara')
  const pharaTracks = phara?.attackClip?.tracks.length ?? 0
  const adamTracks = adam?.attackClip?.tracks.length ?? 0
  if (adam?.root && phara?.attackClip && adamTracks < pharaTracks * 0.5) {
    const fromPhara = stripHipRootMotion(
      retargetClipToRoot(phara.attackClip, adam.root)
    )
    if (fromPhara.tracks.length > 0) {
      fromPhara.name = 'jab-cross'
      adam.attackClip = fromPhara
      if (import.meta.env.DEV) {
        console.log(
          `[Level3Thug] Adam jab fallback from Phara (${adam.attackClip.tracks.length} tracks)`
        )
      }
    }
  }
}

/** Kick off both Mixamo characters + jab clip. Safe to call more than once. */
export function preloadLevel3Thugs() {
  return Promise.all(LEVEL3_THUG_CHARACTERS.map((def) => loadThugTemplate(def))).then(
    async () => {
      sharePharaRunOnAdam()
      await attachJabClips()
      thugsReady = templates.size > 0
    }
  )
}

/** True once Mixamo characters are loaded and Adam has Phara's run clip. */
export function areLevel3ThugsReady() {
  return thugsReady
}

/** @param {string} characterId */
export function isLevel3ThugCached(characterId) {
  return templates.has(characterId)
}

/**
 * Alternate Adam / Phara clones. FAST is a smaller Adam, TANK a larger Phara.
 * @param {'normal' | 'fast' | 'tank'} thugType
 * @param {number} spawnIndex
 */
export function pickThugCharacterId(thugType, spawnIndex = 0) {
  if (thugType === 'fast') return 'adam'
  if (thugType === 'tank') return 'phara'
  return spawnIndex % 2 === 0 ? 'phara' : 'adam'
}

/**
 * @typedef {{
 *   root: THREE.Object3D
 *   mixer: THREE.AnimationMixer | null
 *   action: THREE.AnimationAction | null
 *   attackAction: THREE.AnimationAction | null
 *   hips: THREE.Object3D | null
 *   hipsBind: { x: number, z: number } | null
 * }} ThugCharacterInstance
 */

/**
 * Clone a cached Mixamo character with its own skeleton, materials, and mixer.
 * Geometry/textures stay shared with the template.
 *
 * @param {string} characterId
 * @returns {ThugCharacterInstance | null}
 */
export function createThugCharacterInstance(characterId) {
  const template = templates.get(characterId)
  if (!template?.root) return null

  const root = SkeletonUtils.clone(template.root)
  root.traverse((o) => {
    if (!o.isMesh) return
    o.visible = true
    o.frustumCulled = false
    o.castShadow = true
    o.receiveShadow = true
    if (!o.material) return
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => m.clone())
      : o.material.clone()
  })
  root.userData.usesSharedThugAssets = true
  root.userData.clonedMaterials = true

  let mixer = null
  let action = null
  let attackAction = null
  if (template.clip || template.attackClip) {
    mixer = new THREE.AnimationMixer(root)
    if (template.clip) {
      action = mixer.clipAction(template.clip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.play()
      if (template.clip.duration > 0) {
        action.time = Math.random() * template.clip.duration
      }
      action.paused = true
    }
    if (template.attackClip) {
      attackAction = mixer.clipAction(template.attackClip)
      attackAction.setLoop(THREE.LoopOnce, 1)
      attackAction.clampWhenFinished = true
      attackAction.enabled = false
      attackAction.weight = 0
    }
    mixer.update(0)
  }

  const hips = findHipsBone(root)
  return {
    root,
    mixer,
    action,
    attackAction,
    hips,
    hipsBind: hips
      ? { x: hips.position.x, z: hips.position.z }
      : null,
  }
}

/**
 * Crossfade locomotion → jab. Returns clip duration in seconds (mixer timeScale=1).
 * @param {{ mixer: THREE.AnimationMixer | null, action: THREE.AnimationAction | null, attackAction: THREE.AnimationAction | null }} inst
 * @returns {number}
 */
export function playThugAttack(inst) {
  const attack = inst?.attackAction
  const mixer = inst?.mixer
  if (!attack || !mixer) return 0

  const loco = inst.action
  const duration = attack.getClip()?.duration ?? 0
  mixer.timeScale = 1

  if (loco) {
    loco.paused = false
    loco.fadeOut(ATTACK_FADE)
  }

  attack.reset()
  attack.enabled = true
  attack.setEffectiveWeight(1)
  attack.fadeIn(ATTACK_FADE)
  attack.play()
  return duration
}

/**
 * Stop jab early and resume locomotion (player fled).
 * @param {{ mixer: THREE.AnimationMixer | null, action: THREE.AnimationAction | null, attackAction: THREE.AnimationAction | null, chaseTimeScale?: number }} inst
 */
export function cancelThugAttack(inst) {
  const attack = inst?.attackAction
  const loco = inst?.action
  if (attack) {
    attack.fadeOut(0.08)
    attack.stop()
    attack.enabled = false
    attack.weight = 0
  }
  if (loco) {
    loco.enabled = true
    loco.paused = false
    loco.setEffectiveWeight(1)
    loco.fadeIn(0.08)
    if (!loco.isRunning()) loco.play()
  }
  if (inst?.mixer && typeof inst.chaseTimeScale === 'number') {
    inst.mixer.timeScale = inst.chaseTimeScale
  }
}

/**
 * Jab finished — return to locomotion weight (paused until chase resumes).
 * @param {{ mixer: THREE.AnimationMixer | null, action: THREE.AnimationAction | null, attackAction: THREE.AnimationAction | null, chaseTimeScale?: number }} inst
 */
export function endThugAttack(inst) {
  const attack = inst?.attackAction
  const loco = inst?.action
  if (attack) {
    attack.fadeOut(ATTACK_FADE)
    attack.enabled = false
  }
  if (loco) {
    loco.enabled = true
    loco.setEffectiveWeight(1)
    loco.fadeIn(ATTACK_FADE)
    if (!loco.isRunning()) loco.play()
    loco.paused = true
  }
  if (inst?.mixer && typeof inst.chaseTimeScale === 'number') {
    inst.mixer.timeScale = inst.chaseTimeScale
  }
}

/**
 * Free instance materials only — template geometry must stay alive.
 * @param {THREE.Object3D} root
 */
export function disposeThugCharacterInstance(root) {
  if (!root) return
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) m?.dispose?.()
  })
}

/**
 * Mixamo clips often include hip translation. Gameplay moves the group, so
 * pin X/Z to avoid the mesh drifting off the collider.
 * @param {THREE.Object3D | null} hips
 * @param {{ x: number, z: number } | null} bind
 */
export function pinThugHips(hips, bind) {
  if (!hips || !bind) return
  hips.position.x = bind.x
  hips.position.z = bind.z
}
