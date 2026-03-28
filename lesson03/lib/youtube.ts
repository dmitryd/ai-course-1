import { AppError } from "@/lib/errors"

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
])

function getNormalizedWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function normalizeYouTubeUrl(rawUrl: string): string {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new AppError("INVALID_URL", 400, "Enter a valid YouTube URL.")
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new AppError("INVALID_URL", 400, "Only YouTube video URLs are supported.")
  }

  if (url.hostname === "youtu.be") {
    const id = url.pathname.replace(/^\//, "")

    if (!id) {
      throw new AppError("INVALID_URL", 400, "Missing YouTube video ID.")
    }

    return getNormalizedWatchUrl(id)
  }

  const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/)
  if (shortsMatch) {
    return getNormalizedWatchUrl(shortsMatch[1])
  }

  const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/)
  if (embedMatch) {
    return getNormalizedWatchUrl(embedMatch[1])
  }

  const videoId = url.searchParams.get("v")
  if (!videoId) {
    throw new AppError("INVALID_URL", 400, "Missing YouTube video ID.")
  }

  return getNormalizedWatchUrl(videoId)
}
