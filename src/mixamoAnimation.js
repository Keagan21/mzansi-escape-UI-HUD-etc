import * as THREE from 'three'

/**
 * Mixamo / glTF animations use track names like "mixamorigHips.quaternion".
 * Mixamo also prefixes a download index: "mixamorig7:Hips", "mixamorig9:Hips".
 * Some pipelines use ".bones[Name].quaternion" instead.
 * This module maps those tracks onto a target skeleton by bone name.
 */
export function findFirstSkinnedMesh(root) {
  let out = null
  root.traverse((o) => {
    if (!out && o.isSkinnedMesh && o.skeleton) out = o
  })
  return out
}

/**
 * Prefer a skin that includes Hips and the most joints. Mixamo multi-mesh
 * characters (e.g. Adam body/pants/hoodie) put incomplete subsets first —
 * retargeting against those drops hip/spine tracks and the gait looks broken.
 * @param {THREE.Object3D} root
 * @returns {THREE.SkinnedMesh | null}
 */
export function findPrimarySkinnedMesh(root) {
  /** @type {THREE.SkinnedMesh | null} */
  let best = null
  let bestScore = -1
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !o.skeleton?.bones?.length) return
    const bones = o.skeleton.bones
    const hasHips = bones.some((b) => canonicalBoneKey(b.name) === 'hips')
    const score = bones.length + (hasHips ? 1000 : 0)
    if (score > bestScore) {
      bestScore = score
      best = o
    }
  })
  return best ?? findFirstSkinnedMesh(root)
}

/**
 * Every Bone under the model root — safer retarget target than one partial skin.
 * @param {THREE.Object3D} root
 * @returns {THREE.Bone[]}
 */
export function collectSceneBones(root) {
  /** @type {THREE.Bone[]} */
  const bones = []
  root.traverse((o) => {
    if (o.isBone) bones.push(o)
  })
  return bones
}

/**
 * Retarget a clip onto all Mixamo bones in a character root.
 * @param {THREE.AnimationClip} clip
 * @param {THREE.Object3D} root
 */
export function retargetClipToRoot(clip, root) {
  const bones = collectSceneBones(root)
  if (bones.length === 0) {
    const sm = findPrimarySkinnedMesh(root)
    if (!sm?.skeleton) {
      return new THREE.AnimationClip(clip.name || 'run', clip.duration, [])
    }
    return retargetClipToBones(clip, sm.skeleton)
  }
  return retargetClipToBones(clip, { bones })
}

/**
 * Strip Mixamo namespaces so mixamorig7:Hips and mixamorig9:Hips both become "hips".
 * @param {string} name
 */
export function canonicalBoneKey(name) {
  return String(name)
    .replace(/^.*[|/]/, '')
    .replace(/^mixamorig\d*[_:]?/i, '')
    .replace(/^mixamo[_:]/i, '')
    .toLowerCase()
}

/**
 * Prefer a clip named like Run; otherwise the first clip in the file.
 */
export function pickRunClip(animations) {
  if (!animations?.length) return null
  const named = animations.find((c) => /run|jog|sprint/i.test(c.name || ''))
  return named ?? animations[0]
}

/**
 * Find the Mixamo / common hips bone under a model root.
 * @param {THREE.Object3D} root
 * @returns {THREE.Object3D | null}
 */
export function findHipsBone(root) {
  let hips = null
  root.traverse((o) => {
    if (hips || !o.name) return
    if (canonicalBoneKey(o.name) === 'hips') hips = o
  })
  return hips
}

/**
 * Drop hips translation tracks so Mixamo run cycles loop in place.
 * Root motion on Hips.position snaps back at each loop and looks like a hitch.
 * @param {THREE.AnimationClip} clip
 * @returns {THREE.AnimationClip}
 */
export function stripHipRootMotion(clip) {
  if (!clip?.tracks?.length) return clip
  const tracks = clip.tracks.filter((t) => {
    const name = t.name
    const mBones = name.match(/^\.bones\[([^\]]+)\]\.position$/)
    if (mBones) return canonicalBoneKey(mBones[1]) !== 'hips'
    if (!name.endsWith('.position')) return true
    const bone = name.slice(0, name.lastIndexOf('.'))
    return canonicalBoneKey(bone) !== 'hips'
  })
  if (tracks.length === clip.tracks.length) return clip
  return new THREE.AnimationClip(clip.name || 'run', clip.duration, tracks)
}

/**
 * Keep hips XZ on the bind pose after mixer updates (thug / player root-motion lock).
 * @param {THREE.Object3D | null | undefined} hips
 * @param {{ x: number, z: number } | null | undefined} bind
 */
export function pinHipsXZ(hips, bind) {
  if (!hips || !bind) return
  hips.position.x = bind.x
  hips.position.z = bind.z
}

