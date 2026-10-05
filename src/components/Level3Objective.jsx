// Level3Objective.jsx — Goal reminder, coin fare, distance to Park Station.

import { LEVEL3_BUS_FARE } from '../game/level3Coins.js'
import { formatRunTime } from '../game/scores.js'

export function Level3Objective({
  distance,
  coins = 0,
  busFareNeeded = 0,
  runTimeMs = 0,
  bestTimeMs = 0,
}) {
  const getDistanceStatus = (dist) => {
    if (typeof dist !== 'number') return { color: '#ffd98a', text: 'Finding route...' }
    if (dist > 50) return { color: '#ffd98a', text: 'Long way to go' }
    if (dist > 25) return { color: '#ffaa44', text: 'Getting closer' }
    if (dist > 8) return { color: '#ff6644', text: 'Almost there!' }
    if (dist > 0) return { color: '#44ff88', text: 'Nearly there!' }
    return { color: '#44ff88', text: 'You made it!' }
  }

  const status = getDistanceStatus(distance)
  const fareReady = coins >= LEVEL3_BUS_FARE

  return (
    <div className="level3-objective" aria-live="polite">
      <p className="level3-objective__title">Reach Park Station</p>
      <p className="level3-objective__sub">
        <span className="level3-objective__status" style={{ color: status.color }}>
          {status.text}
        </span>
        {' '}· Survive the amaphara · catch the bus
        {typeof distance === 'number' ? (
          <>
            {' '}
            · <strong className="level3-objective__distance">{distance}m</strong> away
          </>
        ) : null}
      </p>
      <p className="level3-objective__coins">
        Bus fare{' '}
        <strong
          className={
            fareReady
              ? 'level3-objective__coins-value level3-objective__coins-value--ready'
              : 'level3-objective__coins-value'
          }
        >
          {coins}/{LEVEL3_BUS_FARE}
        </strong>
        {' · '}
        Time <strong className="level3-objective__coins-value">{formatRunTime(runTimeMs)}</strong>
        {bestTimeMs > 0 ? (
          <>
            {' · '}
            Best <strong className="level3-objective__coins-value">{formatRunTime(bestTimeMs)}</strong>
          </>
        ) : null}
      </p>
      {busFareNeeded > 0 ? (
        <p className="level3-objective__fare-hint" role="status">
          You need {busFareNeeded} more coin{busFareNeeded === 1 ? '' : 's'} to catch the
          bus — collect more.
        </p>
      ) : null}
    </div>
  )
}
