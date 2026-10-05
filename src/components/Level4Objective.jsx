// Level4Objective.jsx — Node checklist, next landmark, Newlands handles.

import { useState } from 'react'
import { formatRunTime } from '../game/scores.js'
import { HudToastClose } from './HudToastClose.jsx'

export function Level4Objective({
  distance,
  runTimeMs = 0,
  bestTimeMs = 0,
  pipeFixed = false,
  newlandsFixed = false,
  steenbrasFixed = false,
  pipeTimer = null,
  prompt = '',
  promptDock = 'inline',
  nodesRestored = 0,
  valveHintAvailable = false,
  onValveHint,
}) {
  const [dismissedPrompt, setDismissedPrompt] = useState('')
  const showPrompt = Boolean(prompt) && prompt !== dismissedPrompt
  const nextLabel = !pipeFixed
    ? 'De Waal Drive pipes'
    : !newlandsFixed
      ? 'Newlands valves'
      : !steenbrasFixed
        ? 'Steenbras Dam'
        : 'Vodacom Building'
  const status =
    typeof distance !== 'number'
      ? { color: '#7ee0ff', text: 'Find the water chain...' }
      : distance > 50
        ? { color: '#ffe0a3', text: 'Long walk in the heat' }
        : distance > 20
          ? { color: '#ffaa44', text: 'Getting closer' }
          : { color: '#7ee0ff', text: 'Almost there' }

  return (
    <div className="level3-objective level4-objective" aria-live="polite">
      <p className="level3-objective__title">Restore Cape Town&apos;s water</p>
      <p className="level3-objective__sub">
        <span className="level3-objective__status" style={{ color: status.color }}>
          {status.text}
        </span>
        {' · '}
        Next: {nextLabel}
        {typeof distance === 'number' ? (
          <>
            {' · '}
            <strong className="level3-objective__distance">{distance}m</strong>
          </>
        ) : null}
      </p>
      <p className="level3-objective__coins">
        Nodes{' '}
        <strong className="level3-objective__coins-value">
          {nodesRestored}/3
        </strong>
        {' · '}
        Time <strong className="level3-objective__coins-value">{formatRunTime(runTimeMs)}</strong>
        {bestTimeMs > 0 ? (
          <>
            {' · '}
            Best <strong className="level3-objective__coins-value">{formatRunTime(bestTimeMs)}</strong>
          </>
        ) : null}
        {pipeTimer != null ? (
          <>
            {' · '}
            Pipe{' '}
            <strong className="level3-objective__coins-value">{pipeTimer}s</strong>
          </>
        ) : null}
      </p>
      {valveHintAvailable && onValveHint ? (
        <button
          type="button"
          className="level4-objective__hint-btn"
          aria-label="Play the sound of the next colour to press"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onValveHint()
          }}
        >
          Hint — hear next colour
        </button>
      ) : null}
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