/**
 * Prefer a locomotion clip (walk / run / sneak / drunk); otherwise the longest clip.
 */
export function pickLocomotionClip(animations) {
  if (!animations?.length) return null
  const named = animations.find((c) =>
    /run|walk|sneak|drunk|jog|sprint|forward|locomotion|torch/i.test(c.name || '')
  )
  if (named) return named
  return animations.reduce((a, b) => (b.duration > (a.duration ?? 0) ? b : a))
}

/**
 * @param {string} srcName
 * @param {Map<string, string>} boneMap lowerCaseName -> actual bone name
 */
function mapBoneNameToTarget(srcName, boneMap) {
  const tryKey = (key) => {
    const k = String(key).toLowerCase()
    if (boneMap.has(k)) return boneMap.get(k)
    const canon = canonicalBoneKey(k)
    if (canon && boneMap.has(canon)) return boneMap.get(canon)
    return null
  }
  let t = tryKey(srcName)
  if (t) return t

  const afterPath = String(srcName).replace(/^.*[|/]/, '')
  t = tryKey(afterPath)
  if (t) return t

  const cleaned = canonicalBoneKey(afterPath)
  t = tryKey(cleaned)
  if (t) return t

  if (!cleaned) return null
  for (const [lk, name] of boneMap) {
    if (lk === cleaned) return name
    if (lk.endsWith(`:${cleaned}`) || lk.endsWith(cleaned)) return name
  }
  return null
}

/**
 * Play a clip authored on another skeleton without adopting that skeleton's
 * rest pose. Mixamo torch walks sit near identity on the hips; Kenney hips
 * stand up only when their rest quaternion (180° around Z) is kept.
 * @param {THREE.AnimationClip} clip retargeted onto the target bone names
 * @param {Map<string, THREE.Quaternion>} sourceRest canonical bone key -> rest
 * @param {Record<string, THREE.Quaternion>} targetRest target bone name -> rest
 */
export function rebaseClipOntoBindPose(clip, sourceRest, targetRest) {
  if (!clip?.tracks?.length || !sourceRest?.size || !targetRest) return clip
  const qk = new THREE.Quaternion()
  const out = new THREE.Quaternion()
  const tracks = clip.tracks.map((track) => {
    if (!track.name.endsWith('.quaternion')) return track
    const boneName = track.name.slice(0, track.name.lastIndexOf('.'))
    const targetQ = targetRest[boneName]
    const sourceQ = sourceRest.get(canonicalBoneKey(boneName))
    if (!targetQ || !sourceQ) return track
    const invS = sourceQ.clone().invert()
    const values = track.values.slice()
    for (let i = 0; i < values.length; i += 4) {
      qk.set(values[i], values[i + 1], values[i + 2], values[i + 3])
      out.copy(targetQ).multiply(invS).multiply(qk).normalize()
      values[i] = out.x
      values[i + 1] = out.y
      values[i + 2] = out.z
      values[i + 3] = out.w
    }
    const next = track.clone()
    next.values = values
    return next
  })
  return new THREE.AnimationClip(clip.name || 'loco', clip.duration, tracks)
}

/**
 * Remaps {@link AnimationClip} tracks from one rig's naming convention to
 * {@link THREE.Skeleton} bone names on the target character.
 */
export function retargetClipToBones(clip, skeleton) {
  const boneMap = new Map()
  for (const b of skeleton.bones) {
    boneMap.set(b.name.toLowerCase(), b.name)
    const canon = canonicalBoneKey(b.name)
    if (canon && !boneMap.has(canon)) boneMap.set(canon, b.name)
  }
  const tracks = []
  for (const track of clip.tracks) {
    const name = track.name

    // FBX-style: .bones[LeftArm].quaternion
    const mBones = name.match(/^\.bones\[([^\]]+)\](.+)$/)
    if (mBones) {
      const target = mapBoneNameToTarget(mBones[1], boneMap)
      if (!target) continue
      const t = track.clone()
      t.name = `.bones[${target}]${mBones[2]}`
      tracks.push(t)
      continue
    }

    // glTF / Three: "NodeName.position" | ".quaternion" | ".scale"
    const lastDot = name.lastIndexOf('.')
    if (lastDot <= 0) continue
    const prop = name.slice(lastDot + 1)
    if (prop !== 'position' && prop !== 'quaternion' && prop !== 'scale') continue
    const srcName = name.slice(0, lastDot)
    const target = mapBoneNameToTarget(srcName, boneMap)
    if (!target) continue
    const t = track.clone()
    t.name = `${target}.${prop}`
    tracks.push(t)
  }
  return new THREE.AnimationClip(clip.name || 'run', clip.duration, tracks)
}
