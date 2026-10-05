// RoadSceneCanvas.jsx — Focusable WebGL mount div.

export function RoadSceneCanvas({ containerRef }) {
  return (
    <div
      className="road-scene"
      ref={containerRef}
      role="application"
      aria-label="Mzansi Escape: 3D road, click for keyboard"
    />
  )
}
