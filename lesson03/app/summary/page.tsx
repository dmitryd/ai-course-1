"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildSummaryRequestKey, getOrCreateSummaryStartResponse } from "@/lib/summary-start-cache"
import type { SummarizeResponse } from "@/lib/summarize-schema"

type SummaryStatus = "starting" | "processing" | "completed" | "error"

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

function getResponseErrorMessage(data: SummarizeResponse | { error?: { message?: string } }, fallback: string) {
  if ("status" in data && data.status === "error") {
    return data.error.message || fallback
  }

  return fallback
}

function SummaryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoading: isAuthLoading, refreshAccount, syncCredits, user } = useAuth()
  const url = searchParams.get("url")
  const requestId = searchParams.get("requestId")

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

      const data = (await response.json()) as SummarizeResponse

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

      throw new Error(getResponseErrorMessage(data, "Не удалось подготовить краткое содержание видео."))
    }
  }

  async function startSummaryFlow(
    videoUrl: string,
    requestKey: string,
    signal: AbortSignal,
    isCancelled: () => boolean,
  ) {
    if (!isCancelled()) {
      setStatus("starting")
    }

    const data = await getOrCreateSummaryStartResponse(requestKey, async () => {
      const response = await fetch("/api/summarize/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      })

      return (await response.json()) as SummarizeResponse
    })

    if (signal.aborted || isCancelled()) {
      return
    }

    if (data.status === "completed") {
      if (typeof data.remainingCredits === "number") {
        syncCredits(data.remainingCredits)
      } else {
        await refreshAccount()
      }

      if (!isCancelled()) {
        setSummary(data.summary)
        setStatus("completed")
      }
      return
    }

    if (data.status === "processing" && data.jobToken) {
      if (typeof data.remainingCredits === "number") {
        syncCredits(data.remainingCredits)
      } else {
        await refreshAccount()
      }

      if (!isCancelled()) {
        setStatus("processing")
      }
      await pollSummaryStatus(data.jobToken, signal, isCancelled)
      return
    }

    throw new Error(getResponseErrorMessage(data, "Не удалось подготовить краткое содержание видео."))
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

    if (isAuthLoading) {
      return () => {
        cancelled = true
        abortController.abort()
      }
    }

    if (!user) {
      setError("Войдите в аккаунт, чтобы получать краткие содержания видео.")
      setStatus("error")
      return () => {
        cancelled = true
        abortController.abort()
      }
    }

    const decodedUrl = decodeURIComponent(url)
    const requestKey = buildSummaryRequestKey(requestId, decodedUrl)

    startSummaryFlow(decodedUrl, requestKey, abortController.signal, () => cancelled).catch((err: unknown) => {
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
  }, [isAuthLoading, refreshAccount, requestId, router, syncCredits, url, user])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,248,241,0.96)_0%,rgba(255,255,255,1)_45%,rgba(244,247,251,1)_100%)] pb-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-[320px] bg-[radial-gradient(circle_at_top,rgba(244,102,58,0.16),transparent_58%)]" />
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <Card className="border-white/60 bg-white/85 shadow-lg backdrop-blur">
          <CardHeader className="gap-4">
            <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              Обработка видео
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl">Готовим краткое содержание выбранного ролика</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            {error ? (
              <div className="flex flex-col gap-4">
                <p className="text-base leading-7 text-destructive">{error}</p>
                <Button onClick={() => router.push("/")} variant="outline" className="w-full sm:w-fit">
                  Вернуться на главную
                </Button>
              </div>
            ) : status !== "completed" ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-background/70 px-6 py-12 text-center">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    {status === "starting" ? "Запрашиваем расшифровку видео..." : "Видео обрабатывается. Это может занять до минуты."}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Кредит списывается для этого видео во время запуска обработки и баланс сразу обновляется в шапке.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-border/70 bg-background/75 p-6 text-base leading-8 whitespace-pre-wrap text-foreground">
                  {summary}
                </div>
                <Button onClick={() => router.push("/")} variant="outline" className="w-full sm:w-fit">
                  Сделать краткое содержание другого видео
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background">
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </main>
      }
    >
      <SummaryContent />
    </Suspense>
  )
}
