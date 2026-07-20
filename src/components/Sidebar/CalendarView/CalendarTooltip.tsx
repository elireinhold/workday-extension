// What is seen when user hovers over class in their calendar
// Shows course details (basically same as course card)

import React from "react"
import type { CourseSection } from "../../../lib/types"

interface CalendarTooltipProps {
  hoveredSection: {
    course: CourseSection
    x: number
    y: number
  }
}

export function CalendarTooltip({ hoveredSection }: CalendarTooltipProps) {
  return (
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
  )
}