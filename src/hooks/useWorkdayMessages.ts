// Manages searching for courses by sending and receiving messages across the Chrome extension's execution contexts

import { useState, useEffect, useCallback } from "react"
import type { CourseSection } from "../lib/types"

export function useWorkdayMessages() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CourseSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type === "SEARCH_RESULTS") {
        setResults(event.data.courses)
        setLoading(false)
        setError(null)
      }
      if (event.data?.type === "SEARCH_ERROR") {
        setError(event.data.error)
        setLoading(false)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const handleSearch = useCallback(() => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    setError(null)
    window.postMessage({ type: "SEARCH_COURSES", query: query.trim() }, "*")
  }, [query])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    handleSearch
  }
}