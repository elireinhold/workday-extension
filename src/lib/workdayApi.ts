import type { CourseSection } from "./types"

declare const workday: {
  session: { sessionSecureToken: string }
}

// ─── Endpoint cache + promise ─────────────────────────────────────────────

let cachedSearchUrl: string | null = null
// make it exportable for tests
export let resolveEndpoint!: (url: string) => void
export let endpointReady: Promise<string> = new Promise((res) => { resolveEndpoint = res })

// ─── Fetch interceptor (must run in MAIN world) ───────────────────────────

const originalFetch = window.fetch

window.fetch = async function (...args): Promise<Response> {
  const url = args[0] instanceof Request ? args[0].url : String(args[0])

  if (!cachedSearchUrl && url.includes("faceted-search2") && url.endsWith("search.htmld")) {
    cachedSearchUrl = url
    resolveEndpoint(url)  // always calls the current resolveEndpoint, not a stale closure
  }

  return originalFetch.apply(this, args)
}

// ─── Parsing ──────────────────────────────────────────────────────────────

export function parseWorkdayCourses(json: any): CourseSection[] {
  const listItems = json.children?.[0]?.listItems ?? []
  return listItems.map((item: any) => {
    const details = item.detailResultFields
    return {
      courseSection:    item.title?.instances?.[0]?.text ?? "",
      title:            item.subtitles?.[0]?.value ?? "",
      status:           item.subtitles?.[1]?.instances?.[0]?.text ?? "",
      instructor:       item.subtitles?.[2]?.instances?.[0]?.text ?? "",
      roomAndTime:      details?.[0]?.instances?.[0]?.text ?? "",
      campus:           details?.[1]?.instances?.[0]?.text ?? "",
      format:           details?.[3]?.instances?.[0]?.text ?? "",
      deliveryMode:     details?.[4]?.instances?.[0]?.text ?? "",
      enrolledCapacity: details?.[5]?.value ?? "",
    }
  })
}

// ─── Search ───────────────────────────────────────────────────────────────

export async function searchCourses(query: string): Promise<CourseSection[]> {
  const searchUrl = cachedSearchUrl ?? await endpointReady

  const body = new URLSearchParams({
    q: query,
    sessionSecureToken: workday.session.sessionSecureToken,
    clientRequestID: crypto.randomUUID().replace(/-/g, "")
  })

  const res = await fetch(searchUrl, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  })

  if (!res.ok) {
    cachedSearchUrl = null
    throw new Error(`Search failed: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return parseWorkdayCourses(json)
}

// ─── Cache utilities (used by tests / debug) ──────────────────────────────

export function getSearchCache(): string | null {
  return cachedSearchUrl
}

export function resetSearchCache(): void {
  cachedSearchUrl = null
  endpointReady = new Promise((res) => { resolveEndpoint = res })
}

export function installFetchInterceptor() {
  const originalFetch = window.fetch
  window.fetch = async function (...args): Promise<Response> {
    const url = args[0] instanceof Request ? args[0].url : String(args[0])
    if (!cachedSearchUrl && url.includes("faceted-search2") && url.endsWith("search.htmld")) {
      cachedSearchUrl = url
      resolveEndpoint(url)
    }
    return originalFetch.apply(this, args)
  }
}

// Call it once on load
installFetchInterceptor()

export function primeCacheFromDOM(): void {
  if (cachedSearchUrl) return

  function tryTrigger() {
    const input = document.querySelector<HTMLInputElement>(
      'input[data-automation-id="textInputBox"]'
    )
    if (!input) return false

    setTimeout(() => {
      input.focus()
      input.value = "cs"
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "c" }))
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "c" }))

      setTimeout(() => {
        input.value = ""
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.blur()
      }, 800)
    }, 1000)

    return true
  }

  // Try immediately — input may already be in the DOM
  if (tryTrigger()) return

  // Otherwise wait for it to appear
  const observer = new MutationObserver(() => {
    if (tryTrigger()) observer.disconnect()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

export function primeCacheFromAnyRequest(): void {
  if (cachedSearchUrl) return

  const originalOpen = XMLHttpRequest.prototype.open
  const probe = new XMLHttpRequest()
  
  // Watch for any faceted-search2 URL in any XHR to derive the search URL
  XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
    if (!cachedSearchUrl && url.includes("faceted-search2")) {
      // Derive the search URL from any faceted-search2 request
      const match = url.match(/(https:\/\/wd5\.myworkday\.com\/[^/]+\/faceted-search2\/c\d+\/fs\d+)/)
      if (match) {
        const searchUrl = `${match[1]}/search.htmld`
        cachedSearchUrl = searchUrl
        resolveEndpoint(searchUrl)
      }
    }
    return originalOpen.apply(this, [method, url, ...rest])
  }
}

const originalOpen = XMLHttpRequest.prototype.open
const originalSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
  this._interceptedUrl = url
  return originalOpen.apply(this, [method, url, ...rest])
}

XMLHttpRequest.prototype.send = function(...args) {
  const url = this._interceptedUrl ?? ""
  if (!cachedSearchUrl && url.includes("faceted-search2") && url.endsWith("search.htmld")) {
    cachedSearchUrl = url
    resolveEndpoint(url)
  }
  return originalSend.apply(this, args)
}

