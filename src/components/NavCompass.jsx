// NavCompass.jsx — Bottom-left compass. The needle points toward the goal.

import { useEffect, useRef } from 'react'
import { readNavCompass } from '../game/navArrow.js'

export function NavCompass() {
  const rootRef = useRef(null)
  const needleRef = useRef(null)
  const distRef = useRef(null)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const compass = readNavCompass()
      const root = rootRef.current
      if (root) {
        root.hidden = !compass.visible
        root.style.setProperty('--nav-compass', compass.color)
      }
      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${compass.angle}rad)`
      }
      if (distRef.current) {
        distRef.current.textContent = compass.visible ? `${compass.distance} m` : ''
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div ref={rootRef} className="nav-compass" hidden>
      <div className="nav-compass__dial" aria-hidden>
        <span className="nav-compass__ahead" />
        <span ref={needleRef} className="nav-compass__needle" />
        <span className="nav-compass__hub" />
      </div>
      <p ref={distRef} className="nav-compass__dist" />
    </div>
  )
}
