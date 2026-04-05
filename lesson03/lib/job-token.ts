import { createHmac, timingSafeEqual } from "node:crypto"

import { AppError } from "@/lib/errors"

export type JobTokenPayload = {
  version: 1
  jobId: string
  sourceUrl: string
  userId: string
  createdAt: string
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

export function signJobToken(payload: JobTokenPayload, secret: string) {
  const body = toBase64Url(JSON.stringify(payload))
  const signature = createHmac("sha256", secret).update(body).digest("base64url")

  return `${body}.${signature}`
}

export function verifyJobToken(token: string, secret: string): JobTokenPayload {
  const [body, signature] = token.split(".")

  if (!body || !signature) {
    throw new AppError("INVALID_JOB_TOKEN", 400, "The processing token is invalid.")
  }

  const expectedSignature = createHmac("sha256", secret).update(body).digest("base64url")

  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new AppError("INVALID_JOB_TOKEN", 400, "The processing token is invalid.")
  }

  try {
    return JSON.parse(fromBase64Url(body)) as JobTokenPayload
  } catch {
    throw new AppError("INVALID_JOB_TOKEN", 400, "The processing token is invalid.")
  }
}
