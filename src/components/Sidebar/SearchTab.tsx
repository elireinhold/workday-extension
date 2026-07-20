// Search tab where user can search for courses to add to their schedule

import React, { useEffect, useRef } from "react"
import { useStorage } from "@plasmohq/storage/hook"
import type { CourseSection } from "../../lib/types"
import { CourseCard } from "./CourseCard"
import workdayHelpImg from "data-base64:~assets/search-instructions.png"

interface SearchTabProps {
  query: string
  setQuery: (q: string) => void
  results: CourseSection[]
  loading: boolean
  error: string | null
  onSearch: () => void
  added: CourseSection[]
  onToggleAdded: (course: CourseSection) => void
}

export function SearchTab({
  query,
  setQuery,
  results,
  loading,
  error,
  onSearch,
  added,
  onToggleAdded
}: SearchTabProps) {
  // Replace standard useState with Plasmo's useStorage
  // First argument is the storage key name ("cacheReady")
  const [cacheReady, setCacheReady] = useStorage<boolean>("cacheReady", false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return

      if (event.data?.type === "CACHE_STATUS") {
        const isReady = Boolean(event.data.url || event.data.ready || event.data.cached)
        setCacheReady(isReady)
      }
    }

    window.addEventListener("message", handler)
    window.postMessage({ type: "GET_CACHE_STATUS" }, "*")

    const interval = setInterval(() => {
      window.postMessage({ type: "GET_CACHE_STATUS" }, "*")
    }, 1000)

    return () => {
      window.removeEventListener("message", handler)
      clearInterval(interval)
    }
  }, [setCacheReady])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch()
  }

  const isAdded = (course: CourseSection) =>
    added.some((c) => c.courseSection === course.courseSection)

  return (
    <div className="ss-search-panel">
      {cacheReady && (
        <div className="ss-search-bar">
          <input
            ref={inputRef}
            className="ss-input"
            placeholder="CS 115, algorithms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            className="ss-search-btn"
            onClick={onSearch}
            disabled={loading || !query.trim()}>
            {loading ? "..." : "Search"}
          </button>
        </div>
      )}

      <div className="ss-results ss-scrollable-container">
        {loading && (
          <div className="ss-loading">
            <div className="ss-spinner" />
            Searching Workday...
          </div>
        )}

        {!cacheReady && !loading && (
          <div className="ss-empty">
            <div className="ss-empty-icon">👆</div>
            <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "6px" }}>
              One Quick Step First!
            </div>
            <div className="ss-empty-sub" style={{ lineHeight: "1.5" }}>
              Navigate to <strong>Find Course Sections</strong> in <strong>Academics</strong>, type anything in the Workday search bar, and press <strong>Enter</strong>.
              <br /><br />
              After you have done that, come back here to search and build your schedule!
            </div>
            <img
              src={workdayHelpImg}
              alt="Where to find the Workday course search bar"
              className="ss-help-image"
              style={{ marginTop: "12px", width: "100%", borderRadius: "8px", border: "1px solid #e2e8f0" }}
            />
          </div>
        )}

        {error && cacheReady && (
          <div className="ss-empty">
            <div className="ss-empty-icon">⚠️</div>
            <div>{error}</div>
            <div className="ss-empty-sub">Make sure you've done one search in the Workday UI first.</div>
          </div>
        )}

        {cacheReady && !loading && !error && results.length === 0 && (
          <div className="ss-empty">
            <div className="ss-empty-icon">🔍</div>
            <div>Search for a course above</div>
            <div className="ss-empty-sub">e.g. "CS 385" or "algorithms"</div>
          </div>
        )}

        {cacheReady &&
          results.map((course) => (
            <CourseCard
              key={course.courseSection}
              course={course}
              isAdded={isAdded(course)}
              onToggle={() => onToggleAdded(course)}
            />
          ))}
      </div>
    </div>
  )
}