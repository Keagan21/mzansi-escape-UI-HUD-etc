// Level6ContentWarning.jsx — Content warning shown before the level 6 briefing.

export function Level6ContentWarning() {
  return (
    <div
      className="start-menu start-menu--retro start-menu--over-game game-level-briefing level6-warning"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level6-warning-title"
    >
      <div className="game-level-complete__panel game-level-briefing__panel level6-warning__panel">
        <p className="game-level-complete__eyebrow">Level 6</p>
        <h2
          id="level6-warning-title"
          className="start-menu__sub-title game-level-complete__title level6-warning__title"
        >
          Warning
        </h2>
        <p className="level6-warning__body">
          This level might be triggering to some.
        </p>
        <p className="start-menu__hint game-level-complete__hint">
          Press Enter to continue.
        </p>
      </div>
    </div>
  )
}
