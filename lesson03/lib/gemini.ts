import { AppError } from "@/lib/errors"
import { getServerEnv } from "@/lib/env"

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
const MAX_TRANSCRIPT_CHARS = 30000
const SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000

type SummaryCacheEntry = {
  expiresAt: number
  promise: Promise<string>
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

const summaryCache = new Map<string, SummaryCacheEntry>()

function pruneSummaryCache(now: number) {
  for (const [key, entry] of summaryCache.entries()) {
    if (entry.expiresAt <= now) {
      summaryCache.delete(key)
    }
  }
}

function buildPrompt(transcript: string) {
  return [
    "Сделай краткое, понятное и полезное резюме этого видео на русском языке.",
    "Если текст расшифровки шумный, выдели только главные идеи.",
    "Структура ответа:",
    "1. Короткое описание",
    "2. Основные идеи",
    "3. Главные выводы",
    "Не выдумывай факты, которых нет в расшифровке.",
    "Расшифровка:",
    transcript.slice(0, MAX_TRANSCRIPT_CHARS),
  ].join("\n\n")
}

export async function summarizeTranscriptInRussian(transcript: string) {
  if (!transcript.trim()) {
    throw new AppError("TRANSCRIPT_UNAVAILABLE", 400, "Transcript is unavailable for this video.")
  }

  const { geminiApiKey } = getServerEnv()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(transcript) }],
          },
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new AppError("SUMMARIZATION_FAILED", 502, "Gemini failed to generate the summary.")
  }

  const data = (await response.json()) as GeminiResponse
  const summary = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim()

  if (!summary) {
    throw new AppError("SUMMARIZATION_FAILED", 502, "Gemini returned an empty summary.")
  }

  return summary
}

export async function summarizeTranscriptInRussianCached(transcript: string, cacheKey: string) {
  const now = Date.now()
  pruneSummaryCache(now)

  const cachedEntry = summaryCache.get(cacheKey)
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.promise
  }

  const promise = summarizeTranscriptInRussian(transcript).catch((error) => {
    summaryCache.delete(cacheKey)
    throw error
  })

  summaryCache.set(cacheKey, {
    expiresAt: now + SUMMARY_CACHE_TTL_MS,
    promise,
  })

  return promise
}
