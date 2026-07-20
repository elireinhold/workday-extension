// Stores local Chrome data so classes saved to schedule are not lost when page is refreshed

import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import type { CourseSection } from "../lib/types"

// Force chrome.storage.local explicitly
const storage = new Storage({ area: "local" })

export function useScheduleStorage() {
  const [added, setAdded, { isLoading }] = useStorage<CourseSection[]>(
    {
      key: "savedSchedule",
      instance: storage
    },
    []
  )

  const toggleAdded = (course: CourseSection) => {
    setAdded((prev = []) => {
      const exists = prev.some((c) => c.courseSection === course.courseSection)
      return exists
        ? prev.filter((c) => c.courseSection !== course.courseSection)
        : [...prev, course]
    })
  }

  const clearAll = () => setAdded([])

  return { added: added ?? [], toggleAdded, clearAll, isLoading }
}