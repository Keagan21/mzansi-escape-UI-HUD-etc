// LevelBriefing.jsx — Paused how-to-play popup shown at the start of each level.

import { useEffect, useRef } from 'react'
import { getLevelBriefing } from '../game/levelBriefings.js'

export function LevelBriefing({ level = 1, fromPause = false, onDismiss }) {
  const briefing = getLevelBriefing(level)
  const readyRef = useRef(null)

  useEffect(() => {
    readyRef.current?.focus()
  }, [level])

  if (!briefing) return null

  return (
    <div
      className="start-menu start-menu--retro start-menu--over-game game-level-briefing"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-briefing-title"
    >
      <div className="game-level-complete__panel game-level-briefing__panel">
        <p className="game-level-complete__eyebrow">Level {briefing.level}</p>
        <h2
          id="level-briefing-title"
          className="start-menu__sub-title game-level-complete__title"
        >
          {briefing.title}
        </h2>
        <p className="game-level-briefing__setting">{briefing.setting}</p>
        <div className="start-menu__sub-body game-level-briefing__body">
          <p>
            <strong className="game-level-briefing__label">Goal</strong>
            {briefing.goal}
          </p>
          <p>
            <strong className="game-level-briefing__label">Avoid</strong>
            {briefing.avoid}
          </p>
          {briefing.collect ? (
            <p>
              <strong className="game-level-briefing__label">Collect</strong>
              {briefing.collect}
            </p>
          ) : null}
          <p>
            <strong className="game-level-briefing__label">Controls</strong>
            {briefing.controls}
          </p>
        </div>
        <button
          ref={readyRef}
          type="button"
          className="start-menu__pixel-btn game-level-complete__btn game-level-complete__btn--primary"
          onClick={onDismiss}
        >
          {fromPause ? 'Got it' : 'Got it — play'}
        </button>
        <p className="start-menu__hint game-level-complete__hint">
          {fromPause
            ? 'Enter, Space, or Esc closes this and returns to pause.'
            : 'Enter, Space, or Esc also starts the level.'}
        </p>
      </div>
    </div>
  )
}
