// GameplayHint.jsx — In-run control hint strip.

import { useEffect, useRef, useState } from 'react'
import { getLevelConfig } from '../game/levels.js'
import { LEVEL3_BUS_FARE } from '../game/level3Coins.js'
import { HudToastClose } from './HudToastClose.jsx'

function moveHint(autoForward) {
  return autoForward
    ? 'Auto-forward on · S reverse · A / D'
    : 'W / S · A / D'
}

function openWorldMoveHint(autoForward) {
  return autoForward
    ? 'Auto-forward on · S reverse · A/D rotate'
    : 'W/S move · A/D rotate'
}

export function GameplayHint({
  level = 1,
  autoForward = false,
  dismissed = false,
  onDismiss,
}) {
  const levelConfig = getLevelConfig(level)
  const canDismiss =
    (level === 4 || level === 5 || level === 6 || level === 8) && typeof onDismiss === 'function'
  const [hidden, setHidden] = useState(false)

  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!canDismiss) {
      setHidden(false)
      return undefined
    }
    setHidden(false)
    const t = window.setTimeout(() => {
      setHidden(true)
      onDismissRef.current?.()
    }, 5000)
    return () => window.clearTimeout(t)
  }, [canDismiss, level])

  if (dismissed || hidden) return null

  const className = canDismiss ? 'subway-hint subway-hint--toast' : 'subway-hint'
  const dismiss = () => {
    setHidden(true)
    onDismiss?.()
  }

  if (level === 8) {
    return (
      <div className={className} role="status">
        <p className="subway-hint__text">
          Soweto Homecoming · Follow the yellow ridge · Check clinic, school, then
          fetch the spaza crate · Deep water soaks you · Neighbours shout from the
          stoeps · E talks / reads notes · WASD move · Shift sprint · P pause · R restart
        </p>
        <HudToastClose onClose={dismiss} />
      </div>
    )
  }

  if (level === 6) {
    return (
      <div className={className} role="status">
        <p className="subway-hint__text">
          Cape Flats · You cannot fight · Stay out of the red vision cones · Walls and
          crouching behind car hulks hide you · Sprinting is loud · Green porch lights mark
          the safe path · E reads community notes · WASD move · C / Ctrl crouch · Shift
          sprint · P pause · R restart
        </p>
        <HudToastClose onClose={dismiss} />
      </div>
    )
  }

  if (level === 5) {
    return (
      <div className={className} role="status">
        <p className="subway-hint__text">
          Cape Town Stage 6 · Q toggles torch (drains battery) · Collect AA batteries ·
          Looters chase light · Restore 3 substations · Reach Cape Town Stadium · Click
          to look · {openWorldMoveHint(autoForward)} · Shift sprint · LMB / Space punch · Q walk
          away from puzzles · P pause · R restart
        </p>
        <HudToastClose onClose={dismiss} />
      </div>
    )
  }

  if (level === 4) {
    return (
      <div className={className} role="status">
        <p className="subway-hint__text">
          Cape Town Day Zero · Thirst drains in the heat · Collect water bottles ·
          Optional rand coins go to your store wallet · At Newlands watch the
          lights then repeat them · Time Steenbras while the lamp is green · Click to
          look · {openWorldMoveHint(autoForward)} · Shift sprint · Q walk away · P pause · R
          restart
        </p>
        <HudToastClose onClose={dismiss} />
      </div>
    )
  }

  if (levelConfig.playerKind === 'openworld') {
    return (
      <p className={className} aria-hidden>
        Joburg CBD · Collect {LEVEL3_BUS_FARE} coins for the bus · Survive the
        amaphara · Reach Park Station · Click to look · {openWorldMoveHint(autoForward)} ·
        Shift sprint · LMB / Space punch · P pause · R restart
      </p>
    )
  }

  if (levelConfig.playerKind === 'car') {
    if (levelConfig.hazardKind === 'obstacle') {
      return (
        <p className="subway-hint" aria-hidden>
          Reach the end to finish · Dodge obstacles · Collect Coke bottles ·
          Crash costs 3 Coke to continue
          {levelConfig.potholesEnabled ? ' · Potholes slow you' : ''} ·{' '}
          {moveHint(autoForward)} · P pause · R restart
        </p>
      )
    }

    if (levelConfig.hazardKind === 'none') {
      return (
        <p className="subway-hint" aria-hidden>
          Reach the end to finish · Collect rand coins
          {levelConfig.potholesEnabled ? ' · Potholes slow you' : ''} ·{' '}
          {moveHint(autoForward)} · P pause · R restart
        </p>
      )
    }
  }

  return (
    <p className={className} aria-hidden>
      Reach the end to finish · Dodge taxis · Collect rand coins · Potholes slow
      you — jump (Space) to clear · {moveHint(autoForward)} · P pause · R restart
    </p>
  )
}
