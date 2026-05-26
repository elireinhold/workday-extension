export interface TimeSlot {
  days: string[]
  startMinutes: number
  endMinutes: number
  room: string
  display: string
}

const DAY_MAP: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

function timeToMinutes(time: string): number {
  const match = time.trim().match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3].toUpperCase()
  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return hours * 60 + minutes
}

export function parseRoomAndTime(roomAndTime: string): TimeSlot | null {
  if (!roomAndTime) return null
  const parts = roomAndTime.split("|").map((s) => s.trim())
  if (parts.length < 3) return null

  const room = parts[0]
  const daysRaw = parts[1]
  const timeRange = parts[2]

  const days = daysRaw
    .split("/")
    .map((d) => DAY_MAP[d.toLowerCase()] ?? d)
    .filter(Boolean)

  const timeMatch = timeRange.match(/(.+?)\s*-\s*(.+)/)
  if (!timeMatch) return null

  const startMinutes = timeToMinutes(timeMatch[1])
  const endMinutes = timeToMinutes(timeMatch[2])

  return { days, startMinutes, endMinutes, room, display: roomAndTime }
}

export function formatDays(days: string[]): string {
  const short: Record<string, string> = {
    Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa", Sun: "Su",
  }
  return days.map((d) => short[d] ?? d).join("")
}
