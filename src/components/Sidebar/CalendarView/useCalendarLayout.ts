// Determines calendar layout

import { parseRoomAndTime } from "../../../lib/parseTime"
import { DAYS } from "../../../lib/courseColors"
import type { CourseSection } from "../../../lib/types"

export type BlockItem = {
  course: CourseSection
  slot: NonNullable<ReturnType<typeof parseRoomAndTime>>
}

export function useCalendarLayout(added: CourseSection[]) {
  const blocksByDay: Record<string, BlockItem[]> = {}
  DAYS.forEach((d) => (blocksByDay[d] = []))

  added.forEach((course) => {
    const slot = parseRoomAndTime(course.roomAndTime)
    if (!slot) return
    slot.days.forEach((day) => {
      if (blocksByDay[day]) {
        blocksByDay[day].push({ course, slot })
      }
    })
  })

  return { blocksByDay }
}