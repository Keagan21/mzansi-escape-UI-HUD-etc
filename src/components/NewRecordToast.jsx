// NewRecordToast.jsx — “New record!” toast.

import { HudToastClose } from './HudToastClose.jsx'

export function NewRecordToast({ onClose }) {
  return (
    <div
      className={
        'game-new-record-toast' +
        (onClose ? ' game-new-record-toast--dismissible' : '')
      }
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>New record!</span>
      {onClose ? <HudToastClose onClose={onClose} /> : null}
    </div>
  )
}
