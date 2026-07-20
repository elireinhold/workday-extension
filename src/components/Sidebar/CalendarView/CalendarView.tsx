// Main calendar logic that is used in the calendar tab

import React, { useState } from "react"
import type { CourseSection } from "../../../lib/types"
import { detectConflicts } from "../../../lib/conflictDetect"
import { parseRoomAndTime } from "../../../lib/parseTime"
import { formatTime } from "../../../lib/formatTime"
import { COURSE_COLORS, DAYS, START_HOUR, END_HOUR, HOUR_HEIGHT } from "../../../lib/courseColors"
import { useCalendarLayout } from "./useCalendarLayout"
import { CalendarTooltip } from "./CalendarTooltip"

interface CalendarViewProps {
  added: CourseSection[]
  onRemove: (course: CourseSection) => void
}

export function CalendarView({ added, onRemove }: CalendarViewProps) {
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [hoveredSection, setHoveredSection] = useState<{
    course: CourseSection
    x: number
    y: number
  } | null>(null)

  const { blocksByDay } = useCalendarLayout(added)

  const colorMap = Object.fromEntries(
    added.map((course, i) => [course.courseSection, COURSE_COLORS[i % COURSE_COLORS.length]])
  )

  function minutesToPx(minutes: number): number {
    return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
  const globalConflicts = detectConflicts(added)

  // Shows message if no courses are added yet
  if (added.length === 0) {
    return (
      <div className="ss-schedule-empty">
        <div className="ss-empty-icon">📅</div>
        <div>No sections added yet</div>
        <div className="ss-empty-sub">Add courses in the Search tab to see your calendar</div>
      </div>
    )
  }

  // Shows course details when mouse is hovered over
  const handleMouseMove = (e: React.MouseEvent, course: CourseSection) => {
    if (isDeleteMode) {
      setHoveredSection(null)
      return
    }
    setHoveredSection({
      course,
      x: e.clientX,
      y: e.clientY
    })
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
        <div className="ss-calendar-time-col" style={{ position: "relative" }}>
          <div className="ss-calendar-day-header" style={{ visibility: "hidden" }}>&nbsp;</div>
          <div style={{ position: "relative", height: "672px" }}>
            {hours.map((h) => (
              <div 
                key={h} 
                className="ss-calendar-time-label" 
                style={{ 
                  position: "absolute",
                  top: (h - START_HOUR) * HOUR_HEIGHT,
                  transform: "translateY(-50%)",
                  right: "8px",
                  margin: 0
                }}
              >
                {h === 12 ? "12p" : h > 12 ? `${h-12}p` : `${h}a`}
              </div>
            ))}
          </div>
        </div>

        <div className="ss-calendar-days-container">
          {DAYS.map((day) => {
            const dayBlocks = blocksByDay[day]
            const sortedBlocks = [...dayBlocks].sort((a, b) => a.slot.startMinutes - b.slot.startMinutes)

            const clusters: typeof sortedBlocks[] = []
            sortedBlocks.forEach((block) => {
              let placed = false
              for (const cluster of clusters) {
                const overlaps = cluster.some(
                  (other) =>
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

            const styledBlocks = clusters.flatMap((cluster) => {
              return cluster.map((block) => {
                const columnCount = cluster.length

                if (columnCount === 1) {
                  return { ...block, width: "100%", left: "0%" }
                }

                const sortedCluster = [...cluster].sort((a, b) => a.slot.startMinutes - b.slot.startMinutes)
                const positionIdx = sortedCluster.findIndex((item) => item.course.courseSection === block.course.courseSection)
                
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
                  {hours.map((h) => (
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
                            onRemove(course)
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
        <CalendarTooltip hoveredSection={hoveredSection} />
      )}
    </div>
  )
}