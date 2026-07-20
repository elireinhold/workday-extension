import React, { useState } from "react"
import { useScheduleStorage } from "../../hooks/useScheduleStorage"
import { useWorkdayMessages } from "../../hooks/useWorkdayMessages"
import { SidebarHeader } from "./SidebarHeader"
import { SearchTab } from "./SearchTab"
import { ScheduleTab } from "./ScheduleTab"
import { CalendarView } from "./CalendarView/CalendarView"
import { useStorage } from "@plasmohq/storage/hook"

type Tab = "search" | "schedule" | "calendar"

export function Sidebar({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("search")
  const { added, toggleAdded, clearAll } = useScheduleStorage()
  const { query, setQuery, results, loading, error, handleSearch } = useWorkdayMessages()
  
  return (
    <div id="stevens-scheduler-root">
      <SidebarHeader onClose={onClose} />

      {/* Tabs */}
      <div className="ss-tabs">
        <button className={`ss-tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
          Search
        </button>
        <button className={`ss-tab ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>
          My Schedule {added.length > 0 && `(${added.length})`}
        </button>
        <button className={`ss-tab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>
          Calendar
        </button>
      </div>

      {/* Search Tab */}
      {tab === "search" && (
        <SearchTab
          query={query}
          setQuery={setQuery}
          results={results}
          loading={loading}
          error={error}
          onSearch={handleSearch}
          added={added}
          onToggleAdded={toggleAdded}
        />
      )}

      {/* Schedule Tab */}
      {tab === "schedule" && (
        <ScheduleTab
          added={added}
          onToggleAdded={toggleAdded}
          onClearAll={clearAll}
        />
      )}

      {/* Calendar Tab */}
      {tab === "calendar" && (
        <div className="ss-calendar-tab-panel">
          <CalendarView added={added} onRemove={toggleAdded} />
        </div>
      )}
    </div>
  )
}