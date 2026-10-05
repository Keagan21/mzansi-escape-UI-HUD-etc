// LevelCompleteMenu.jsx — Level win panel.

import { formatRunTime } from '../game/scores.js'
import { isLevelPlayable, levelUsesTimeScore } from '../game/levels.js'

export function LevelCompleteMenu({
  level,
  score,
  coins,
  highScore,
  runTimeMs = 0,
  hazardPastLabel = 'Taxis dodged',
  collectibleLabel = 'Coins',
  signedIn = false,
  onSignInToSave,
  onNextLevel,
  onRestartLevel,
  onMainMenu,
}) {
  const isLevel3 = level === 3
  const isLevel4 = level === 4
  const isLevel5 = level === 5
  const isLevel6 = level === 6
  const isLevel8 = level === 8
  const timed = levelUsesTimeScore(level)
  const hasNextLevel = isLevelPlayable(level + 1)
  return (
    <div
      className="start-menu start-menu--retro start-menu--over-game game-level-complete"
      role="dialog"
      aria-modal="true"
      aria-label="Level complete"
    >
      <div className="game-level-complete__panel">
        <p className="game-level-complete__eyebrow">
          {isLevel3
            ? 'Safe at Park Station'
            : isLevel4
              ? 'Water restored'
              : isLevel5
                ? 'Lights back on'
                : isLevel6
                  ? 'Safe at Thuthuzela'
                  : isLevel8
                    ? 'Above the waterline'
                    : 'Run cleared'}
        </p>
        <h2 className="start-menu__sub-title game-level-complete__title">
          Level {level} Complete
        </h2>
        <p className="start-menu__sub-body game-level-complete__subtitle">
          {isLevel3
            ? 'You made it through the CBD with enough fare and caught the bus!'
            : isLevel4
              ? 'You restored Cape Town’s water chain. Drink from the tap — finally.'
              : isLevel5
                ? 'You restored three substations and reached Cape Town Stadium. Help is on the way.'
                : isLevel6
                  ? 'You crossed the Cape Flats unseen and reached the Thuthuzela Care Centre. Unused chances and every community note cut your time.'
                  : isLevel8
                    ? 'You checked on your neighbours and made it home on high ground. Unused soakings and every flood note cut your time.'
                    : 'You reached the end of the road safely.'}
        </p>
        <div className="game-level-complete__stats" aria-hidden>
          {timed ? (
            <p className="game-level-complete__stat">
              <span className="game-level-complete__label">Your time</span>
              <strong className="game-level-complete__value">
                {formatRunTime(runTimeMs)}
              </strong>
            </p>
          ) : (
            <p className="game-level-complete__stat">
              <span className="game-level-complete__label">{hazardPastLabel}</span>
              <strong className="game-level-complete__value">{score}</strong>
            </p>
          )}
          <p className="game-level-complete__stat">
            <span className="game-level-complete__label">{collectibleLabel} collected</span>
            <strong className="game-level-complete__value">{coins}</strong>
          </p>
          <p className="game-level-complete__stat">
            <span className="game-level-complete__label">
              {timed ? 'Best time' : 'Best run'}
            </span>
            <strong className="game-level-complete__value">
              {timed ? formatRunTime(highScore) : highScore}
            </strong>
          </p>
        </div>
        {timed && !signedIn ? (
          <p className="game-level-complete__signin-hint">
            Sign in to save this time to the cloud and compare it on the
            scoreboards.
          </p>
        ) : null}
        <nav
          className="start-menu__nav game-level-complete__nav"
          aria-label="Level complete actions"
        >
          {timed && !signedIn && onSignInToSave ? (
            <button
              type="button"
              className="start-menu__pixel-btn game-level-complete__btn game-level-complete__btn--primary"
              onClick={onSignInToSave}
            >
              Sign In to Save…
            </button>
          ) : null}
          {hasNextLevel ? (
            <button
              type="button"
              className={
                'start-menu__pixel-btn game-level-complete__btn' +
                (timed && !signedIn ? '' : ' game-level-complete__btn--primary')
              }
              onClick={onNextLevel}
            >
              Next Level
            </button>
          ) : null}
          <button
            type="button"
            className="start-menu__pixel-btn game-level-complete__btn"
            onClick={onRestartLevel}
          >
            Restart Level
          </button>
          <button
            type="button"
            className="start-menu__pixel-btn game-level-complete__btn"
            onClick={onMainMenu}
          >
            Main Menu
          </button>
        </nav>
        <p className="start-menu__hint game-level-complete__hint">
          Press R anytime to restart this level.
        </p>
      </div>
    </div>
  )
}
