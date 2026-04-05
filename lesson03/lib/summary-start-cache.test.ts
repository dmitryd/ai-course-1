import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildSummaryRequestKey,
  clearSummaryStartResponseCache,
  getOrCreateSummaryStartResponse,
} from "@/lib/summary-start-cache"

describe("summary start cache", () => {
  beforeEach(() => {
    clearSummaryStartResponseCache()
  })

  it("reuses the same in-flight request for matching keys", async () => {
    const loader = vi.fn(async () => {
      await Promise.resolve()
      return {
        status: "processing" as const,
        jobToken: "job-token",
        remainingCredits: 4,
      }
    })

    const requestKey = buildSummaryRequestKey("abc", "https://youtube.com/watch?v=1")

    const [first, second] = await Promise.all([
      getOrCreateSummaryStartResponse(requestKey, loader),
      getOrCreateSummaryStartResponse(requestKey, loader),
    ])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)
  })

  it("returns cached response without calling loader again", async () => {
    const firstLoader = vi.fn(async () => ({
      status: "completed" as const,
      summary: "done",
      remainingCredits: 3,
    }))

    const secondLoader = vi.fn(async () => ({
      status: "completed" as const,
      summary: "other",
      remainingCredits: 2,
    }))

    const requestKey = buildSummaryRequestKey("xyz", "https://youtube.com/watch?v=2")

    const first = await getOrCreateSummaryStartResponse(requestKey, firstLoader)
    const second = await getOrCreateSummaryStartResponse(requestKey, secondLoader)

    expect(firstLoader).toHaveBeenCalledTimes(1)
    expect(secondLoader).not.toHaveBeenCalled()
    expect(second).toEqual(first)
  })
})
