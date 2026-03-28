import type { SummarizeErrorResponse } from "@/lib/summarize-schema"

export type ApiErrorCode =
  | "MISSING_URL"
  | "INVALID_URL"
  | "CONFIGURATION_MISSING"
  | "VIDEO_INACCESSIBLE"
  | "TRANSCRIPT_UNAVAILABLE"
  | "SUPADATA_FAILED"
  | "SUMMARIZATION_FAILED"
  | "INVALID_JOB_TOKEN"
  | "INTERNAL_ERROR"

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function createErrorResponse(code: ApiErrorCode, message: string): SummarizeErrorResponse {
  return {
    status: "error",
    error: {
      code,
      message,
    },
  }
}

export function toResponseInit(status: number): ResponseInit {
  return { status }
}
