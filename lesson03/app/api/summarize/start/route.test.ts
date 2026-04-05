// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/errors"

const mocks = vi.hoisted(() => {
  const supabase = {} as never

  return {
    supabase,
    consumeCredit: vi.fn(),
    createSupabaseServerClient: vi.fn(async () => supabase),
    getAvailableCredits: vi.fn(),
    getServerEnv: vi.fn(() => ({ appJobTokenSecret: "secret" })),
    normalizeYouTubeUrl: vi.fn((url: string) => url),
    requireAuthenticatedUser: vi.fn(),
    signJobToken: vi.fn(() => "signed-job-token"),
    startTranscript: vi.fn(),
    summarizeTranscriptInRussian: vi.fn(),
  }
})

vi.mock("@/lib/credits", () => ({
  consumeCredit: mocks.consumeCredit,
  getAvailableCredits: mocks.getAvailableCredits,
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}))

vi.mock("@/lib/env", () => ({
  getServerEnv: mocks.getServerEnv,
}))

vi.mock("@/lib/gemini", () => ({
  summarizeTranscriptInRussian: mocks.summarizeTranscriptInRussian,
}))

vi.mock("@/lib/job-token", () => ({
  signJobToken: mocks.signJobToken,
}))

vi.mock("@/lib/supadata", () => ({
  startTranscript: mocks.startTranscript,
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

vi.mock("@/lib/youtube", () => ({
  normalizeYouTubeUrl: mocks.normalizeYouTubeUrl,
}))

import { POST } from "@/app/api/summarize/start/route"

describe("POST /api/summarize/start", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns auth error when the user is not signed in", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(
      new AppError("AUTH_REQUIRED", 401, "Войдите в аккаунт, чтобы продолжить."),
    )

    const response = await POST(
      new Request("http://localhost/api/summarize/start", {
        method: "POST",
        body: JSON.stringify({ url: "https://www.youtube.com/watch?v=test" }),
      }),
    )

    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe("AUTH_REQUIRED")
  })

  it("blocks summarization when credits are exhausted", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" })
    mocks.getAvailableCredits.mockResolvedValue(0)

    const response = await POST(
      new Request("http://localhost/api/summarize/start", {
        method: "POST",
        body: JSON.stringify({ url: "https://www.youtube.com/watch?v=test" }),
      }),
    )

    const data = await response.json()

    expect(response.status).toBe(402)
    expect(data.error.code).toBe("INSUFFICIENT_CREDITS")
    expect(mocks.startTranscript).not.toHaveBeenCalled()
  })

  it("charges one credit and returns a job token for async videos", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-42" })
    mocks.getAvailableCredits.mockResolvedValue(5)
    mocks.startTranscript.mockResolvedValue({ kind: "processing", jobId: "job-1" })
    mocks.consumeCredit.mockResolvedValue(4)

    const response = await POST(
      new Request("http://localhost/api/summarize/start", {
        method: "POST",
        body: JSON.stringify({ url: "https://www.youtube.com/watch?v=test" }),
      }),
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.signJobToken).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-1",
        sourceUrl: "https://www.youtube.com/watch?v=test",
        userId: "user-42",
      }),
      "secret",
    )
    expect(data).toEqual({
      status: "processing",
      jobToken: "signed-job-token",
      remainingCredits: 4,
    })
  })

  it("returns the completed summary together with remaining credits", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-7" })
    mocks.getAvailableCredits.mockResolvedValue(2)
    mocks.startTranscript.mockResolvedValue({
      kind: "completed",
      content: "transcript",
      lang: "en",
      availableLangs: ["en", "ru"],
    })
    mocks.summarizeTranscriptInRussian.mockResolvedValue("Готовая сводка")
    mocks.consumeCredit.mockResolvedValue(1)

    const response = await POST(
      new Request("http://localhost/api/summarize/start", {
        method: "POST",
        body: JSON.stringify({ url: "https://www.youtube.com/watch?v=test" }),
      }),
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      status: "completed",
      summary: "Готовая сводка",
      remainingCredits: 1,
      meta: {
        source: "youtube",
        lang: "en",
        availableLangs: ["en", "ru"],
      },
    })
  })
})
