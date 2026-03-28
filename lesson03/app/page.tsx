"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    
    setIsLoading(true)
    const encodedUrl = encodeURIComponent(url)
    router.push(`/summary?url=${encodedUrl}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
        <Input
          type="url"
          placeholder="Вставьте ссылку на видео YouTube"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 text-base"
          required
        />
        <Button 
          type="submit" 
          className="h-12 text-base"
          disabled={isLoading || !url.trim()}
        >
          {isLoading ? "Загрузка..." : "Сделать краткое содержание"}
        </Button>
      </form>
    </main>
  )
}
