"use client"

import { useState } from "react"

import { AuthActions } from "@/components/auth/auth-actions"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AuthStatus() {
  const { credits, isLoading, signOut, user } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
        Проверяем сессию...
      </div>
    )
  }

  if (!user) {
    return <AuthActions />
  }

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/50 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="text-sm font-medium text-foreground">{user.email}</span>
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
          Доступно кредитов: {credits ?? 0}
        </Badge>
      </div>
      <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? "Выходим..." : "Выйти"}
      </Button>
    </div>
  )
}
