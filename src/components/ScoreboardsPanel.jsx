// ScoreboardsPanel.jsx — Personal bests + global leaderboard screens.

import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import {
  buildMergedPersonalRows,
  fetchAllGlobalLeaderboards,
  formatScoreValue,
  getCachedPersonalRows,
  hydrateAccountScores,
  mergePlayerIntoLeaderboard,
  rankTierLabel,
} from '../game/scores.js'
import {
  getLevelConfig,
  isLevelPlayable,
  levelUsesTimeScore,
} from '../game/levels.js'

export function ScoreboardsPanel({ menuScreen, onNavigate }) {
  const { user, userLabel, authReady } = useAuth()
  const [tab, setTab] = useState('personal') // 'personal' | 'global'
  const [personalRows, setPersonalRows] = useState(() =>
    buildMergedPersonalRows([])
  )
  const [globalBoards, setGlobalBoards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (menuScreen !== 'scoreboards') return undefined
    if (!authReady) return undefined
    setError('')
    let cancelled = false

    // Paint cached / local scores immediately so the board is never blank.
    const seed = user
      ? getCachedPersonalRows(user.uid)
      : buildMergedPersonalRows([])
    setPersonalRows(seed)
    setLoading(true)

    const load = async () => {
      try {
        let personal = seed
        let hydrateError = null

        if (user) {
          const hydrated = await hydrateAccountScores(user.uid)
          personal = hydrated.rows
          hydrateError = hydrated.error
          if (!cancelled) setPersonalRows(personal)
        } else if (!cancelled) {
          personal = buildMergedPersonalRows([])
          setPersonalRows(personal)
        }

        if (tab === 'global') {
          let boards = []
          try {
            boards = await fetchAllGlobalLeaderboards()
          } catch (err) {
            if (!cancelled) {
              setError(
                err?.message ||
                  'Could not load the global leaderboard. Check your connection.'
              )
            }
            boards = []
          }
          const merged = boards.map((board) => ({
            levelId: board.levelId,
            rows: user
              ? mergePlayerIntoLeaderboard(board.rows, board.levelId, {
                  uid: user.uid,
                  displayName: userLabel || 'Player',
                  bestScore:
                    personal.find((row) => row.levelId === board.levelId)
                      ?.bestScore ?? 0,
                })
              : board.rows,
          }))
          if (!cancelled) setGlobalBoards(merged)
        }

        if (!cancelled && hydrateError) setError(hydrateError)
      } catch (err) {
        if (!cancelled) {
          setPersonalRows(
            user ? getCachedPersonalRows(user.uid) : buildMergedPersonalRows([])
          )
          setError(
            err?.message ||
              'Could not load scores. Check Firestore is set up and rules are deployed.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [menuScreen, tab, user, userLabel, authReady])

  useEffect(() => {
    if (tab !== 'global' || loading) return
    document
      .querySelector('.start-menu__score-table__row--you')
      ?.scrollIntoView({ block: 'nearest' })
  }, [tab, globalBoards, loading])

  if (menuScreen !== 'scoreboards') return null

  return (
    <div
      className="start-menu__sub start-menu__sub--scoreboards"
      aria-label="Scoreboards"
    >
      <h2 className="start-menu__sub-title">Scoreboards</h2>
      <div className="start-menu__auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={
            'start-menu__auth-tab' +
            (tab === 'personal' ? ' start-menu__auth-tab--active' : '')
          }
          aria-selected={tab === 'personal'}
          onClick={() => setTab('personal')}
        >
          My Scores
        </button>
        <button
          type="button"
          role="tab"
          className={
            'start-menu__auth-tab' +
            (tab === 'global' ? ' start-menu__auth-tab--active' : '')
          }
          aria-selected={tab === 'global'}
          onClick={() => setTab('global')}
        >
          Global
        </button>
      </div>

      {!authReady ? (
        <p className="start-menu__options-sub">Restoring your account…</p>
      ) : null}

      {tab === 'personal' && authReady ? (
        <>
          <p className="start-menu__options-sub">
            {user
              ? `Best scores for ${userLabel}, saved to your account.`
              : 'Local scores on this device. Sign in to sync to the cloud.'}
          </p>
          {loading ? (
            <p className="start-menu__options-sub">Loading…</p>
          ) : null}
          <table className="start-menu__score-table">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col">Best</th>
              </tr>
            </thead>
            <tbody>
              {personalRows.map((row) => {
                const cfg = getLevelConfig(row.levelId)
                const playable = isLevelPlayable(row.levelId)
                return (
                  <tr key={row.levelId}>
                    <td>
                      {row.levelId}. {cfg.label}
                      {!playable ? ' (soon)' : ''}
                    </td>
                    <td>{formatScoreValue(row.levelId, row.bestScore)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!user && (
            <button
              type="button"
              className="start-menu__pixel-btn"
              onClick={() => onNavigate('account')}
            >
              Sign In to Sync…
            </button>
          )}
        </>
      ) : null}

      {tab === 'global' && authReady ? (
        <>
          <p className="start-menu__options-sub">
            Signed-in players, ranked per level. 1st Diamond · next 3 Gold ·
            next 6 Silver · rest Bronze.
          </p>
          {loading ? (
            <p className="start-menu__options-sub">Loading…</p>
          ) : (
            <div className="start-menu__score-global">
              {globalBoards.map((board) => {
                const cfg = getLevelConfig(board.levelId)
                const youRow = user
                  ? board.rows.find((row) => row.uid === user.uid)
                  : null
                return (
                  <section
                    key={board.levelId}
                    className="start-menu__score-level"
                    aria-labelledby={`global-level-${board.levelId}`}
                  >
                    <h3
                      className="start-menu__score-level-title"
                      id={`global-level-${board.levelId}`}
                    >
                      {board.levelId}. {cfg.label}
                    </h3>
                    {user ? (
                      <p className="start-menu__score-rank" aria-live="polite">
                        {youRow
                          ? `You are #${youRow.rank} ${rankTierLabel(youRow.tier)} · ${board.rows.length} player${board.rows.length === 1 ? '' : 's'}`
                          : 'Finish this level while signed in to join the ranking.'}
                      </p>
                    ) : null}
                    {board.rows.length === 0 ? (
                      <p className="start-menu__options-sub">
                        No scores yet. Be the first!
                      </p>
                    ) : (
                      <div className="start-menu__score-table-wrap">
                        <table className="start-menu__score-table">
                          <thead>
                            <tr>
                              <th scope="col">#</th>
                              <th scope="col">Player</th>
                              <th scope="col">
                                {levelUsesTimeScore(board.levelId)
                                  ? 'Time'
                                  : 'Score'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {board.rows.map((row) => (
                              <tr
                                key={row.uid}
                                className={
                                  (user && row.uid === user.uid
                                    ? 'start-menu__score-table__row--you'
                                    : '') +
                                  ` start-menu__score-table__row--${row.tier}`
                                }
                              >
                                <td>
                                  <span className="start-menu__score-place">
                                    <span
                                      className={
                                        'start-menu__score-tier start-menu__score-tier--' +
                                        row.tier
                                      }
                                      title={rankTierLabel(row.tier)}
                                    >
                                      {rankTierLabel(row.tier)}
                                    </span>
                                    {row.rank}
                                  </span>
                                </td>
                                <td>
                                  {row.displayName}
                                  {user && row.uid === user.uid ? ' (you)' : ''}
                                </td>
                                <td>
                                  {formatScoreValue(
                                    board.levelId,
                                    row.bestScore
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
          {!user && !loading ? (
            <>
              <p className="start-menu__score-rank">
                Sign in so your best is saved and shows on this ranking.
              </p>
              <button
                type="button"
                className="start-menu__pixel-btn"
                onClick={() => onNavigate('account')}
              >
                Sign In to Rank…
              </button>
            </>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p className="start-menu__auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="start-menu__pixel-btn"
        onClick={() => onNavigate('main')}
      >
        Back
      </button>
    </div>
  )
}
