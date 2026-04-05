// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/errors"

const mocks = vi.hoisted(() => {
  const supabase = {} as never

  return {
    supabase,
    applyTemporaryLoginCreditRefill: vi.fn(),
    createSupabaseServerClient: vi.fn(async () => supabase),
    requireAuthenticatedUser: vi.fn(),
  }
})

vi.mock("@/lib/credits", () => ({
  applyTemporaryLoginCreditRefill: mocks.applyTemporaryLoginCreditRefill,
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { POST } from "@/app/api/auth/login-bootstrap/route"

describe("POST /api/auth/login-bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns credits after applying the temporary refill", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ email: "member@example.com" })
    mocks.applyTemporaryLoginCreditRefill.mockResolvedValue(5)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      email: "member@example.com",
      credits: 5,
    })
    expect(mocks.applyTemporaryLoginCreditRefill).toHaveBeenCalledWith(mocks.supabase)
  })

  it("maps AppError failures into api responses", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(
      new AppError("AUTH_REQUIRED", 401, "Войдите в аккаунт, чтобы продолжить."),
    )

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({
      status: "error",
      error: {
        code: "AUTH_REQUIRED",
        message: "Войдите в аккаунт, чтобы продолжить.",
      },
    })
  })
})
