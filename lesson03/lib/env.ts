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
  }
}
