import { AppError, createErrorResponse, toResponseInit } from "@/lib/errors"
import { getAvailableCredits, requireAuthenticatedUser } from "@/lib/credits"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function toRouteError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(createErrorResponse(error.code, error.message), toResponseInit(error.status))
  }

  return Response.json(
    createErrorResponse("INTERNAL_ERROR", "Не удалось загрузить данные аккаунта."),
    toResponseInit(500),
  )
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await requireAuthenticatedUser(supabase)
    const credits = await getAvailableCredits(supabase)
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
