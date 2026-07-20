/// <reference types="chrome" />
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://wd5.myworkday.com/stevens/*"]
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // ── Search ────────────────────────────────────────────────────────────
  if (message.type === "SEARCH_COURSES") {
    window.postMessage({ type: "SEARCH_COURSES", query: message.query }, "*")

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SEARCH_RESULTS") {
        window.removeEventListener("message", handler)
        sendResponse({ success: true, courses: event.data.courses })
      }
      if (event.data?.type === "SEARCH_ERROR") {
        window.removeEventListener("message", handler)
        sendResponse({ success: false, error: event.data.error })
      }
    }
    window.addEventListener("message", handler)
    return true
  }

  // ── Cache status (for debugging) ──────────────────────────────────────
  if (message.type === "GET_CACHE_STATUS") {
    window.postMessage({ type: "GET_CACHE_STATUS" }, "*")

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "CACHE_STATUS") {
        window.removeEventListener("message", handler)
        sendResponse({ url: event.data.url })
      }
    }
    window.addEventListener("message", handler)
    return true
  }
})