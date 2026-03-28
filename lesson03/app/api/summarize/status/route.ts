import { ZodError } from "zod"

import { AppError, createErrorResponse, toResponseInit } from "@/lib/errors"
import { getServerEnv } from "@/lib/env"
import { summarizeTranscriptInRussian } from "@/lib/gemini"
import { verifyJobToken } from "@/lib/job-token"
import { summarizeStatusRequestSchema } from "@/lib/summarize-schema"
import { getTranscriptJob } from "@/lib/supadata"

const SUPADATA_JOB_TTL_MS = 60 * 60 * 1000

function toRouteError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(createErrorResponse(error.code, error.message), toResponseInit(error.status))
  }

  if (error instanceof ZodError) {
    return Response.json(createErrorResponse("INVALID_JOB_TOKEN", "The processing token is invalid."), toResponseInit(400))
  }

  return Response.json(
    createErrorResponse("INTERNAL_ERROR", "Failed to check video processing status."),
    toResponseInit(500),
  )
}

export async function POST(request: Request) {
  try {
    const body = summarizeStatusRequestSchema.parse(await request.json())
    const { appJobTokenSecret } = getServerEnv()
    const payload = verifyJobToken(body.jobToken, appJobTokenSecret)
    const createdAt = new Date(payload.createdAt).getTime()

    if (!Number.isFinite(createdAt) || Date.now() - createdAt > SUPADATA_JOB_TTL_MS) {
      throw new AppError("INVALID_JOB_TOKEN", 400, "The processing token is invalid or expired.")
    }

    const transcriptResult = await getTranscriptJob(payload.jobId)
    if (transcriptResult.kind === "processing") {
      return Response.json({
        status: "processing",
      })
    }

    const summary = await summarizeTranscriptInRussian(transcriptResult.content)

    return Response.json({
      status: "completed",
      summary,
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
