"use client"

import { useState } from "react"

import type { AuthCredentials } from "@/lib/auth-schema"
import { authCredentialsSchema } from "@/lib/auth-schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthFormProps = {
  mode: "signin" | "signup"
  submitLabel: string
  description: string
  onSubmit: (credentials: AuthCredentials) => Promise<void>
}

export function AuthForm({ mode, submitLabel, description, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formId = `auth-form-${mode}`

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = authCredentialsSchema.safeParse({ email, password })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте корректность введенных данных.")
      return
    }

    setError("")
    setIsSubmitting(true)

    try {
      await onSubmit(parsed.data)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Не удалось выполнить запрос.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-email`}>Email</Label>
        <Input
          id={`${formId}-email`}
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-password`}>Пароль</Label>
        <Input
          id={`${formId}-password`}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="Минимум 6 символов"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11" disabled={isSubmitting}>
        {isSubmitting ? "Подождите..." : submitLabel}
      </Button>
    </form>
  )
}
