import { ZodError } from "zod"

import { AppError, createErrorResponse, toResponseInit } from "@/lib/errors"
import { consumeCredit, getAvailableCredits, requireAuthenticatedUser } from "@/lib/credits"
import { getServerEnv } from "@/lib/env"
import { summarizeTranscriptInRussian } from "@/lib/gemini"
import { signJobToken } from "@/lib/job-token"
import { summarizeStartRequestSchema } from "@/lib/summarize-schema"
import { startTranscript } from "@/lib/supadata"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeYouTubeUrl } from "@/lib/youtube"

function toRouteError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(createErrorResponse(error.code, error.message), toResponseInit(error.status))
  }

  if (error instanceof ZodError) {
    return Response.json(createErrorResponse("INVALID_URL", "Enter a valid YouTube URL."), toResponseInit(400))
  }

  return Response.json(
    createErrorResponse("INTERNAL_ERROR", "Failed to start video summarization."),
    toResponseInit(500),
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await requireAuthenticatedUser(supabase)
    const availableCredits = await getAvailableCredits(supabase)

    if (availableCredits <= 0) {
      throw new AppError(
        "INSUFFICIENT_CREDITS",
        402,
        "У вас закончились кредиты. Войдите снова, чтобы получить временное пополнение.",
      )
    }

    const body = summarizeStartRequestSchema.parse(await request.json())
    const sourceUrl = normalizeYouTubeUrl(body.url)
    const transcriptResult = await startTranscript(sourceUrl)

    if (transcriptResult.kind === "processing") {
      const { appJobTokenSecret } = getServerEnv()
      const remainingCredits = await consumeCredit(supabase)
      const jobToken = signJobToken(
        {
          version: 1,
          jobId: transcriptResult.jobId,
          sourceUrl,
          userId: user.id,
          createdAt: new Date().toISOString(),
        },
        appJobTokenSecret,
      )

      return Response.json({
        status: "processing",
        jobToken,
        remainingCredits,
      })
    }

    const summary = await summarizeTranscriptInRussian(transcriptResult.content)
    const remainingCredits = await consumeCredit(supabase)

    return Response.json({
      status: "completed",
      summary,
      remainingCredits,
      meta: {
        source: "youtube",
        lang: transcriptResult.lang,
        availableLangs: transcriptResult.availableLangs,
      },
    })
  } catch (error) {
    return toRouteError(error)
  }
}
