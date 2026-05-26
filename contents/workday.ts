import type { PlasmoCSConfig } from "plasmo"
import { searchCourses, getSearchCache, primeCacheFromDOM } from "../lib/workdayApi"
primeCacheFromDOM()

export const config: PlasmoCSConfig = {
  matches: ["https://wd5.myworkday.com/stevens/*"],
  world: "MAIN"
}

window.addEventListener("message", async (event) => {
  if (event.source !== window) return

  switch (event.data?.type) {
    case "SEARCH_COURSES": {
      try {
        const courses = await searchCourses(event.data.query)
        window.postMessage({ type: "SEARCH_RESULTS", courses }, "*")
      } catch (err: any) {
        window.postMessage({ type: "SEARCH_ERROR", error: err.message }, "*")
      }
      break
    }

    // Let the relay script check cache state for debugging
    case "GET_CACHE_STATUS": {
      window.postMessage({ type: "CACHE_STATUS", url: getSearchCache() }, "*")
      break
    }
  }
})