// FloodImpactOverlay.jsx — Level 8 win: flood-safety message + 112, shown before level complete.

import { useEffect, useRef } from 'react'

export function FloodImpactOverlay({ onContinue }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div
      className="gbv-overlay flood-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flood-overlay-stat"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="gbv-overlay__content">
        <p id="flood-overlay-stat" className="gbv-overlay__stat">
          Informal settlements sit on some of Joburg’s worst flood lines.
        </p>
        <p className="gbv-overlay__line">You made it to high ground. Not every street does.</p>

        <div className="gbv-overlay__help">
          <p className="gbv-overlay__help-intro">If someone is trapped in flood water:</p>
          <p className="gbv-overlay__help-name">Emergency (mobile)</p>
          <p className="gbv-overlay__help-number">
            <a href="tel:112">112</a>
          </p>
          <p className="gbv-overlay__help-meta">Free · Do not wade in</p>
        </div>

        <p className="gbv-overlay__link">
          Stay on the ridge. Moving water as shallow as 15 cm can knock you down.
        </p>

        <button ref={buttonRef} type="button" className="gbv-overlay__continue" onClick={onContinue}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}
