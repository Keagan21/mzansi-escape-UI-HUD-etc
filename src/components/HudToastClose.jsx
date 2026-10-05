// HudToastClose.jsx — Dismiss control for Level 4 overlay toasts.

export function HudToastClose({ onClose, label = 'Dismiss' }) {
  return (
    <button
      type="button"
      className="hud-toast-close"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
    >
      ×
    </button>
  )
}
