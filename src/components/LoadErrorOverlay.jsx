// LoadErrorOverlay.jsx — Error when taxi model fails to load.

export function LoadErrorOverlay() {
  return (
    <div
      className="game-overlay game-error game-error--retro"
      role="alert"
    >
      <span>Could not load the taxi model (check the .glb path).</span>
    </div>
  )
}
