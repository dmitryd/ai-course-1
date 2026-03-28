"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"

type SummaryStatus = "starting" | "processing" | "completed" | "error"

type SummaryApiResponse =
  | {
      status: "processing"
      jobToken?: string
    }
  | {
      status: "completed"
      summary: string
    }
  | {
      status: "error"
      error: {
        message: string
      }
    }

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)

    function onAbort() {
      window.clearTimeout(timeoutId)
      signal.removeEventListener("abort", onAbort)
      reject(new DOMException("The operation was aborted.", "AbortError"))
    }

    if (signal.aborted) {
      onAbort()
      return
    }

    signal.addEventListener("abort", onAbort)
  })
}

function SummaryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const url = searchParams.get("url")
  
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<SummaryStatus>("starting")
  const [error, setError] = useState("")

  async function pollSummaryStatus(jobToken: string, signal: AbortSignal, isCancelled: () => boolean) {
    while (true) {
      await sleep(1000, signal)

      if (signal.aborted || isCancelled()) {
        return
      }

      const response = await fetch("/api/summarize/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobToken }),
        signal,
      })

      if (signal.aborted || isCancelled()) {
        return
      }

      const data = (await response.json()) as SummaryApiResponse

      if (data.status === "processing") {
        if (!isCancelled()) {
          setStatus("processing")
        }
        continue
      }

      if (data.status === "completed") {
        if (!isCancelled()) {
          setSummary(data.summary)
          setStatus("completed")
        }
        return
      }

      throw new Error(data.error.message || "Не удалось подготовить краткое содержание видео")
    }
  }

  async function startSummaryFlow(videoUrl: string, signal: AbortSignal, isCancelled: () => boolean) {
    if (!isCancelled()) {
      setStatus("starting")
    }

    const response = await fetch("/api/summarize/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl }),
      signal,
    })

    if (signal.aborted || isCancelled()) {
      return
    }

    const data = (await response.json()) as SummaryApiResponse

    if (data.status === "completed") {
      if (!isCancelled()) {
        setSummary(data.summary)
        setStatus("completed")
      }
      return
    }

    if (data.status === "processing" && data.jobToken) {
      if (!isCancelled()) {
        setStatus("processing")
      }
      await pollSummaryStatus(data.jobToken, signal, isCancelled)
      return
    }

    throw new Error(data.status === "error" ? data.error.message : "Не удалось подготовить краткое содержание видео")
  }

  useEffect(() => {
    const abortController = new AbortController()
    let cancelled = false

    if (!url) {
      router.push("/")
      return () => {
        cancelled = true
        abortController.abort()
      }
    }

    startSummaryFlow(decodeURIComponent(url), abortController.signal, () => cancelled).catch((err: unknown) => {
      if (cancelled || isAbortError(err)) {
        return
      }

      setError(err instanceof Error ? err.message : "Что-то пошло не так")
      setStatus("error")
    })

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [url, router])

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
        <p className="text-destructive text-center">{error}</p>
        <Button onClick={() => router.push("/")} variant="outline">
          Попробовать другое видео
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        {status !== "completed" ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">
              {status === "starting"
                ? "Запрашиваем расшифровку видео..."
                : "Видео обрабатывается. Это может занять до минуты..."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
            <Button 
              onClick={() => router.push("/")} 
              variant="outline"
              className="self-start"
            >
              Сделать краткое содержание другого видео
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

export default function SummaryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <SummaryContent />
    </Suspense>
  )
}
