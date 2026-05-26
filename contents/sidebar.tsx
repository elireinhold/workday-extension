import { useState, useEffect, useCallback, useRef } from "react"
import type { PlasmoCSConfig } from "plasmo"
import type { CourseSection } from "../lib/types"
import { detectConflicts } from "../lib/conflictDetect"
import { parseRoomAndTime, formatDays } from "../lib/parseTime"
import cssText from "data-text:./sidebar.css"

export const config: PlasmoCSConfig = {
  matches: ["https://wd5.myworkday.com/stevens/*"],
  world: "MAIN"
}


export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

type Tab = "search" | "schedule"

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? "PM" : "AM"
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`
}

function StatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase().includes("open")
    ? "open"
    : status.toLowerCase().includes("wait")
    ? "waitlist"
    : "closed"
  return <span className={`ss-badge ${cls}`}>{status}</span>
}

function CourseCard({
  course,
  isAdded,
  onToggle,
}: {
  course: CourseSection
  isAdded: boolean
  onToggle: () => void
}) {
  const slot = parseRoomAndTime(course.roomAndTime)
  const code = course.courseSection.split(" - ")[0]
  const title = course.courseSection.split(" - ")[1] ?? course.title

  return (
    <div className={`ss-card ${isAdded ? "added" : ""}`}>
      <div className="ss-card-header">
        <div className="ss-card-left">
          <div className="ss-section-code">{code}</div>
          <div className="ss-section-title">{title}</div>
        </div>
        <button
          className={`ss-add-btn ${isAdded ? "added" : ""}`}
          onClick={onToggle}>
          {isAdded ? "✓ Added" : "+ Add"}
        </button>
      </div>
      <div className="ss-card-meta">
        <div className="ss-meta-item">
          <span className="ss-meta-icon">👤</span>
          <span>{course.instructor || "TBA"}</span>
        </div>
        <div className="ss-meta-item">
          <span className="ss-meta-icon">🪑</span>
          <span>{course.enrolledCapacity}</span>
        </div>
        {slot && (
          <div className="ss-meta-item" style={{ gridColumn: "1 / -1" }}>
            <span className="ss-meta-icon">🕐</span>
            <span>
              {formatDays(slot.days)} · {formatTime(slot.startMinutes)}–{formatTime(slot.endMinutes)} · {slot.room}
            </span>
          </div>
        )}
        <div className="ss-meta-item">
          <span className="ss-meta-icon">📍</span>
          <span>{course.campus.replace("Hoboken - ", "")}</span>
        </div>
        <div className="ss-meta-item">
          <StatusBadge status={course.status} />
        </div>
      </div>
    </div>
  )
}

function Sidebar({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CourseSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<CourseSection[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const conflicts = detectConflicts(added)
  const conflictSections = new Set(conflicts.flatMap((c) => [c.sectionA, c.sectionB]))

  // Listen for postMessage responses
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type === "SEARCH_RESULTS") {
        setResults(event.data.courses)
        setLoading(false)
        setError(null)
      }
      if (event.data?.type === "SEARCH_ERROR") {
        setError(event.data.error)
        setLoading(false)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    setError(null)
    window.postMessage({ type: "SEARCH_COURSES", query: query.trim() }, "*")
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const toggleAdded = (course: CourseSection) => {
    setAdded((prev) =>
      prev.some((c) => c.courseSection === course.courseSection)
        ? prev.filter((c) => c.courseSection !== course.courseSection)
        : [...prev, course]
    )
  }

  const isAdded = (course: CourseSection) =>
    added.some((c) => c.courseSection === course.courseSection)

  return (
    <div id="stevens-scheduler-root">
      {/* Header */}
      <div className="ss-header">
        <div className="ss-logo">
          <div className="ss-logo-mark">S</div>
          <div>
            <div className="ss-logo-text">Scheduler</div>
            <div className="ss-logo-sub">Stevens CS · {new Date().getFullYear()}</div>
          </div>
        </div>
        <button className="ss-close" onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div className="ss-tabs">
        <button className={`ss-tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
          Search
        </button>
        <button className={`ss-tab ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>
          My Schedule {added.length > 0 && `(${added.length})`}
        </button>
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="ss-search-panel">
          <div className="ss-search-bar">
            <input
              ref={inputRef}
              className="ss-input"
              placeholder="CS 115, algorithms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              className="ss-search-btn"
              onClick={handleSearch}
              disabled={loading || !query.trim()}>
              {loading ? "..." : "Search"}
            </button>
          </div>

          <div className="ss-results">
            {loading && (
              <div className="ss-loading">
                <div className="ss-spinner" />
                Searching Workday...
              </div>
            )}
            {error && (
              <div className="ss-empty">
                <div className="ss-empty-icon">⚠️</div>
                <div>{error}</div>
                <div style={{ fontSize: 11 }}>Make sure you've done one search in the Workday UI first.</div>
              </div>
            )}
            {!loading && !error && results.length === 0 && (
              <div className="ss-empty">
                <div className="ss-empty-icon">🔍</div>
                <div>Search for a course above</div>
                <div style={{ fontSize: 11, color: "#666" }}>e.g. "CS 385" or "algorithms"</div>
              </div>
            )}
            {results.map((course) => (
              <CourseCard
                key={course.courseSection}
                course={course}
                isAdded={isAdded(course)}
                onToggle={() => toggleAdded(course)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Schedule tab */}
      {tab === "schedule" && (
        <div className="ss-schedule-panel">
          {added.length === 0 ? (
            <div className="ss-schedule-empty">
              <div className="ss-empty-icon">📅</div>
              <div>No sections added yet</div>
              <div style={{ fontSize: 11 }}>Search for courses and click "+ Add"</div>
            </div>
          ) : (
            <>
              {conflicts.length > 0 && (
                <div className="ss-conflicts">
                  <div className="ss-conflicts-title">⚠ {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} Detected</div>
                  {conflicts.map((c, i) => (
                    <div key={i} className="ss-conflict-item">
                      {c.sectionA.split(" - ")[0]} ↔ {c.sectionB.split(" - ")[0]} · {c.reason}
                    </div>
                  ))}
                </div>
              )}

              <div className="ss-added-list">
                {added.map((course) => {
                  const slot = parseRoomAndTime(course.roomAndTime)
                  const hasConflict = conflictSections.has(course.courseSection)
                  return (
                    <div key={course.courseSection} className={`ss-added-card ${hasConflict ? "conflict" : ""}`}>
                      <div className="ss-added-info">
                        <div className="ss-added-code">
                          {hasConflict && "⚠ "}{course.courseSection.split(" - ")[0]}
                        </div>
                        <div className="ss-added-time">
                          {slot
                            ? `${formatDays(slot.days)} · ${formatTime(slot.startMinutes)}–${formatTime(slot.endMinutes)}`
                            : course.roomAndTime}
                        </div>
                      </div>
                      <button className="ss-remove-btn" onClick={() => toggleAdded(course)}>Remove</button>
                    </div>
                  )
                })}
              </div>

              <button className="ss-clear-btn" onClick={() => setAdded([])}>
                Clear All
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Then inside your SidebarContainer component, inject it via a style tag:
export default function SidebarContainer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <button id="stevens-scheduler-toggle" onClick={() => setOpen(true)}>
          Scheduler
        </button>
      )}
      {open && <Sidebar onClose={() => setOpen(false)} />}
    </>
  )
}
