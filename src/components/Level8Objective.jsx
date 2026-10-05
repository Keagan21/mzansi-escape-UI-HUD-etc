// Level8Objective.jsx — Soak pips, neighbour checklist, storm navigator.

import { useState } from 'react'
import { formatRunTime } from '../game/scores.js'
import {
  LEVEL6_VIEW_STEPS,
  getLevel6ViewIndex,
  zoomLevel6In,
  zoomLevel6Out,
} from '../game/level6View.js'
import { HudToastClose } from './HudToastClose.jsx'

const STOPS = ['Clinic', 'School', 'Spaza']

export function Level8Objective({
  distance,
  runTimeMs = 0,
  bestTimeMs = 0,
  soakingsUsed = 0,
  maxSoakings = 3,
  navigatorMessage = '',
  nextStreet = '',
  tipsCollected = 0,
  tipsTotal = 8,
  neighboursDone = 0,
  waterStage = 0,
  prompt = '',
  sprinting = false,
  carryingCrate = false,
  rainHeavy = false,
  checkpointFlashAt = 0,
  soakFlashAt = 0,
  hearts = 1,
  hp = 100,
  maxHp = 100,
}) {
  const [dismissedPrompt, setDismissedPrompt] = useState('')
  const [viewIndex, setViewIndex] = useState(getLevel6ViewIndex)
  const showPrompt = Boolean(prompt) && prompt !== dismissedPrompt
  const drops = Array.from({ length: maxSoakings }, (_, i) => i >= soakingsUsed)

  return (
    <>
      {soakFlashAt > 0 ? (
        <div key={soakFlashAt} className="level8-soak-flash" aria-hidden />
      ) : null}
      {rainHeavy ? <div className="level8-rain-veil" aria-hidden /> : null}

      <div
        className="level6-strikes level8-vitals"
        aria-label={`${maxSoakings - soakingsUsed} of ${maxSoakings} soakings left`}
      >
        <p className="level6-strikes__eyes">
          {drops.map((left, i) => (
            <span
              key={i}
              className={'level8-drop' + (left ? '' : ' level8-drop--used')}
              aria-hidden
            >
              💧
            </span>
          ))}
        </p>
        <p className="level6-strikes__meta">
          Time {formatRunTime(runTimeMs)}
          {bestTimeMs > 0 ? ` · Best ${formatRunTime(bestTimeMs)}` : ''}
        </p>
        <p className="level6-strikes__meta">
          Notes {tipsCollected}/{tipsTotal}
          {typeof distance === 'number' ? ` · Next ${distance}m` : ''}
          {` · ♥ ${hearts}`}
        </p>
        <p className="level8-hp" aria-label={`Health ${Math.round(hp)} of ${maxHp}`}>
          HP {Math.max(0, Math.round(hp))}/{maxHp}
        </p>
        <p className="level8-street" aria-label={`Next street ${nextStreet}`}>
          {nextStreet || 'Clinic Road · EAST off Vilakazi Ridge'}
        </p>
        <p className="level8-stops" aria-label={`Neighbours ${neighboursDone} of 3`}>
          {STOPS.map((name, i) => (
            <span
              key={name}
              className={'level8-stop' + (i < neighboursDone ? ' level8-stop--done' : '')}
            >
              {i < neighboursDone ? '✓ ' : ''}
              {name}
            </span>
          ))}
        </p>
        <p className="level8-stage">
          Water stage {waterStage}/3
          {carryingCrate ? ' · Carrying crate' : ''}
          {rainHeavy ? ' · Heavy rain' : ''}
        </p>
        {sprinting ? (
          <p className="level6-strikes__stance">SPRINTING — watch the dips</p>
        ) : null}
      </div>

      <div className="level3-objective level5-objective level6-objective" aria-live="polite">
        <div className="level5-eskom level8-eskom" role="status">
          <span className="level5-eskom__bell" aria-hidden>
            🌧️
          </span>
          <p className="level5-eskom__msg">
            {navigatorMessage || "Storm’s up. Check the clinic, then get to high ground."}
          </p>
        </div>
        <p className="level3-objective__title">Soweto Homecoming</p>
      </div>

      {checkpointFlashAt > 0 ? (
        <p key={checkpointFlashAt} className="level6-checkpoint level8-checkpoint" role="status">
          ✓ Neighbour safe — checkpoint
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
        WASD — move &nbsp;|&nbsp; SHIFT — sprint &nbsp;|&nbsp; E — talk / crate / note
      </p>
    </>
  )
}
