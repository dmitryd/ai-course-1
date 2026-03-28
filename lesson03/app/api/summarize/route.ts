import { streamText } from "ai"

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function getTranscript(videoId: string): Promise<string> {
  // Fetch the video page to get captions
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`)
  const html = await response.text()
  
  // Extract caption tracks from the page
  const captionRegex = /"captions":\s*(\{[^}]+\})/
  const playerRegex = /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s
  
  const playerMatch = html.match(playerRegex)
  if (!playerMatch) {
    throw new Error("Could not find video data. The video might be unavailable.")
  }
  
  try {
    const playerData = JSON.parse(playerMatch[1])
    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No captions available for this video.")
    }
    
    // Prefer English captions, fall back to first available
    const englishTrack = captionTracks.find((track: { languageCode: string }) => 
      track.languageCode === "en" || track.languageCode.startsWith("en-")
    )
    const track = englishTrack || captionTracks[0]
    
    // Fetch the caption file
    const captionResponse = await fetch(track.baseUrl)
    const captionXml = await captionResponse.text()
    
    // Parse the XML to extract text
    const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)
    const texts: string[] = []
    
    for (const match of textMatches) {
      const text = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim()
      if (text) texts.push(text)
    }
    
    return texts.join(" ")
  } catch {
    throw new Error("Could not extract captions from this video.")
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 })
    }
    
    const videoId = extractVideoId(url)
    if (!videoId) {
      return Response.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }
    
    const transcript = await getTranscript(videoId)
    
    if (!transcript || transcript.length < 50) {
      return Response.json({ error: "Could not extract enough content from this video." }, { status: 400 })
    }
    
    const result = streamText({
      model: "openai/gpt-4o-mini",
      system: "You are a concise video summarizer. Provide a clear, well-structured summary of the video content. Focus on the main points and key takeaways. Keep the summary informative but brief.",
      prompt: `Summarize this video transcript:\n\n${transcript.slice(0, 15000)}`,
    })
    
    return result.toTextStreamResponse()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process video"
    return Response.json({ error: message }, { status: 500 })
  }
}
