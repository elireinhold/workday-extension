// Schedule tab that shows all courses person added to their schedule for (called my schedule)

import React from "react"
import type { CourseSection } from "../../lib/types"
import { detectConflicts } from "../../lib/conflictDetect"
import { CourseCard } from "./CourseCard"

interface ScheduleTabProps {
  added: CourseSection[]
  onToggleAdded: (course: CourseSection) => void
  onClearAll: () => void
}

export function ScheduleTab({ added, onToggleAdded, onClearAll }: ScheduleTabProps) {
  const conflicts = detectConflicts(added)
  const conflictSections = new Set(conflicts.flatMap((c) => [c.sectionA, c.sectionB]))

  return (
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

          <div className="ss-added-list ss-scrollable-container">
            {added.map((course) => {
              const hasConflict = conflictSections.has(course.courseSection)
              return (
                <div key={course.courseSection} className={hasConflict ? "ss-schedule-conflict-border" : ""}>
                  <CourseCard 
                    course={course} 
                    isAdded={true} 
                    onToggle={() => onToggleAdded(course)}
                    isScheduleTab={true}
                  />
                </div>
              )
            })}
          </div>

          <button className="ss-clear-btn" onClick={onClearAll}>
            Clear All
          </button>
        </>
      )}
    </div>
  )
}