// GameHudTop.jsx — Level / best / coins / dodged HUD.

export function GameHudTop({
  level,
  highScore,
  coins,
  score,
  scoreLabel = 'Dodged',
  collectibleLabel = 'Coins',
}) {
  return (
    <div className="game-hud-top" aria-hidden>
      <p className="game-hud-top__row game-hud-top__level">
        <span className="game-hud-top__label">Level</span>
        <span className="game-hud-top__value">{level}</span>
      </p>
      <p className="game-hud-top__row game-hud-top__high">
        <span className="game-hud-top__label">Best</span>
        <span className="game-hud-top__value">{highScore}</span>
      </p>
      <p className="game-hud-top__row game-hud-top__coins">
        <span className="game-hud-top__label">{collectibleLabel}</span>
        <span className="game-hud-top__value">{coins}</span>
      </p>
      <p className="game-hud-top__row">
        <span className="game-hud-top__label">{scoreLabel}</span>
        <span className="game-hud-top__value">{score}</span>
      </p>
    </div>
  )
}