// GBVImpactOverlay.jsx — Level 6 win: GBV impact message + helpline, shown before level complete.

import { useEffect, useRef } from 'react'

export function GBVImpactOverlay({ onContinue }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div
      className="gbv-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gbv-overlay-stat"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="gbv-overlay__content">
        <p id="gbv-overlay-stat" className="gbv-overlay__stat">
          1 in 3 South African women experience gender-based violence.
        </p>
        <p className="gbv-overlay__line">You made it to safety. Not everyone does.</p>

        <div className="gbv-overlay__help">
          <p className="gbv-overlay__help-intro">If you or someone you know needs help:</p>
          <p className="gbv-overlay__help-name">GBV Command Centre</p>
          <p className="gbv-overlay__help-number">
            <a href="tel:0800428428">0800 428 428</a>
          </p>
          <p className="gbv-overlay__help-meta">Free · Available 24 hours</p>
        </div>

        <p className="gbv-overlay__link">
          Thuthuzela Care Centres:{' '}
          <a href="https://www.npa.gov.za" target="_blank" rel="noopener noreferrer">
            www.npa.gov.za
          </a>
        </p>

        <button ref={buttonRef} type="button" className="gbv-overlay__continue" onClick={onContinue}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}
