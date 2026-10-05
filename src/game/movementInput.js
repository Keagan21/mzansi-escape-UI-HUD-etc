// movementInput.js — Shared forward/back axis with optional auto-forward.

/**
 * Resolve forward/back for gameplay.
 * Back always overrides auto-forward and held forward (real reverse, not cancel).
 *
 * @param {{ forward?: boolean, back?: boolean }} keys
 * @param {boolean} autoForward
 * @returns {-1 | 0 | 1} +1 = character forward, −1 = back, 0 = idle
 */
export function resolveForwardAxis(keys, autoForward) {
  if (keys?.back) return -1
  if (autoForward || keys?.forward) return 1
  return 0
}
