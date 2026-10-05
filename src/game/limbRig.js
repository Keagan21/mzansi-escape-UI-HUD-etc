// limbRig.js — Procedural run bob + humanoid bone resolution and limb gait (no React).

import * as THREE from 'three'

/** Lateral distance from lane center (world X) that counts as “moving” for the run. */
export const LANE_STRAFE_FOR_RUN_EPS = 0.08
/** Bump when bone patterns / arm logic change so cached skeletons re-resolve. */
const LIMB_RIG_VERSION = 3

const _eLimb = new THREE.Euler()
const _qLimbD = new THREE.Quaternion()
const _qLimbM = new THREE.Quaternion()

/**
 * Light root motion; limb bones carry most of the run. Keeps the body from “jelly wobble”.
 */
export function proceduralRunState(t) {
  const s = t * 15.2
  return {
    bob: 0.04 * Math.sin(s),
    pitch: 0.035 * Math.sin(s * 0.5),
    roll: 0.03 * Math.sin(s * 0.5 + 0.3),
  }
}

/**
 * Resolves common humanoid bones (Mixamo, Bip, many GLBs) for leg/arm control.
 * Returns a map of slot name → bone or null.
 */
function resolveLimbBones(skeleton) {
  const list = skeleton.bones
  const first = (patterns) => {
    for (const re of patterns) {
      const b = list.find((bo) => re.test(bo.name))
      if (b) return b
    }
    return null
  }
  return {
    lThigh: first([
      /^.*LeftUpLeg$/i,
      /Bip0?1?_L_Thigh/i,
      /LThigh/i,
      /_L_UpperLeg$/i,
    ]),
    rThigh: first([
      /^.*RightUpLeg$/i,
      /Bip0?1?_R_Thigh/i,
      /RThigh/i,
      /_R_UpperLeg$/i,
    ]),
    lShin: first([
      /(^|[.:])LeftLeg$/i,
      /Bip0?1?_L_Calf/i,
      /LeftCalf$/i,
    ]),
    rShin: first([
      /(^|[.:])RightLeg$/i,
      /Bip0?1?_R_Calf/i,
      /RightCalf$/i,
    ]),
    lUArm: first([
      /(^|[.:])LeftArm$/i,
      /Bip0?1?_L_UpperArm/i,
      /J_Bip_L_UpperArm/i,
      /_L_UpperArm$/i,
      /UpperArm[._-]?L$|LeftUpperArm$/i,
      /(^|[.:])LeftShoulder$/i,
    ]),
    rUArm: first([
      /(^|[.:])RightArm$/i,
      /Bip0?1?_R_UpperArm/i,
      /J_Bip_R_UpperArm/i,
      /_R_UpperArm$/i,
      /UpperArm[._-]?R$|RightUpperArm$/i,
      /(^|[.:])RightShoulder$/i,
    ]),
    lLArm: first([
      /(^|[.:])LeftForeArm$/i,
      /Bip0?1?_L_Forearm/i,
      /_L_LowerArm$/i,
      /J_Bip_L_LowerArm/i,
      /elbow_?L|lower_arm\.?L|LowerArm_L/i,
    ]),
    rLArm: first([
      /(^|[.:])RightForeArm$/i,
      /Bip0?1?_R_Forearm/i,
      /_R_LowerArm$/i,
      /J_Bip_R_LowerArm/i,
      /elbow_?R|lower_arm\.?R|LowerArm_R/i,
      /(lower|low)_?arm_?R/i,
    ]),
  }
}

function findSideUpperByHeuristic(skeleton, isLeft) {
  const reSide = isLeft
    ? /(left|J_Bip_L_|Bip0?1?_L_|[._-]L[._-]|^L$|LArm|LShoulder|_l$|\.l\.| Arm_L|arm_L)/i
    : /(right|J_Bip_R_|Bip0?1?_R_|[._-]R[._-]|^R$|RArm|RShoulder|_r$|\.r\.| Arm_R|arm_R)/i
  const reBad =
    /(fore|forearm|lower|elbow|hand|fingers|wrist|thumb|index|ring|pinky|upleg|leg$|calf|foot|toe|knee|spine|hip|head|neck|pevis|ik|end|tip|roll|twist|helper|ctrl)/i
  for (const b of skeleton.bones) {
    if (!reSide.test(b.name) || reBad.test(b.name)) continue
    if (/(humer|upper_?arm|bicep|delt|should(?!er blade)|[._-]arml)/i.test(b.name)) {
      return b
    }
  }
  for (const b of skeleton.bones) {
    if (!reSide.test(b.name) || reBad.test(b.name)) continue
    if (/(^|[.:]|[._])Arm([._-]|$)/i.test(b.name) && !/fore/i.test(b.name)) {
      return b
    }
  }
  return null
}

function firstForeForSide(skeleton, isLeft) {
  const re = isLeft
    ? /(fore[._-]?L|low(er)?_?arm[._-]?L|J_Bip_L_Fore|LeftFore|forearm[._-]?l)/i
    : /(fore[._-]?R|low(er)?_?arm[._-]?R|J_Bip_R_Fore|RightFore|forearm[._-]?r)/i
  return skeleton.bones.find((b) => re.test(b.name) && !/finger|thumb|hand(?!le)/i.test(b.name)) ?? null
}

