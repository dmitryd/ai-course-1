import { AppError, createErrorResponse, toResponseInit } from "@/lib/errors"
import { applyTemporaryLoginCreditRefill, requireAuthenticatedUser } from "@/lib/credits"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function toRouteError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(createErrorResponse(error.code, error.message), toResponseInit(error.status))
  }

  return Response.json(
    createErrorResponse("INTERNAL_ERROR", "Не удалось подготовить аккаунт после входа."),
    toResponseInit(500),
  )
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await requireAuthenticatedUser(supabase)
    const credits = await applyTemporaryLoginCreditRefill(supabase)
    const email = user.email?.trim()

    if (!email) {
      throw new AppError("INTERNAL_ERROR", 500, "У пользователя не найден email.")
    }

    return Response.json({
      email,
      credits,
    })
  } catch (error) {
    return toRouteError(error)
  }
}
