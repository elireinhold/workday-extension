// Header that is at the top of the extension

import React from "react"

export function SidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="ss-header">
      <div className="ss-logo">
        <div className="ss-logo-mark">🦆</div>
        <div>
          <div className="ss-logo-text">QuackScheduler</div>
          <div className="ss-logo-sub">Get your ducks in a row 🦆</div>
        </div>
      </div>
      <button className="ss-close" onClick={onClose}>✕</button>
    </div>
  )
}