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

function SummaryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const url = searchParams.get("url")
  
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<SummaryStatus>("starting")
  const [error, setError] = useState("")

  async function pollSummaryStatus(jobToken: string) {
    while (true) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000))

      const response = await fetch("/api/summarize/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobToken }),
      })

      const data = (await response.json()) as SummaryApiResponse

      if (data.status === "processing") {
        setStatus("processing")
        continue
      }

      if (data.status === "completed") {
        setSummary(data.summary)
        setStatus("completed")
        return
      }

      throw new Error(data.error.message || "Failed to summarize video")
    }
  }

  async function startSummaryFlow(videoUrl: string) {
    setStatus("starting")

    const response = await fetch("/api/summarize/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl }),
    })

    const data = (await response.json()) as SummaryApiResponse

    if (data.status === "completed") {
      setSummary(data.summary)
      setStatus("completed")
      return
    }

    if (data.status === "processing" && data.jobToken) {
      setStatus("processing")
      await pollSummaryStatus(data.jobToken)
      return
    }

    throw new Error(data.status === "error" ? data.error.message : "Failed to summarize video")
  }

  useEffect(() => {
    if (!url) {
      router.push("/")
      return
    }

    startSummaryFlow(decodeURIComponent(url)).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setStatus("error")
    })
  }, [url, router])

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
        <p className="text-destructive text-center">{error}</p>
        <Button onClick={() => router.push("/")} variant="outline">
          Try another video
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
              Summarize another video
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
