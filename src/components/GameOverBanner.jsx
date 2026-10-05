// GameOverBanner.jsx — Hit / game over message.

export function GameOverBanner({
  level = 1,
  score,
  coins,
  scoreLabel = 'Dodged',
  collectibleLabel = 'Coins',
}) {
  const isLevel3 = level === 3
  const isLevel4 = level === 4
  const isLevel5 = level === 5
  const isLevel6 = level === 6
  const isLevel8 = level === 8
  return (
    <div className="game-over-banner" role="status">
      {isLevel8 ? (
        <>
          The water or a taxi stopped you. Use a heart token to continue, or start from scratch.{' '}
          {collectibleLabel}: {coins}
        </>
      ) : isLevel6 ? (
        <>
          You were found. The Cape Flats took you. Press R to try again. {collectibleLabel}:{' '}
          {coins}
        </>
      ) : isLevel3 ? (
        <>
          The amaphara got you! Press R to try again. {collectibleLabel}: {coins}
        </>
      ) : isLevel4 ? (
        <>
          You dehydrated. Press R to try again. {collectibleLabel}: {coins}
        </>
      ) : isLevel5 ? (
        <>
          The looters got you! Press R to try again. {collectibleLabel}: {coins}
        </>
      ) : level === 2 ? (
        <>
          Crashed! Need 3 Coke to keep going. Press R to try again. {scoreLabel}:{' '}
          {score} · {collectibleLabel}: {coins}
        </>
      ) : (
        <>
          Hit! Press R to try again. {scoreLabel}: {score} · {collectibleLabel}:{' '}
          {coins}
        </>
      )}
    </div>
  )
}
