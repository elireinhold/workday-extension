// RateMyProfessor search helper for Stevens Institute of Technology (ID: 982)

export function getRmpSearchUrl(instructorName: string): string {
  if (!instructorName || instructorName === "TBA") return ""

  // 1. Remove academic titles
  let cleanName = instructorName.replace(/\b(Dr\.|Prof\.)\s*/gi, "")

  // 2. Convert "LastName, FirstName" to "FirstName LastName"
  if (cleanName.includes(",")) {
    const parts = cleanName.split(",").map((p) => p.trim())
    if (parts.length >= 2) {
      cleanName = `${parts[1]} ${parts[0]}`
    }
  }

  // 3. Strip middle initials
  cleanName = cleanName.replace(/\s+[A-Z]\.?\s+/g, " ")

  // 4. URL encode
  const encodedName = encodeURIComponent(cleanName.trim())

  return `https://www.ratemyprofessors.com/search/professors/982?q=${encodedName}`
}