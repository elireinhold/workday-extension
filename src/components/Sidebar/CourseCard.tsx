// Course card that is used to display course details across all tabs

import React from "react"
import type { CourseSection } from "../../lib/types"
import { parseRoomAndTime, formatDays } from "../../lib/parseTime"
import { formatTime } from "../../lib/formatTime"
import { getRmpSearchUrl } from "../../lib/rmp"
import { StatusBadge } from "./StatusBadge"

interface CourseCardProps {
  course: CourseSection
  isAdded: boolean
  onToggle: () => void
  isScheduleTab?: boolean
}

export function CourseCard({
  course,
  isAdded,
  onToggle,
  isScheduleTab = false
}: CourseCardProps) {
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
                color: "#c8102e",
                textDecoration: "underline",
                cursor: "pointer"
              }}
              onClick={(e) => e.stopPropagation()}
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