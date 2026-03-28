import { AppError } from "@/lib/errors"
import { getServerEnv } from "@/lib/env"

export type SupadataCompletedTranscript = {
  kind: "completed"
  content: string
  lang?: string
  availableLangs?: string[]
}

export type SupadataProcessingTranscript = {
  kind: "processing"
  jobId: string
}

export type SupadataTranscriptResult = SupadataCompletedTranscript | SupadataProcessingTranscript

type SupadataTranscriptPayload = {
  content?: string
  lang?: string
  availableLangs?: string[]
  jobId?: string
  status?: string
  error?: string
}

function mapSupadataError(status: number) {
  if (status === 403 || status === 404) {
    return new AppError("VIDEO_INACCESSIBLE", 400, "The video is unavailable or cannot be accessed publicly.")
  }

  if (status === 206) {
    return new AppError("TRANSCRIPT_UNAVAILABLE", 400, "Transcript is unavailable for this video.")
  }

  return new AppError("SUPADATA_FAILED", 502, "Failed to fetch transcript from Supadata.")
}

function getTranscriptUrl(sourceUrl: string) {
  const endpoint = new URL("https://api.supadata.ai/v1/transcript")
  endpoint.searchParams.set("url", sourceUrl)
  endpoint.searchParams.set("text", "true")
  endpoint.searchParams.set("mode", "auto")

  return endpoint
}

export async function startTranscript(sourceUrl: string): Promise<SupadataTranscriptResult> {
  const { supadataApiKey } = getServerEnv()

  const response = await fetch(getTranscriptUrl(sourceUrl), {
    headers: {
      "x-api-key": supadataApiKey,
    },
    cache: "no-store",
  })

  if (response.status === 202) {
    const data = (await response.json()) as SupadataTranscriptPayload

    if (!data.jobId) {
      throw new AppError("SUPADATA_FAILED", 502, "Supadata did not return a job ID.")
    }

    return {
      kind: "processing",
      jobId: data.jobId,
    }
  }

  if (!response.ok) {
    throw mapSupadataError(response.status)
  }

  const data = (await response.json()) as SupadataTranscriptPayload
  if (!data.content?.trim()) {
    throw new AppError("TRANSCRIPT_UNAVAILABLE", 400, "Transcript is unavailable for this video.")
  }

  return {
    kind: "completed",
    content: data.content,
    lang: data.lang,
    availableLangs: data.availableLangs,
  }
}

export async function getTranscriptJob(jobId: string): Promise<SupadataTranscriptResult> {
  const { supadataApiKey } = getServerEnv()

  const response = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
    headers: {
      "x-api-key": supadataApiKey,
    },
    cache: "no-store",
  })

  if (response.status === 404) {
    throw new AppError("INVALID_JOB_TOKEN", 400, "The processing token is invalid or expired.")
  }

  if (!response.ok) {
    throw mapSupadataError(response.status)
  }

  const data = (await response.json()) as SupadataTranscriptPayload

  if (data.status === "queued" || data.status === "active") {
    return {
      kind: "processing",
      jobId,
    }
  }

  if (data.status === "failed") {
    throw new AppError("SUPADATA_FAILED", 502, data.error || "Supadata failed to prepare the transcript.")
  }

  if (!data.content?.trim()) {
    throw new AppError("TRANSCRIPT_UNAVAILABLE", 400, "Transcript is unavailable for this video.")
  }

  return {
    kind: "completed",
    content: data.content,
    lang: data.lang,
    availableLangs: data.availableLangs,
  }
}
