import type { SummarizeResponse } from "@/lib/summarize-schema"

const startRequestPromises = new Map<string, Promise<SummarizeResponse>>()
const startRequestResponses = new Map<string, SummarizeResponse>()

export function buildSummaryRequestKey(requestId: string | null, videoUrl: string) {
  return requestId ? `request:${requestId}` : `url:${videoUrl}`
}

export async function getOrCreateSummaryStartResponse(
  requestKey: string,
  loader: () => Promise<SummarizeResponse>,
) {
  const cachedResponse = startRequestResponses.get(requestKey)

  if (cachedResponse) {
    return cachedResponse
  }

  const inFlightRequest = startRequestPromises.get(requestKey)

  if (inFlightRequest) {
    return inFlightRequest
  }

  const requestPromise = loader()
    .then((response) => {
      startRequestResponses.set(requestKey, response)
      return response
    })
    .finally(() => {
      startRequestPromises.delete(requestKey)
    })

  startRequestPromises.set(requestKey, requestPromise)

  return requestPromise
}

export function clearSummaryStartResponseCache() {
  startRequestPromises.clear()
  startRequestResponses.clear()
}
