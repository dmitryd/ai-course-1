"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { credits, isLoading: isAuthLoading, user } = useAuth()

  const isAuthenticated = Boolean(user)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!url.trim() || !isAuthenticated) {
      return
    }

    setIsLoading(true)
    const encodedUrl = encodeURIComponent(url)
    const requestId = encodeURIComponent(crypto.randomUUID())
    router.push(`/summary?url=${encodedUrl}&requestId=${requestId}`)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,248,241,0.96)_0%,rgba(255,255,255,1)_42%,rgba(244,247,251,1)_100%)] pb-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top,rgba(244,102,58,0.18),transparent_58%)]" />
      <SiteHeader />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pt-10">
        <Card className="border-white/60 bg-white/75 shadow-sm backdrop-blur">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              AI-разбор YouTube по ссылке
            </Badge>
            <div className="space-y-3">
              <CardTitle className="text-3xl leading-tight sm:text-4xl">
                Краткое содержание видео без просмотра всего ролика
              </CardTitle>
              <CardDescription className="max-w-xl text-base leading-7 text-muted-foreground">
                Вставьте ссылку на YouTube, а приложение получит расшифровку через Supadata, соберет итог через Gemini и покажет результат на русском языке.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              Регистрация занимает одну форму: только email и пароль.
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              После первой регистрации аккаунт получает 5 стартовых кредитов.
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              Пока что повторный вход пополняет баланс, если кредиты закончились.
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/85 shadow-lg backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Новая сводка</CardTitle>
            <CardDescription className="text-sm leading-6">
              {isAuthenticated
                ? `Сейчас доступно ${credits ?? 0} кредит${credits === 1 ? "" : credits && credits < 5 ? "а" : "ов"}.`
                : "Сначала войдите или зарегистрируйтесь, чтобы использовать кредиты и получать сводки."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="h-12 text-base"
                disabled={!isAuthenticated || isAuthLoading || isLoading}
                required
              />
              <Button
                type="submit"
                className="h-12 text-base"
                disabled={!isAuthenticated || isAuthLoading || isLoading || !url.trim()}
              >
                {isLoading ? "Переходим к обработке..." : "Сделать краткое содержание"}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Кнопки регистрации и входа доступны в верхней панели. После входа баланс кредитов появится рядом с email.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
