// PauseMenu.jsx — Pause dialog.

export function PauseMenu({
  onResume,
  onRestart,
  onMainMenu,
  onHowToPlay,
  musicMuted = false,
  onToggleMusicMuted,
  autoForward = false,
  onToggleAutoForward,
}) {
  return (
    <div
      className="start-menu start-menu--retro start-menu--over-game game-pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
    >
      <h2 className="start-menu__sub-title">Paused</h2>
      <nav
        className="start-menu__nav game-pause-overlay__nav"
        aria-label="Pause menu"
      >
        <button
          type="button"
          className="start-menu__pixel-btn"
          onClick={onResume}
        >
          Resume
        </button>
        {onHowToPlay ? (
          <button
            type="button"
            className="start-menu__pixel-btn"
            onClick={onHowToPlay}
          >
            How to play
          </button>
        ) : null}
        {onToggleMusicMuted ? (
          <button
            type="button"
            className="start-menu__pixel-btn"
            onClick={onToggleMusicMuted}
            aria-pressed={musicMuted}
          >
            {musicMuted ? 'Music: Muted' : 'Music: On'}
          </button>
        ) : null}
        {onToggleAutoForward ? (
          <button
            type="button"
            className="start-menu__pixel-btn"
            onClick={onToggleAutoForward}
            aria-pressed={autoForward}
          >
            {autoForward ? 'Auto-forward: On' : 'Auto-forward: Off'}
          </button>
        ) : null}
        <button
          type="button"
          className="start-menu__pixel-btn"
          onClick={onRestart}
        >
          Restart game
        </button>
        <button
          type="button"
          className="start-menu__pixel-btn"
          onClick={onMainMenu}
        >
          Back to main menu
        </button>
      </nav>
      <p className="start-menu__hint">Press P or Esc to resume.</p>
    </div>
  )
}
