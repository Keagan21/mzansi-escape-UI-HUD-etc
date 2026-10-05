// CutsceneOverlay.jsx — Level 1 intro video before gameplay starts.

import { useCallback, useEffect, useRef } from 'react'

const CUTSCENE_SRC = '/cutscenes/Cutscene 1.mp4'

export function CutsceneOverlay({ onComplete }) {
  const completedRef = useRef(false)
  const videoRef = useRef(null)

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    const video = videoRef.current
    if (video) {
      video.pause()
    }
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finish])

  return (
    <div
      className="cutscene-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Intro cutscene"
      onClick={finish}
    >
      <video
        ref={videoRef}
        className="cutscene-overlay__video"
        src={CUTSCENE_SRC}
        autoPlay
        playsInline
        onEnded={finish}
      />
      <button
        type="button"
        className="cutscene-overlay__skip start-menu__pixel-btn"
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
      >
        Skip
      </button>
      <p className="cutscene-overlay__hint">Click, Space, or Enter to skip</p>
    </div>
  )
}
