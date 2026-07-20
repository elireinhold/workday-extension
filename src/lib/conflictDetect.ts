// Detects conflicts between classes in saved schedule

import type { CourseSection } from "./types"
import { parseRoomAndTime } from "./parseTime"

export interface Conflict {
  sectionA: string
  sectionB: string
  reason: string
}

function slotsOverlap(
  daysA: string[], startA: number, endA: number,
  daysB: string[], startB: number, endB: number
): boolean {
  const sharedDays = daysA.filter((d) => daysB.includes(d))
  if (sharedDays.length === 0) return false
  return startA < endB && endA > startB
}

export function detectConflicts(sections: CourseSection[]): Conflict[] {
  const conflicts: Conflict[] = []

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const a = sections[i]
      const b = sections[j]

      const slotA = parseRoomAndTime(a.roomAndTime)
      const slotB = parseRoomAndTime(b.roomAndTime)

      if (!slotA || !slotB) continue

      if (slotsOverlap(slotA.days, slotA.startMinutes, slotA.endMinutes,
                       slotB.days, slotB.startMinutes, slotB.endMinutes)) {
        conflicts.push({
          sectionA: a.courseSection,
          sectionB: b.courseSection,
          reason: `Time overlap on ${slotA.days.filter(d => slotB.days.includes(d)).join(", ")}`,
        })
      }
    }
  }

  return conflicts
}