function supplementLimbBones(bones, skeleton) {
  if (!bones.lLArm) {
    const ll = firstForeForSide(skeleton, true)
    if (ll) bones.lLArm = ll
  }
  if (!bones.rLArm) {
    const rr = firstForeForSide(skeleton, false)
    if (rr) bones.rLArm = rr
  }
  if (!bones.lUArm && bones.lLArm?.parent?.isBone) {
    bones.lUArm = bones.lLArm.parent
  }
  if (!bones.rUArm && bones.rLArm?.parent?.isBone) {
    bones.rUArm = bones.rLArm.parent
  }
  if (!bones.lLArm && bones.lUArm) {
    for (const ch of bones.lUArm.children) {
      if (ch.isBone) {
        bones.lLArm = ch
        break
      }
    }
  }
  if (!bones.rLArm && bones.rUArm) {
    for (const ch of bones.rUArm.children) {
      if (ch.isBone) {
        bones.rLArm = ch
        break
      }
    }
  }
  if (!bones.lUArm) {
    bones.lUArm = findSideUpperByHeuristic(skeleton, true)
  }
  if (!bones.rUArm) {
    bones.rUArm = findSideUpperByHeuristic(skeleton, false)
  }
}

function initLimbRig(skeleton) {
  if (!skeleton) return
  if (!skeleton.userData) {
    skeleton.userData = {}
  }
  if (
    skeleton.userData.limbRigInited &&
    skeleton.userData.limbRigVersion === LIMB_RIG_VERSION
  ) {
    return
  }
  if (skeleton.userData.limbRigVersion !== LIMB_RIG_VERSION) {
    skeleton.userData.limbLogDone = false
  }
  skeleton.userData.limbRigInited = false
  const bones = resolveLimbBones(skeleton)
  supplementLimbBones(bones, skeleton)
  const labels = {}
  for (const [slot, bone] of Object.entries(bones)) {
    if (bone) {
      bone.userData.gaitBaseQ = bone.quaternion.clone()
      labels[slot] = bone.name
    } else {
      labels[slot] = null
    }
  }
  const n = Object.values(bones).filter(Boolean).length
  skeleton.userData.limbBones = bones
  skeleton.userData.limbRigInited = true
  skeleton.userData.limbRigVersion = LIMB_RIG_VERSION
  skeleton.userData.limbResolvedCount = n
  skeleton.userData.limbLabels = labels
  if (import.meta.env.DEV && !skeleton.userData.limbLogDone) {
    skeleton.userData.limbLogDone = true
    if (n > 0) {
      console.log(
        `[LimbRig] Mapped ${n} / 8 bones:`,
        Object.entries(labels)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}=${v}`)
      )
    } else {
      console.warn(
        '[LimbRig] No leg/arm bones matched; check bone names. Root bob only for run.'
      )
    }
  }
}

function setBoneGait(bone, baseQ, ex, ey, ez, order = 'XYZ') {
  if (!bone || !baseQ) return
  _eLimb.set(ex, ey, ez, order)
  _qLimbD.setFromEuler(_eLimb)
  _qLimbM.copy(baseQ).multiply(_qLimbD)
  bone.quaternion.copy(_qLimbM)
}

/**
 * Drives a simple run cycle from stored bind quaternions (confirms those bones move when running).
 */
export function applyLimbRunGait(skeleton, t, active) {
  if (!skeleton) return
  initLimbRig(skeleton)
  const g = skeleton.userData.limbBones
  if (!g) return
  if (!active) {
    for (const k of Object.keys(g)) {
      const b = g[k]
      if (b?.userData.gaitBaseQ) {
        b.quaternion.copy(b.userData.gaitBaseQ)
      }
    }
    return
  }
  const p = t * 14.2
  const s = Math.sin(p)
  const c = Math.cos(p)
  const th = 0.5
  const kn = 0.65
  const fE = 0.58
  const sTh = th * s
  const sThN = th * -s
  setBoneGait(g.lThigh, g.lThigh?.userData.gaitBaseQ, sTh, 0, 0.07 * c)
  setBoneGait(g.rThigh, g.rThigh?.userData.gaitBaseQ, sThN, 0, -0.07 * c)
  setBoneGait(
    g.lShin,
    g.lShin?.userData.gaitBaseQ,
    kn * Math.max(0, -s) + 0.07 * Math.max(0, c),
    0,
    0
  )
  setBoneGait(
    g.rShin,
    g.rShin?.userData.gaitBaseQ,
    kn * Math.max(0, s) + 0.07 * Math.max(0, -c),
    0,
    0
  )
  const aSh = 0.4
  const shRoll = 0.11
  setBoneGait(
    g.lUArm,
    g.lUArm?.userData.gaitBaseQ,
    -aSh * s,
    shRoll * c,
    shRoll * 0.85 * s,
    'YXZ'
  )
  setBoneGait(
    g.rUArm,
    g.rUArm?.userData.gaitBaseQ,
    aSh * s,
    -shRoll * c,
    -shRoll * 0.85 * s,
    'YXZ'
  )
  const bElb = 0.34
  setBoneGait(
    g.lLArm,
    g.lLArm?.userData.gaitBaseQ,
    bElb + fE * (0.85 * Math.max(0, -s) + 0.2 * Math.max(0, s)),
    0.1 * c,
    0.1 * s,
    'YXZ'
  )
  setBoneGait(
    g.rLArm,
    g.rLArm?.userData.gaitBaseQ,
    bElb + fE * (0.85 * Math.max(0, s) + 0.2 * Math.max(0, -s)),
    -0.1 * c,
    -0.1 * s,
    'YXZ'
  )
}
