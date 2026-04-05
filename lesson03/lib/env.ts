import { AppError } from "@/lib/errors"

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new AppError("CONFIGURATION_MISSING", 500, `Missing required environment variable: ${name}`)
  }

  return value
}

export function getServerEnv() {
  return {
    supadataApiKey: readRequiredEnv("SUPADATA_API_KEY"),
    geminiApiKey: readRequiredEnv("GEMINI_API_KEY"),
    appJobTokenSecret: readRequiredEnv("APP_JOB_TOKEN_SECRET"),
    supabaseUrl: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  }
}

export function getPublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}
