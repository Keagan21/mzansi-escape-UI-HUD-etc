// navArrow.js — Overhead direction arrow toward the current open-world objective.

import * as THREE from 'three'

/** Hide the arrow once the player is this close to the target (metres). */
const HIDE_WITHIN = 7
/** Height above ground / player feet so the tip sits over the avatar’s head. */
const DEFAULT_HEIGHT = 2.9
/** Slight bob so the cue reads as a living HUD marker. */
const BOB_AMP = 0.12
const BOB_SPEED = 3.2

/**
 * Build a bright chevron that floats above the player and yaws toward a goal.
 * Keeps existing distance meters; this is only a directional cue.
 *
 * @param {THREE.Object3D} parent
 * @param {{ color?: number, height?: number }=} opts
 */
export function createNavArrow(parent, opts = {}) {
  const color = opts.color ?? 0xffe566
  const baseHeight = opts.height ?? DEFAULT_HEIGHT

  const group = new THREE.Group()
  group.name = 'openworld-nav-arrow'
  group.renderOrder = 20

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })

  // Tip points along local −Z so rotation.y matches open-world characterYaw.
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 4), mat)
  tip.rotation.x = -Math.PI / 2
  tip.position.z = -0.55
  tip.renderOrder = 20

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.55), mat)
  shaft.position.z = -0.05
  shaft.renderOrder = 20

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), mat)
  stem.position.y = -0.35
  stem.renderOrder = 20

  group.add(tip, shaft, stem)
  group.visible = false
  parent.add(group)

  let pulseT = 0

  /**
   * @param {{ x: number, y?: number, z: number }} playerPos
   * @param {{ x: number, z: number } | null | undefined} target
   * @param {{ visible?: boolean, dt?: number }=} state
   */
  const update = (playerPos, target, state = {}) => {
    const forceHide = state.visible === false
    const dt = state.dt ?? 0
    pulseT += dt

    if (forceHide || !target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) {
      group.visible = false
      return
    }

    const dx = target.x - playerPos.x
    const dz = target.z - playerPos.z
    const dist = Math.hypot(dx, dz)
    if (dist < HIDE_WITHIN) {
      group.visible = false
      return
    }

    group.visible = true
    const bob = Math.sin(pulseT * BOB_SPEED) * BOB_AMP
    const py = Number.isFinite(playerPos.y) ? playerPos.y : 1.7
    group.position.set(playerPos.x, py + baseHeight - 1.7 + bob, playerPos.z)
    // Same facing basis as movement: forward = (−sin θ, −cos θ).
    group.rotation.y = Math.atan2(-dx, -dz)
    mat.opacity = 0.78 + Math.sin(pulseT * 2.4) * 0.14
  }

  const setVisible = (on) => {
    group.visible = Boolean(on)
  }

  const dispose = () => {
    parent.remove(group)
    tip.geometry.dispose()
    shaft.geometry.dispose()
    stem.geometry.dispose()
    mat.dispose()
  }

  return { group, update, setVisible, dispose }
}
