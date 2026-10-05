// Level8FailOverlay.jsx — Soak / taxi fail: continue with a heart, or start from scratch.

import { useEffect, useRef } from 'react'

export function Level8FailOverlay({
  hearts = 0,
  failReason = 'soak',
  onContinue,
  onRestart,
}) {
  const primaryRef = useRef(null)
  const canContinue = hearts > 0

  useEffect(() => {
    primaryRef.current?.focus()
  }, [canContinue])

  const headline =
    failReason === 'taxi'
      ? 'A taxi knocked you down.'
      : 'The flood soaked you out.'

  return (
    <div
      className="gbv-overlay flood-overlay level8-fail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level8-fail-title"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="gbv-overlay__content">
        <p id="level8-fail-title" className="gbv-overlay__stat">
          {headline}
        </p>
        <p className="gbv-overlay__line">
          Heart tokens: {hearts}. Continue uses one and puts you back at the last
          checkpoint. When they run out, you start from scratch.
        </p>
        <div className="level8-fail-overlay__actions">
          {canContinue ? (
            <button
              ref={primaryRef}
              type="button"
              className="gbv-overlay__continue"
              onClick={onContinue}
            >
              CONTINUE ({hearts} {hearts === 1 ? 'heart' : 'hearts'})
            </button>
          ) : (
            <p className="gbv-overlay__help-meta">
              No heart tokens left. You have to start from scratch.
            </p>
          )}
          <button
            ref={canContinue ? undefined : primaryRef}
            type="button"
            className="gbv-overlay__continue"
            onClick={onRestart}
          >
            START FROM SCRATCH
          </button>
        </div>
      </div>
    </div>
  )
}
