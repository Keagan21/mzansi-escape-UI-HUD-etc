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

/** Mixamo spine/toe names that correspond to the Kenney rig. */
const WORLD_RETARGET_ALIASES = {
  spine1: 'chest',
  spine2: 'upperchest',
  lefttoebase: 'lefttoes',
  righttoebase: 'righttoes',
}

/**
 * True when the target skeleton's hip bind is far from the clip's hip bind.
 * Kenney hips rest at 180° around Z; Mixamo hips rest near identity.
 * @param {Map<string, THREE.Quaternion>} sourceRest
 * @param {Record<string, THREE.Quaternion>} targetRest
 */
export function rigRestDiffers(sourceRest, targetRest) {
  const sourceHips = sourceRest?.get?.('hips')
  if (!sourceHips || !targetRest) return false
  const targetName = Object.keys(targetRest).find((name) => canonicalBoneKey(name) === 'hips')
  const targetHips = targetName ? targetRest[targetName] : null
  if (!targetHips) return false
  return Math.abs(sourceHips.dot(targetHips)) < 0.92
}

/**
 * Bake a clip onto another skeleton by transferring each joint's world-space
 * swing from its own rest pose. Local rebasing leaves Kenney limbs on the
 * wrong axis because that rig's bind rotations do not match Mixamo.
 * @param {THREE.AnimationClip} clip
 * @param {THREE.Object3D} sourceRoot rest pose of the clip's rig
 * @param {THREE.Object3D} targetRoot rest pose of the character
 * @param {number} [fps]
 */
export function retargetClipWorldSpace(clip, sourceRoot, targetRoot, fps = 30) {
  if (!clip?.tracks?.length || !sourceRoot || !targetRoot) {
    return new THREE.AnimationClip(clip?.name || 'loco', clip?.duration || 0, [])
  }
  sourceRoot.updateMatrixWorld(true)
  targetRoot.updateMatrixWorld(true)

  /** @type {Map<string, THREE.Object3D>} */
  const sourceByKey = new Map()
  /** @type {THREE.Object3D[]} */
  const sourceNodes = []
  sourceRoot.traverse((o) => {
    if (!o.name || o.isMesh || o.isCamera || o.isLight) return
    sourceNodes.push(o)
    const key = canonicalBoneKey(o.name)
    if (key && !sourceByKey.has(key)) sourceByKey.set(key, o)
  })
  /** @type {THREE.Bone[]} */
  const targetBones = []
  targetRoot.traverse((o) => {
    if (o.isBone) targetBones.push(o)
  })

  const sourceRestWorld = new Map()
  const sourceBindLocal = new Map()
  const q = new THREE.Quaternion()
  for (const node of sourceNodes) {
    sourceBindLocal.set(node, node.quaternion.clone())
    const key = canonicalBoneKey(node.name)
    if (!key || sourceRestWorld.has(key)) continue
    node.getWorldQuaternion(q)
    sourceRestWorld.set(key, q.clone())
  }
  const targetRestWorld = new Map()
  const targetBindLocal = new Map()
  for (const bone of targetBones) {
    targetBindLocal.set(bone, bone.quaternion.clone())
    bone.getWorldQuaternion(q)
    targetRestWorld.set(bone, q.clone())
  }

  const sourceFor = (bone) => {
    const key = canonicalBoneKey(bone.name)
    if (sourceByKey.has(key)) return sourceByKey.get(key)
    for (const [src, dst] of Object.entries(WORLD_RETARGET_ALIASES)) {
      if (dst === key && sourceByKey.has(src)) return sourceByKey.get(src)
    }
    return null
  }

  const driven = targetBones.filter((bone) => sourceFor(bone))
  const frames = Math.max(2, Math.round(clip.duration * fps))
  const times = []
  for (let i = 0; i < frames; i++) times.push((clip.duration * i) / frames)
  times.push(clip.duration)

  const mixer = new THREE.AnimationMixer(sourceRoot)
  const action = mixer.clipAction(clip)
  action.setLoop(THREE.LoopRepeat, Infinity)
  action.play()

  const values = new Map(driven.map((bone) => [bone, []]))
  const prev = new Map()
  const parentQ = new THREE.Quaternion()
  const desired = new THREE.Quaternion()
  const local = new THREE.Quaternion()

  const poseFrame = (time) => {
    mixer.setTime(time)
    sourceRoot.updateMatrixWorld(true)
    for (const bone of targetBones) bone.quaternion.copy(targetBindLocal.get(bone))
    targetRoot.updateMatrixWorld(true)
    for (const bone of targetBones) {
      const src = sourceFor(bone)
      if (!src) continue
      const ws = new THREE.Quaternion()
      src.getWorldQuaternion(ws)
      const srcKey = canonicalBoneKey(src.name)
      desired
        .copy(ws)
        .multiply(sourceRestWorld.get(srcKey).clone().invert())
        .multiply(targetRestWorld.get(bone))
      if (bone.parent?.getWorldQuaternion) bone.parent.getWorldQuaternion(parentQ)
      else parentQ.identity()
      local.copy(parentQ).invert().multiply(desired).normalize()
      const earlier = prev.get(bone)
      if (earlier && earlier.dot(local) < 0) {
        local.x = -local.x
        local.y = -local.y
        local.z = -local.z
        local.w = -local.w
      }
      prev.set(bone, local.clone())
      bone.quaternion.copy(local)
      bone.updateMatrixWorld(true)
      values.get(bone).push(local.x, local.y, local.z, local.w)
    }
  }

  for (let i = 0; i < frames; i++) poseFrame(times[i])
  for (const bone of driven) {
    const buf = values.get(bone)
    const end = new THREE.Quaternion(buf[0], buf[1], buf[2], buf[3])
    const last = new THREE.Quaternion(
      buf[buf.length - 4],
      buf[buf.length - 3],
      buf[buf.length - 2],
      buf[buf.length - 1]
    )
    if (last.dot(end) < 0) {
      end.x = -end.x
      end.y = -end.y
      end.z = -end.z
      end.w = -end.w
    }
    buf.push(end.x, end.y, end.z, end.w)
  }

  mixer.stopAllAction()
  for (const [node, quat] of sourceBindLocal) node.quaternion.copy(quat)
  for (const [bone, quat] of targetBindLocal) bone.quaternion.copy(quat)
  sourceRoot.updateMatrixWorld(true)
  targetRoot.updateMatrixWorld(true)

  const tracks = []
  for (const bone of driven) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values.get(bone)))
  }
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
