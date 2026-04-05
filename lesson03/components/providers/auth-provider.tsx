"use client"

import type { Session, User } from "@supabase/supabase-js"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { accountResponseSchema } from "@/lib/auth-schema"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type AuthContextValue = {
  user: User | null
  session: Session | null
  credits: number | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAccount: () => Promise<void>
  syncCredits: (credits: number) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = payload.error
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
      return error.message
    }
  }

  return fallback
}

function mapSupabaseAuthError(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Неверный email или пароль."
  }

  if (message.toLowerCase().includes("user already registered")) {
    return "Пользователь с таким email уже зарегистрирован."
  }

  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAccount = useCallback(async (input: string, init?: RequestInit) => {
    const response = await fetch(input, {
      ...init,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    })

    const payload = (await response.json()) as unknown

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "Не удалось загрузить данные аккаунта."))
    }

    const account = accountResponseSchema.parse(payload)
    setCredits(account.credits)
  }, [])

  const refreshAccount = useCallback(async () => {
    await fetchAccount("/api/account")
  }, [fetchAccount])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!isMounted) {
        return
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        try {
          await refreshAccount()
        } catch {
          if (isMounted) {
            setCredits(null)
          }
        }
      } else {
        setCredits(null)
      }

      if (isMounted) {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (!nextSession) {
        setCredits(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [refreshAccount, supabase])

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        throw new Error(mapSupabaseAuthError(error.message))
      }

      if (!data.session || !data.user) {
        throw new Error("Отключите подтверждение email в Supabase, чтобы вход после регистрации работал сразу.")
      }

      setSession(data.session)
      setUser(data.user)
      await refreshAccount()
    },
    [refreshAccount, supabase.auth],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        throw new Error(mapSupabaseAuthError(error.message))
      }

      setSession(data.session)
      setUser(data.user)
      await fetchAccount("/api/auth/login-bootstrap", { method: "POST" })
    },
    [fetchAccount, supabase.auth],
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(mapSupabaseAuthError(error.message))
    }

    setSession(null)
    setUser(null)
    setCredits(null)
  }, [supabase.auth])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      credits,
      isLoading,
      signIn,
      signUp,
      signOut,
      refreshAccount,
      syncCredits: setCredits,
    }),
    [credits, isLoading, refreshAccount, session, signIn, signOut, signUp, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
