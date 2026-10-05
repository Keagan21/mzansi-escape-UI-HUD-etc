// GameHudHealth.jsx — HP bar for Level 3 open-world combat.

import { useState, useEffect } from 'react'

export function GameHudHealth({ hp = 100, maxHp = 100, variant = 'hp' }) {
  const isThirst = variant === 'thirst'
  const [displayHp, setDisplayHp] = useState(hp)
  const [damageFlash, setDamageFlash] = useState(false)
  const shown = isThirst ? hp : displayHp

  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const displayPct = Math.max(0, Math.min(100, (shown / maxHp) * 100))
  const low = pct <= 30
  const critical = pct <= 15

  useEffect(() => {
    if (isThirst) return undefined
    if (Math.abs(hp - displayHp) <= 0.5) {
      if (displayHp !== hp) setDisplayHp(hp)
      return undefined
    }
    const step = hp > displayHp ? 2 : -2
    const interval = setInterval(() => {
      setDisplayHp((prev) => {
        const next = prev + step
        if ((step > 0 && next >= hp) || (step < 0 && next <= hp)) return hp
        return next
      })
    }, 16)
    return () => clearInterval(interval)
  }, [hp, isThirst])

  useEffect(() => {
    if (isThirst || hp >= displayHp) return undefined
    setDamageFlash(true)
    const timeout = setTimeout(() => setDamageFlash(false), 300)
    return () => clearTimeout(timeout)
  }, [hp, displayHp, isThirst])

  return (
    <div
      className={
        'game-hud-health' +
        (isThirst ? ' game-hud-health--thirst' : '') +
        (damageFlash ? ' game-hud-health--flash' : '')
      }
      aria-hidden
    >
      <div className="game-hud-health__label">
        <span className="game-hud-health__label-text">{isThirst ? 'Water' : 'HP'}</span>
        <span className={`game-hud-health__value ${critical ? 'game-hud-health__value--critical' : low ? 'game-hud-health__value--low' : ''}`}>
          {Math.max(0, Math.round(shown))}/{maxHp}
        </span>
      </div>
      <div className="game-hud-health__track">
        <div
          className={
            'game-hud-health__fill' +
            (critical ? ' game-hud-health__fill--critical' : low ? ' game-hud-health__fill--low' : '')
          }
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  )
}
