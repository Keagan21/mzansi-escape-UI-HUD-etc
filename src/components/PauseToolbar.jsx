// PauseToolbar.jsx — Pause button during play.

export function PauseToolbar({ onPause }) {
  return (
    <div className="game-pause-toolbar">
      <button
        type="button"
        className="game-pause-toolbar__btn"
        onClick={onPause}
        aria-label="Pause game"
      >
        Pause
      </button>
    </div>
  )
}
