// Determines the status of a class (open, waitlist, closed)

import React from "react"

export function StatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase().includes("open")
    ? "open"
    : status.toLowerCase().includes("wait")
    ? "waitlist"
    : "closed"
  return <span className={`ss-badge ${cls}`}>{status}</span>
}