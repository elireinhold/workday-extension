import { describe, test, expect, beforeEach, vi } from "vitest"
import {
  parseWorkdayCourses,
  getSearchCache,
  resetSearchCache,
  searchCourses,
  installFetchInterceptor,
  resolveEndpoint
} from "./workdayApi"

// ─── Helpers ──────────────────────────────────────────────────────────────

const FAKE_URL = "https://wd5.myworkday.com/stevens/faceted-search2/c14/fs0/search.htmld"

function makeFakeItem(overrides: any = {}) {
  return {
    title: { instances: [{ text: "CS-501-A" }] },
    subtitles: [
      { value: "Algorithms" },
      { instances: [{ text: "Open" }] },
      { instances: [{ text: "Dr. Smith" }] },
    ],
    detailResultFields: [
      { instances: [{ text: "Mon/Wed 10:00-11:30" }] },
      { instances: [{ text: "Hoboken" }] },
      {},
      { instances: [{ text: "Lecture" }] },
      { instances: [{ text: "In-Person" }] },
      { value: "25/30" },
    ],
    ...overrides,
  }
}

function makeWorkdayResponse(items: any[]) {
  return { children: [{ listItems: items }] }
}

// ─── parseWorkdayCourses ──────────────────────────────────────────────────

describe("parseWorkdayCourses", () => {
  test("parses a full item correctly", () => {
    const result = parseWorkdayCourses(makeWorkdayResponse([makeFakeItem()]))
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      courseSection:    "CS-501-A",
      title:            "Algorithms",
      status:           "Open",
      instructor:       "Dr. Smith",
      roomAndTime:      "Mon/Wed 10:00-11:30",
      campus:           "Hoboken",
      format:           "Lecture",
      deliveryMode:     "In-Person",
      enrolledCapacity: "25/30",
    })
  })

  test("returns empty array when listItems is missing", () => {
    expect(parseWorkdayCourses({})).toEqual([])
    expect(parseWorkdayCourses({ children: [] })).toEqual([])
  })

  test("falls back to empty strings for missing fields", () => {
    const result = parseWorkdayCourses(makeWorkdayResponse([{}]))
    expect(result[0].courseSection).toBe("")
    expect(result[0].instructor).toBe("")
    expect(result[0].enrolledCapacity).toBe("")
  })

  test("parses multiple items", () => {
    const result = parseWorkdayCourses(makeWorkdayResponse([makeFakeItem(), makeFakeItem()]))
    expect(result).toHaveLength(2)
  })
})

// ─── Fetch interceptor + cache ────────────────────────────────────────────

describe("fetch interceptor", () => {
  beforeEach(() => {
    resetSearchCache()
    installFetchInterceptor()
  })

  test("getSearchCache() is null before any search", () => {
    expect(getSearchCache()).toBeNull()
  })

  test("cache is populated when a matching fetch fires", async () => {
    await window.fetch(FAKE_URL, { method: "POST" })
    expect(getSearchCache()).toBe(FAKE_URL)
  })

  test("non-matching fetches do not populate cache", async () => {
    await window.fetch("https://example.com/something-else")
    expect(getSearchCache()).toBeNull()
  })

  test("cache is not overwritten by a second matching fetch", async () => {
    const second = FAKE_URL.replace("fs0", "fs1")
    await window.fetch(FAKE_URL)
    await window.fetch(second)
    expect(getSearchCache()).toBe(FAKE_URL)
  })

  test("resetSearchCache() clears the cached URL", async () => {
    await window.fetch(FAKE_URL)
    expect(getSearchCache()).toBe(FAKE_URL)
    resetSearchCache()
    expect(getSearchCache()).toBeNull()
  })
})

// ─── searchCourses ────────────────────────────────────────────────────────

describe("searchCourses", () => {
  const mockSession = { sessionSecureToken: "tok_abc123" }
  const fakeResponse = makeWorkdayResponse([makeFakeItem()])

  beforeEach(() => {
    resetSearchCache()
    installFetchInterceptor()
    // @ts-ignore
    global.workday = { session: mockSession }
  })

  test("uses cached URL immediately when cache is pre-populated", async () => {
    await window.fetch(FAKE_URL)

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(fakeResponse), { status: 200 })
    )

    const results = await searchCourses("algorithms")
    expect(fetchSpy).toHaveBeenCalledWith(
      FAKE_URL,
      expect.objectContaining({ method: "POST" })
    )
    expect(results).toHaveLength(1)
    fetchSpy.mockRestore()
  })

  test("waits for endpointReady when cache is empty, then resolves", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fakeResponse), { status: 200 })
    )

    // Start the search before the cache is populated — it will await endpointReady
    const ourSearch = searchCourses("algorithms")

    // Simulate the organic search resolving the endpoint
    resolveEndpoint(FAKE_URL)  // call this directly instead of going through fetch

    const results = await ourSearch
    expect(results).toHaveLength(1)

    vi.restoreAllMocks()
  })

  test("throws and clears cache on non-ok response", async () => {
    await window.fetch(FAKE_URL)

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    )

    await expect(searchCourses("algorithms")).rejects.toThrow("Search failed: 401")
    expect(getSearchCache()).toBeNull()
  })

  test("sends correct POST body fields", async () => {
    await window.fetch(FAKE_URL)

    let capturedBody: string | null = null
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      capturedBody = init?.body as string
      return new Response(JSON.stringify(fakeResponse), { status: 200 })
    })

    await searchCourses("machine learning")

    const params = new URLSearchParams(capturedBody!)
    expect(params.get("q")).toBe("machine learning")
    expect(params.get("sessionSecureToken")).toBe("tok_abc123")
    expect(params.get("clientRequestID")).toMatch(/^[a-f0-9]{32}$/)
  })
})