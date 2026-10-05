// Level6Objective.jsx — Strike eyes, EskomSePush-style navigator, stealth controls, checkpoint flash.

import { useState } from 'react'
import { formatRunTime } from '../game/scores.js'
import {
  LEVEL6_VIEW_STEPS,
  getLevel6ViewIndex,
  zoomLevel6In,
  zoomLevel6Out,
} from '../game/level6View.js'
import { HudToastClose } from './HudToastClose.jsx'

export function Level6Objective({
  distance,
  runTimeMs = 0,
  bestTimeMs = 0,
  strikesUsed = 0,
  maxStrikes = 3,
  navigatorMessage = '',
  tipsCollected = 0,
  tipsTotal = 8,
  prompt = '',
  crouching = false,
  sprinting = false,
  checkpointFlashAt = 0,
  strikeFlashAt = 0,
}) {
  const [dismissedPrompt, setDismissedPrompt] = useState('')
  const [viewIndex, setViewIndex] = useState(getLevel6ViewIndex)
  const showPrompt = Boolean(prompt) && prompt !== dismissedPrompt
  const eyes = Array.from({ length: maxStrikes }, (_, i) => i >= strikesUsed)

  return (
    <>
      {strikeFlashAt > 0 ? (
        <div key={strikeFlashAt} className="level6-strike-flash" aria-hidden />
      ) : null}

      <div className="level6-strikes" aria-label={`${maxStrikes - strikesUsed} of ${maxStrikes} chances left`}>
        <p className="level6-strikes__eyes">
          {eyes.map((left, i) => (
            <span
              key={i}
              className={'level6-strikes__eye' + (left ? '' : ' level6-strikes__eye--used')}
              aria-hidden
            >
              👁️
            </span>
          ))}
        </p>
        <p className="level6-strikes__meta">
          Time {formatRunTime(runTimeMs)}
          {bestTimeMs > 0 ? ` · Best ${formatRunTime(bestTimeMs)}` : ''}
        </p>
        <p className="level6-strikes__meta">
          Notes {tipsCollected}/{tipsTotal}
          {typeof distance === 'number' ? ` · Safety ${distance}m` : ''}
        </p>
        {crouching || sprinting ? (
          <p
            className={
              'level6-strikes__stance' + (sprinting ? ' level6-strikes__stance--loud' : '')
            }
          >
            {sprinting ? 'SPRINTING' : 'CROUCHED — harder to spot'}
          </p>
        ) : null}
      </div>

      <div className="level3-objective level5-objective level6-objective" aria-live="polite">
        <div className="level5-eskom level6-eskom" role="status">
          <span className="level5-eskom__bell" aria-hidden>
            🔔
          </span>
          <p className="level5-eskom__msg">
            {navigatorMessage || 'Stay hidden. Reach the Thuthuzela Care Centre.'}
          </p>
        </div>
        <p className="level3-objective__title">Cape Flats: Stay Hidden</p>
      </div>

      {checkpointFlashAt > 0 ? (
        <p key={checkpointFlashAt} className="level6-checkpoint" role="status">
          ✓ Checkpoint reached
        </p>
      ) : null}

      {showPrompt ? (
        <p className="level4-objective__prompt level4-objective__prompt--top" role="status">
          <span>{prompt}</span>
          <HudToastClose onClose={() => setDismissedPrompt(prompt)} />
        </p>
      ) : null}

      <div className="level6-zoom" role="group" aria-label="Camera zoom">
        <button
          type="button"
          className="level6-zoom__btn"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={viewIndex >= LEVEL6_VIEW_STEPS.length - 1}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setViewIndex(zoomLevel6Out())}
        >
          +
        </button>
        <button
          type="button"
          className="level6-zoom__btn"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={viewIndex <= 0}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setViewIndex(zoomLevel6In())}
        >
          −
        </button>
      </div>

      <p className="level6-controls" aria-hidden>
        C / CTRL — crouch &nbsp;|&nbsp; SHIFT — sprint &nbsp;|&nbsp; WASD — move
        &nbsp;|&nbsp; E — read note
      </p>
    </>
  )
}
