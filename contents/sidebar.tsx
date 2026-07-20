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

type Tab = "search" | "schedule" | "calendar"

// RateMyProfessor search helper for Stevens Institute of Technology (ID: 982)
export function getRmpSearchUrl(instructorName: string): string {
  if (!instructorName || instructorName === "TBA") return ""

  // 1. Remove academic titles like "Dr." or "Prof."
  let cleanName = instructorName.replace(/\b(Dr\.|Prof\.)\s*/gi, "")

  // 2. Convert "LastName, FirstName" format to "FirstName LastName"
  if (cleanName.includes(",")) {
    const parts = cleanName.split(",").map((p) => p.trim())
    if (parts.length >= 2) {
      cleanName = `${parts[1]} ${parts[0]}`
    }
  }

  // 3. Strip middle initials (e.g. "James A. Tian" -> "James Tian")
  cleanName = cleanName.replace(/\s+[A-Z]\.?\s+/g, " ")

  // 4. URL encode the final string
  const encodedName = encodeURIComponent(cleanName)

  // 982 is the Stevens Institute of Technology school ID on RMP
  return `https://www.ratemyprofessors.com/search/professors/982?q=${encodedName}`
}

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
  isScheduleTab = false
}: {
  course: CourseSection
  isAdded: boolean
  onToggle: () => void
  isScheduleTab?: boolean
}) {
  const slot = parseRoomAndTime(course.roomAndTime)
  const code = course.courseSection.split(" - ")[0]
  const title = course.courseSection.split(" - ")[1] ?? course.title
  const rmpUrl = getRmpSearchUrl(course.instructor)

  return (
    <div className={`ss-card ${isAdded && !isScheduleTab ? "added" : ""} ${isScheduleTab ? "ss-schedule-card" : ""}`}>
      <div className="ss-card-header">
        <div className="ss-card-left">
          <div className="ss-section-code">{code}</div>
          <div className="ss-section-title">{title}</div>
        </div>
        <button
          className={`ss-add-btn ${isAdded && !isScheduleTab ? "added" : ""} ${isScheduleTab ? "ss-remove-action-btn" : ""}`}
          onClick={onToggle}>
          {isScheduleTab ? "Remove" : isAdded ? "✓ Added" : "+ Add"}
        </button>
      </div>
      <div className="ss-card-meta">
        <div className="ss-meta-item">
          <span className="ss-meta-icon">👤</span>
          <span>{course.instructor || "TBA"}</span>
          {course.instructor && course.instructor !== "TBA" && rmpUrl && (
            <a
              href={rmpUrl}
              target="_blank"
              rel="noreferrer"
              className="ss-rmp-link"
              title="Search this professor on RateMyProfessor"
              style={{
                marginLeft: "8px",
                fontSize: "11px",
                color: "#c8102e", // Stevens Red
                textDecoration: "underline",
                cursor: "pointer"
              }}
              onClick={(e) => e.stopPropagation()} // Prevents unwanted click behaviors on the card container
            >
              (RMP ↗)
            </a>
          )}
        </div>
        <div className="ss-meta-item">
          <span className="ss-meta-icon">🪑</span>
          <span>{course.enrolledCapacity}</span>
        </div>
        {slot && (
          <div className="ss-meta-item ss-meta-span-all">
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

const COURSE_COLORS = [
  { bg: "#fee2e2", border: "#c8102e", text: "#7f1d1d" },
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  { bg: "#dcfce7", border: "#22c55e", text: "#14532d" },
  { bg: "#fef9c3", border: "#eab308", text: "#713f12" },
  { bg: "#f3e8ff", border: "#a855f7", text: "#581c87" },
  { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  { bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
  { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const START_HOUR = 8   
const END_HOUR = 22    

interface CalendarViewProps {
  added: CourseSection[];
  onRemove: (course: CourseSection) => void; 
}

function CalendarView({ added, onRemove }: CalendarViewProps) {
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<{
    course: CourseSection;
    x: number;
    y: number;
  } | null>(null);

  const colorMap = Object.fromEntries(
    added.map((course, i) => [course.courseSection, COURSE_COLORS[i % COURSE_COLORS.length]])
  )

  const HOUR_HEIGHT = 48 

  function minutesToPx(minutes: number): number {
    return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  const blocksByDay: Record<string, { course: CourseSection; slot: NonNullable<ReturnType<typeof parseRoomAndTime>> }[]> = {}
  DAYS.forEach(d => blocksByDay[d] = [])

  added.forEach(course => {
    const slot = parseRoomAndTime(course.roomAndTime)
    if (!slot) return
    slot.days.forEach(day => {
      if (blocksByDay[day]) {
        blocksByDay[day].push({ course, slot })
      }
    })
  })

  const globalConflicts = detectConflicts(added)

  if (added.length === 0) {
    return (
      <div className="ss-schedule-empty">
        <div className="ss-empty-icon">📅</div>
        <div>No sections added yet</div>
        <div className="ss-empty-sub">Add courses in the Search tab to see your calendar</div>
      </div>
    )
  }

  const handleMouseMove = (e: React.MouseEvent, course: CourseSection) => {
    if (isDeleteMode) {
      setHoveredSection(null);
      return;
    }
    setHoveredSection({
      course,
      x: e.clientX,
      y: e.clientY
    });
  }

  return (
    <div className="ss-calendar-scroll-wrapper" style={{ position: "relative" }}>
      <div className="ss-calendar-controls">
        <button 
          className={`ss-delete-toggle-btn ${isDeleteMode ? 'active' : ''}`}
          onClick={() => setIsDeleteMode(!isDeleteMode)}
        >
          🗑️ {isDeleteMode ? 'Exit Delete Mode' : 'Enable Quick Delete'}
        </button>
        <span className="ss-calendar-instructions">
          {isDeleteMode 
            ? "Click any class block on the grid to permanently remove it from your schedule."
            : "Toggle Delete Mode to quickly clean up your schedule."
          }
        </span>
      </div>

      {globalConflicts.length > 0 && (
        <div className="ss-conflicts" style={{ margin: "0 16px 16px 16px" }}>
          <div className="ss-conflicts-title">
            ⚠ {globalConflicts.length} Conflict{globalConflicts.length > 1 ? "s" : ""} Detected
          </div>
          {globalConflicts.map((c, i) => (
            <div key={i} className="ss-conflict-item">
              {c.sectionA.split(" - ")[0]} ↔ {c.sectionB.split(" - ")[0]} · {c.reason}
            </div>
          ))}
        </div>
      )}

      <div className="ss-calendar-grid">
        {/* Time column now mirrors the vertical structure of the day columns */}
        <div className="ss-calendar-time-col" style={{ position: "relative" }}>
          {/* Hidden spacer to perfectly match the height of the day column headers */}
          <div className="ss-calendar-day-header" style={{ visibility: "hidden" }}>&nbsp;</div>
          
          {/* Relative wrapper for absolute time labels */}
          <div style={{ position: "relative", height: "672px" }}>
            {hours.map(h => (
              <div 
                key={h} 
                className="ss-calendar-time-label" 
                style={{ 
                  position: "absolute",
                  top: (h - START_HOUR) * HOUR_HEIGHT,
                  transform: "translateY(-50%)", // Vertically centers text perfectly on the grid line
                  right: "8px",                  // Adjust spacing to your design
                  margin: 0
                }}
              >
                {h === 12 ? "12p" : h > 12 ? `${h-12}p` : `${h}a`}
              </div>
            ))}
          </div>
        </div>

        <div className="ss-calendar-days-container">
          {DAYS.map(day => {
            const dayBlocks = blocksByDay[day]
            const sortedBlocks = [...dayBlocks].sort((a, b) => a.slot.startMinutes - b.slot.startMinutes)

            const clusters: typeof sortedBlocks[] = []
            sortedBlocks.forEach(block => {
              let placed = false
              for (const cluster of clusters) {
                const overlaps = cluster.some(other => 
                  block.slot.startMinutes < other.slot.endMinutes &&
                  block.slot.endMinutes > other.slot.startMinutes
                )
                if (overlaps) {
                  cluster.push(block)
                  placed = true
                  break
                }
              }
              if (!placed) {
                clusters.push([block])
              }
            })

            const styledBlocks = clusters.flatMap(cluster => {
              return cluster.map((block) => {
                const columnCount = cluster.length

                if (columnCount === 1) {
                  return { ...block, width: "100%", left: "0%" }
                }

                const sortedCluster = [...cluster].sort((a, b) => a.slot.startMinutes - b.slot.startMinutes)
                const positionIdx = sortedCluster.findIndex(item => item.course.courseSection === block.course.courseSection)
                
                const widthVal = 100 / columnCount
                const leftVal = positionIdx * widthVal

                return {
                  ...block,
                  width: `${widthVal - 2}%`,
                  left: `${leftVal}%`
                }
              })
            })

            return (
              <div key={day} className="ss-calendar-day-col" style={{ position: "relative" }}>
                <div className="ss-calendar-day-header">{day}</div>

                <div className="ss-calendar-events-track" style={{ position: "relative", height: "672px", width: "100%" }}>
                  {hours.map(h => (
                    <div 
                      key={h} 
                      className="ss-calendar-hour-line" 
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} 
                    />
                  ))}

                  {styledBlocks.map(({ course, slot, width, left }) => {
                    const top = minutesToPx(slot.startMinutes)
                    const height = minutesToPx(slot.endMinutes) - top
                    const color = colorMap[course.courseSection]
                    const code = course.courseSection.split(" - ")[0]

                    return (
                      <div 
                        key={course.courseSection} 
                        className={`ss-calendar-event-block ${isDeleteMode ? 'ss-can-delete' : ''}`}
                        onMouseEnter={(e) => handleMouseMove(e, course)}
                        onMouseMove={(e) => handleMouseMove(e, course)}
                        onMouseLeave={() => setHoveredSection(null)}
                        onClick={() => {
                          if (isDeleteMode) {
                            onRemove(course);
                          }
                        }}
                        style={{
                          position: "absolute", 
                          top: top + 1,
                          height: height - 2,
                          width: width, 
                          left: left,   
                          background: color.bg,
                          borderLeft: `3px solid ${color.border}`,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          zIndex: 2,
                          boxSizing: "border-box",
                        }}
                      >
                        <div className="ss-calendar-event-code" style={{ color: color.text, fontWeight: "bold" }}>
                          {code}
                        </div>
                        {height > 30 && (
                          <div className="ss-calendar-event-time" style={{ color: color.text, fontSize: "10px" }}>
                            {formatTime(slot.startMinutes)}
                          </div>
                        )}
                        {isDeleteMode && (
                          <div className="ss-delete-overlay-x">❌</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hoveredSection && !isDeleteMode && (
        <div 
          className="ss-calendar-tooltip"
          style={{
            position: "fixed",
            left: hoveredSection.x + 14,
            top: hoveredSection.y + 14,
            zIndex: 9999999
          }}
        >
          <div className="ss-tooltip-header">
            <span className="ss-tooltip-code">{hoveredSection.course.courseSection}</span>
          </div>
          <div className="ss-tooltip-title">{hoveredSection.course.title}</div>
          <div className="ss-tooltip-details">
            <div className="ss-tooltip-detail">📍 {hoveredSection.course.roomAndTime || "N/A"}</div>
            <div className="ss-tooltip-detail">👤 {hoveredSection.course.instructor || "N/A"}</div>
            {hoveredSection.course.status && (
              <div className="ss-tooltip-detail" style={{ marginTop: "4px" }}>
                <span className={`ss-badge ${hoveredSection.course.status.toLowerCase()}`}>
                  {hoveredSection.course.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CourseSection[]>([])
  const [loading, setLoading] = useState(false)
  const [cacheReady, setCacheReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<CourseSection[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Prevents overwriting storage on mount
  const inputRef = useRef<HTMLInputElement>(null)

  const conflicts = detectConflicts(added)
  const conflictSections = new Set(conflicts.flatMap((c) => [c.sectionA, c.sectionB]))

  // Polls for the cache
  useEffect(() => {
  if (cacheReady) return
    const interval = setInterval(() => {
      window.postMessage({ type: "GET_CACHE_STATUS" }, "*")
    }, 500)
    return () => clearInterval(interval)
  }, [cacheReady])

  // 1. LOAD schedule from chrome.storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quack-saved-schedule")
      if (saved) {
        setAdded(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Error loading schedule:", e)
    }
    setIsInitialLoad(false)
  }, [])

  // 2. SAVE schedule to chrome.storage whenever 'added' state changes
  useEffect(() => {
    if (isInitialLoad) return
    try {
      localStorage.setItem("quack-saved-schedule", JSON.stringify(added))
    } catch (e) {
      console.error("Error saving schedule:", e)
    }
  }, [added, isInitialLoad])

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
      if (event.data?.type === "CACHE_STATUS" && event.data.url) {
        setCacheReady(true)
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
          <div className="ss-logo-mark">🦆</div>
          <div>
            <div className="ss-logo-text">QuackScheduler</div>
            <div className="ss-logo-sub">Get your ducks in a row 🦆</div>
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
        <button className={`ss-tab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>
          Calendar
        </button>
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="ss-search-panel">
          <div className="ss-search-bar" style={{ display: !cacheReady ? "none" : "flex" }}>
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

          <div className="ss-results ss-scrollable-container">
            {loading && (
              <div className="ss-loading">
                <div className="ss-spinner" />
                Searching Workday...
              </div>
            )}
            {!cacheReady && (
              <div className="ss-empty">
                <div className="ss-empty-icon">👆</div>
                <div style={{ fontWeight: 600 }}>One quick step first</div>
                <div className="ss-empty-sub">Type anything in the Workday search bar above and press Enter — then come back here to search.</div>
              </div>
            )}
            {cacheReady && !loading && results.length === 0 && (
              <div className="ss-empty">
                <div className="ss-empty-icon">🔍</div>
                <div>Search for a course above</div>
                <div className="ss-empty-sub">e.g. "CS 385" or "algorithms"</div>
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
              <div className="ss-empty-sub">Search for courses and click "+ Add"</div>
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

              {/* Upgraded layout list view containing full CourseCard variants */}
              <div className="ss-added-list ss-scrollable-container">
                {added.map((course) => {
                  const hasConflict = conflictSections.has(course.courseSection)
                  return (
                    <div key={course.courseSection} className={hasConflict ? "ss-schedule-conflict-border" : ""}>
                      <CourseCard 
                        course={course} 
                        isAdded={true} 
                        onToggle={() => toggleAdded(course)}
                        isScheduleTab={true}
                      />
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

      {/* Calendar Tab */}
      {tab === "calendar" && (
        <div className="ss-calendar-tab-panel">
          <CalendarView added={added} onRemove={toggleAdded} />
        </div>
      )}
    </div>
  )
}

export default function SidebarContainer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <button id="stevens-scheduler-toggle" onClick={() => setOpen(true)}>
          QuackScheduler
        </button>
      )}
      {open && <Sidebar onClose={() => setOpen(false)} />}
    </>
  )
}