// Level5Objective.jsx — EskomSePush navigator, battery/HP bars, node lightning icons.

import { useState } from 'react'
import { formatRunTime } from '../game/scores.js'
import { HudToastClose } from './HudToastClose.jsx'

export function Level5Objective({
  distance,
  runTimeMs = 0,
  bestTimeMs = 0,
  battery = 100,
  maxBattery = 100,
  hp = 100,
  maxHp = 100,
  navigatorMessage = '',
  node1Fixed = false,
  node2Fixed = false,
  node3Fixed = false,
  circuitTimer = null,
  cableProgress = null,
  prompt = '',
  promptDock = 'inline',
  nodesRestored = 0,
  puzzleView = null,
}) {
  const [dismissedPrompt, setDismissedPrompt] = useState('')
  const showPrompt = Boolean(prompt) && prompt !== dismissedPrompt
  const puzzleDock = puzzleView === 'circuit' || puzzleView === 'cable' || puzzleView === 'generator'

  const batteryPct = Math.max(0, Math.min(100, (battery / maxBattery) * 100))
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const batteryLow = batteryPct <= 30
  const hpLow = hpPct <= 30

  const nextLabel = !node1Fixed
    ? 'Substation Alpha (De Waal)'
    : !node2Fixed
      ? 'Substation Bravo (Newlands)'
      : !node3Fixed
        ? 'Substation Gamma (Steenbras)'
        : 'Cape Town Stadium'

  return (
    <div
      className={
        'level3-objective level5-objective' +
        (puzzleDock ? ' level5-objective--puzzle' : '')
      }
      aria-live="polite"
    >
      <div className="level5-eskom" role="status">
        <span className="level5-eskom__bell" aria-hidden>
          🔔
        </span>
        <p className="level5-eskom__msg">{navigatorMessage || 'Stage 6 loadshedding…'}</p>
      </div>

      <p className="level3-objective__title">Cape Town: Lights Out</p>
      <p className="level3-objective__sub">
        Next: {nextLabel}
        {typeof distance === 'number' ? (
          <>
            {' · '}
            <strong className="level3-objective__distance">{distance}m</strong>
          </>
        ) : null}
      </p>

      <div className="level5-vitals" aria-hidden>
        <div className="level5-vitals__row">
          <span className="level5-vitals__label">BATTERY</span>
          <div className="level5-vitals__track">
            <div
              className={
                'level5-vitals__fill level5-vitals__fill--battery' +
                (batteryLow ? ' level5-vitals__fill--low' : '')
              }
              style={{ width: `${batteryPct}%` }}
            />
          </div>
          <span className="level5-vitals__value">
            {Math.round(battery)}/{maxBattery}
          </span>
        </div>
        <div className="level5-vitals__row">
          <span className="level5-vitals__label">HP</span>
          <div className="level5-vitals__track">
            <div
              className={
                'level5-vitals__fill level5-vitals__fill--hp' +
                (hpLow ? ' level5-vitals__fill--low' : '')
              }
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="level5-vitals__value">
            {Math.round(hp)}/{maxHp}
          </span>
        </div>
      </div>

      <p className="level5-nodes" aria-label={`Nodes restored ${nodesRestored} of 3`}>
        <span className={node1Fixed ? 'level5-nodes__bolt level5-nodes__bolt--on' : 'level5-nodes__bolt'}>
          ⚡
        </span>
        <span className={node2Fixed ? 'level5-nodes__bolt level5-nodes__bolt--on' : 'level5-nodes__bolt'}>
          ⚡
        </span>
        <span className={node3Fixed ? 'level5-nodes__bolt level5-nodes__bolt--on' : 'level5-nodes__bolt'}>
          ⚡
        </span>
        <span className="level5-nodes__meta">
          {' '}
          {nodesRestored}/3 · Time {formatRunTime(runTimeMs)}
          {bestTimeMs > 0 ? ` · Best ${formatRunTime(bestTimeMs)}` : ''}
          {circuitTimer != null ? ` · Breaker ${circuitTimer}s` : ''}
          {cableProgress ? ` · Cables ${cableProgress}` : ''}
        </span>
      </p>

      {showPrompt ? (
        <p
          className={
            'level4-objective__prompt' +
            (promptDock === 'bottom' || promptDock === 'top'
              ? ' level4-objective__prompt--top'
              : '')
          }
          role="status"
        >
          <span>{prompt}</span>
          <HudToastClose onClose={() => setDismissedPrompt(prompt)} />
        </p>
      ) : null}
    </div>
  )
}
