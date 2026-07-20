export interface TimeSlot {
  days: string[]
  startMinutes: number
  endMinutes: number
  room: string
  display: string
}

export interface ParsedTime {
  hours: number
  minutes: number
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

// Parses a 12-hour time string (e.g., "9:30 AM", "02:15 PM") into hours (24h) and minutes.

export function parseTime(timeStr: string): ParsedTime | null {
  if (!timeStr) return null
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[3].toUpperCase()

  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0

  return { hours, minutes }
}

// Converts a time string (e.g., "9:30 AM") into total minutes from midnight.

export function timeToMinutes(time: string): number {
  const parsed = parseTime(time)
  if (!parsed) return 0
  return parsed.hours * 60 + parsed.minutes
}

// Parses a combined room and schedule string (e.g., "Babbio 104 | Monday / Wednesday | 9:30 AM - 10:45 AM")

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

// Formats day array strings into abbreviated day codes (e.g., ["Mon", "Wed"] -> "MW")

export function formatDays(days: string[]): string {
  const short: Record<string, string> = {
    Mon: "M",
    Tue: "T",
    Wed: "W",
    Thu: "Th",
    Fri: "F",
    Sat: "Sa",
    Sun: "Su",
  }
  return days.map((d) => short[d] ?? d).join("")
}