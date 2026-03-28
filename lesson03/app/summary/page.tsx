"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"

function SummaryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const url = searchParams.get("url")
  
  const [summary, setSummary] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!url) {
      router.push("/")
      return
    }

    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: decodeURIComponent(url) }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to summarize video")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error("No response body")

        let fullText = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setSummary(fullText)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummary()
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
        {isLoading && !summary ? (
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
