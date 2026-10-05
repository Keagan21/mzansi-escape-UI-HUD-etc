// navArrow.js — Screen compass toward the current open-world objective.
// The dial's top is "ahead" on screen. Sessions pass the camera yaw so the
// needle stays correct when the view turns.

/** Hide the compass once the player is this close to the target (metres). */
const HIDE_WITHIN = 7

const compass = {
  owner: 0,
  visible: false,
  angle: 0,
  distance: 0,
  color: '#ffe566',
}

let nextOwner = 0

export function readNavCompass() {
  return compass
}

function colorCss(color) {
  const hex = (Number(color) >>> 0).toString(16).padStart(6, '0').slice(-6)
  return `#${hex}`
}

/**
 * @param {import('three').Object3D} [_parent]
 * @param {{ color?: number }=} opts
 */
export function createNavArrow(_parent, opts = {}) {
  const id = ++nextOwner
  const color = colorCss(opts.color ?? 0xffe566)

  const hide = () => {
    if (compass.owner === id) compass.visible = false
  }

  /**
   * @param {{ x: number, z: number }} playerPos
   * @param {{ x: number, z: number } | null | undefined} target
   * @param {{ visible?: boolean, dt?: number, yaw?: number }=} state
   */
  const update = (playerPos, target, state = {}) => {
    const forceHide = state.visible === false
    if (forceHide || !target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) {
      hide()
      return
    }

    const dx = target.x - playerPos.x
    const dz = target.z - playerPos.z
    const dist = Math.hypot(dx, dz)
    if (dist < HIDE_WITHIN) {
      hide()
      return
    }

    const yaw = Number.isFinite(state.yaw) ? state.yaw : 0
    // Chase cam sits at player - (sin yaw, cos yaw) and looks along that
    // direction, so screen-right is (-cos yaw, sin yaw).
    const screenX = -dx * Math.cos(yaw) + dz * Math.sin(yaw)
    const screenY = dx * Math.sin(yaw) + dz * Math.cos(yaw)

    compass.owner = id
    compass.visible = true
    compass.angle = Math.atan2(screenX, screenY)
    compass.distance = Math.round(dist)
    compass.color = color
  }

  return {
    update,
    setVisible: (on) => {
      if (!on) hide()
    },
    dispose: hide,
  }
}
