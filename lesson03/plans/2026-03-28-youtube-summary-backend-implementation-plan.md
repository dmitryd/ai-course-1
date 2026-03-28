# YouTube Summary Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current caption-scraping summary backend with a Supadata plus Gemini backend that returns Russian summaries, supports asynchronous transcript jobs through frontend polling, and works locally with [`.env.local`](.env.local) plus on Vercel with server-side environment variables.

**Architecture:** Keep the system inside Next.js route handlers under the `/api/summarize` family. The frontend starts a summary job, receives either an immediate completion or a signed job token, and polls a status route until Supadata is ready and Gemini returns the final Russian summary.

**Tech Stack:** Next.js App Router, TypeScript, built-in `fetch`, Supadata Transcript API, Gemini Generative Language API, Zod, local [`.env.local`](.env.local), Vercel project environment variables.

---

## File Structure

### Existing files to modify

- Modify [`package.json:5`](package.json#L5) to add any missing server-side dependency needed for validation or token signing only if Node built-ins are insufficient.
- Modify [`app/page.tsx:1`](app/page.tsx#L1) only if a small UX note is needed before navigation.
- Modify [`app/summary/page.tsx:1`](app/summary/page.tsx#L1) to replace the current streaming-reader flow with a start-plus-poll state machine.
- Replace or remove [`app/api/summarize/route.ts:1`](app/api/summarize/route.ts#L1) because it currently scrapes YouTube captions and uses the wrong model flow.

### New files to create

- Create [`app/api/summarize/start/route.ts`](app/api/summarize/start/route.ts) for starting the workflow.
- Create [`app/api/summarize/status/route.ts`](app/api/summarize/status/route.ts) for polling job state.
- Create [`lib/env.ts`](lib/env.ts) for strict environment access.
- Create [`lib/youtube.ts`](lib/youtube.ts) for URL validation and normalization.
- Create [`lib/summarize-schema.ts`](lib/summarize-schema.ts) for request and response schemas.
- Create [`lib/supadata.ts`](lib/supadata.ts) for transcript fetch and Supadata job polling.
- Create [`lib/gemini.ts`](lib/gemini.ts) for Russian summary generation.
- Create [`lib/job-token.ts`](lib/job-token.ts) for signed stateless job tokens.
- Create [`lib/errors.ts`](lib/errors.ts) for normalized API errors.
- Create [`.env.example`](.env.example) with placeholder keys only.
- Create [`README.md`](README.md) or update it if present with local setup, Vercel variable setup, and test instructions.

### Testing targets

- Manual test through [`app/page.tsx`](app/page.tsx) and [`app/summary/page.tsx`](app/summary/page.tsx).
- Optional unit tests in [`lib/`](lib) if a test runner is introduced during implementation.

## Task 1: Remove the old backend contract and define the new API schema

**Files:**
- Create: [`lib/summarize-schema.ts`](lib/summarize-schema.ts)
- Create: [`lib/errors.ts`](lib/errors.ts)
- Modify: [`app/api/summarize/route.ts:1-100`](app/api/summarize/route.ts#L1)

- [ ] **Step 1: Write the shared request and response schema file**

```ts
import { z } from "zod"

export const summarizeStartRequestSchema = z.object({
  url: z.string().url(),
})

export const summarizeStatusRequestSchema = z.object({
  jobToken: z.string().min(1),
})

export const summarizeMetaSchema = z.object({
  source: z.literal("youtube"),
  lang: z.string().optional(),
  availableLangs: z.array(z.string()).optional(),
})

export const summarizeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
})

export const summarizeResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("processing"),
    jobToken: z.string().optional(),
  }),
  z.object({
    status: z.literal("completed"),
    summary: z.string(),
    meta: summarizeMetaSchema.optional(),
  }),
  z.object({
    status: z.literal("error"),
    error: summarizeErrorSchema,
  }),
])

export type SummarizeStartRequest = z.infer<typeof summarizeStartRequestSchema>
export type SummarizeStatusRequest = z.infer<typeof summarizeStatusRequestSchema>
export type SummarizeResponse = z.infer<typeof summarizeResponseSchema>
export type SummarizeMeta = z.infer<typeof summarizeMetaSchema>
```

- [ ] **Step 2: Write the normalized error helper**

```ts
export type ApiErrorCode =
  | "MISSING_URL"
  | "INVALID_URL"
  | "CONFIGURATION_MISSING"
  | "VIDEO_INACCESSIBLE"
  | "TRANSCRIPT_UNAVAILABLE"
  | "SUPADATA_FAILED"
  | "SUMMARIZATION_FAILED"
  | "INVALID_JOB_TOKEN"
  | "INTERNAL_ERROR"

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

export function toErrorResponse(code: ApiErrorCode, message: string) {
  return {
    status: "error" as const,
    error: { code, message },
  }
}
```

- [ ] **Step 3: Remove the old route so the implementation cannot accidentally keep using it**

Use this replacement stub in [`app/api/summarize/route.ts`](app/api/summarize/route.ts):

```ts
export async function POST() {
  return Response.json(
    {
      status: "error",
      error: {
        code: "INTERNAL_ERROR",
        message: "Use /api/summarize/start instead.",
      },
    },
    { status: 410 },
  )
}
```

- [ ] **Step 4: Verify TypeScript can import the new shared contracts**

Run: `npm run lint`

Expected: lint reaches the new files with no syntax error.

- [ ] **Step 5: Commit**

```bash
git add lib/summarize-schema.ts lib/errors.ts app/api/summarize/route.ts
git commit -m "refactor: define summary api contract"
```

## Task 2: Add environment access, YouTube validation, and signed job tokens

**Files:**
- Create: [`lib/env.ts`](lib/env.ts)
- Create: [`lib/youtube.ts`](lib/youtube.ts)
- Create: [`lib/job-token.ts`](lib/job-token.ts)

- [ ] **Step 1: Write the environment helper**

```ts
function readRequiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
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
```

- [ ] **Step 2: Write the YouTube URL normalization helper**

```ts
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
])

export function normalizeYouTubeUrl(rawUrl: string): string {
  const url = new URL(rawUrl)

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new Error("Only YouTube URLs are supported")
  }

  if (url.hostname === "youtu.be") {
    const id = url.pathname.replace(/^\//, "")
    if (!id) throw new Error("Missing YouTube video id")
    return `https://www.youtube.com/watch?v=${id}`
  }

  const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/)
  if (shortsMatch) {
    return `https://www.youtube.com/watch?v=${shortsMatch[1]}`
  }

  const id = url.searchParams.get("v")
  if (!id) throw new Error("Missing YouTube video id")

  return `https://www.youtube.com/watch?v=${id}`
}
```

- [ ] **Step 3: Write the stateless job token helper using Node crypto**

```ts
import { createHmac, timingSafeEqual } from "node:crypto"

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

export type JobTokenPayload = {
  version: 1
  jobId: string
  sourceUrl: string
  createdAt: string
}

export function signJobToken(payload: JobTokenPayload, secret: string) {
  const body = toBase64Url(JSON.stringify(payload))
  const signature = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${signature}`
}

export function verifyJobToken(token: string, secret: string): JobTokenPayload {
  const [body, signature] = token.split(".")
  if (!body || !signature) throw new Error("Malformed job token")

  const expected = createHmac("sha256", secret).update(body).digest("base64url")
  const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!valid) throw new Error("Invalid job token signature")

  return JSON.parse(fromBase64Url(body)) as JobTokenPayload
}
```

- [ ] **Step 4: Create local env template**

Create [`.env.example`](.env.example) with:

```dotenv
SUPADATA_API_KEY=your_supadata_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
APP_JOB_TOKEN_SECRET=replace_with_a_long_random_secret
```

- [ ] **Step 5: Verify token helper and environment helper compile**

Run: `npm run lint`

Expected: no import or Node API errors.

- [ ] **Step 6: Commit**

```bash
git add lib/env.ts lib/youtube.ts lib/job-token.ts .env.example
git commit -m "feat: add environment and job token utilities"
```

## Task 3: Implement Supadata and Gemini service adapters

**Files:**
- Create: [`lib/supadata.ts`](lib/supadata.ts)
- Create: [`lib/gemini.ts`](lib/gemini.ts)
- Modify: [`package.json:11-72`](package.json#L11)

- [ ] **Step 1: Add a Supadata adapter that handles immediate and async responses**

```ts
import { getServerEnv } from "@/lib/env"

export type SupadataImmediateResult = {
  kind: "completed"
  content: string
  lang?: string
  availableLangs?: string[]
}

export type SupadataPendingResult = {
  kind: "processing"
  jobId: string
}

export async function startTranscript(url: string): Promise<SupadataImmediateResult | SupadataPendingResult> {
  const { supadataApiKey } = getServerEnv()
  const endpoint = new URL("https://api.supadata.ai/v1/transcript")
  endpoint.searchParams.set("url", url)
  endpoint.searchParams.set("text", "true")
  endpoint.searchParams.set("mode", "auto")

  const response = await fetch(endpoint, {
    headers: {
      "x-api-key": supadataApiKey,
    },
  })

  if (response.status === 202) {
    const data = await response.json()
    return { kind: "processing", jobId: data.jobId }
  }

  if (!response.ok) {
    throw new Error(`Supadata transcript request failed with status ${response.status}`)
  }

  const data = await response.json()
  return {
    kind: "completed",
    content: data.content,
    lang: data.lang,
    availableLangs: data.availableLangs,
  }
}

export async function getTranscriptJob(jobId: string): Promise<SupadataImmediateResult | SupadataPendingResult> {
  const { supadataApiKey } = getServerEnv()
  const response = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
    headers: {
      "x-api-key": supadataApiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Supadata job polling failed with status ${response.status}`)
  }

  const data = await response.json()

  if (data.status === "queued" || data.status === "active") {
    return { kind: "processing", jobId }
  }

  if (data.status === "failed") {
    throw new Error(data.error ?? "Supadata job failed")
  }

  return {
    kind: "completed",
    content: data.content,
    lang: data.lang,
    availableLangs: data.availableLangs,
  }
}
```

- [ ] **Step 2: Add a transcript-to-Russian-summary Gemini adapter**

```ts
import { getServerEnv } from "@/lib/env"

const GEMINI_MODEL = "gemini-2.5-flash"

function buildPrompt(transcript: string) {
  return [
    "Сделай краткое, понятное и полезное резюме этого видео на русском языке.",
    "Структура ответа:",
    "1. Короткое описание",
    "2. Основные идеи",
    "3. Главные выводы",
    "Не выдумывай факты, которых нет в расшифровке.",
    "Текст расшифровки:",
    transcript,
  ].join("\n\n")
}

export async function summarizeTranscriptInRussian(transcript: string) {
  const { geminiApiKey } = getServerEnv()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(transcript.slice(0, 30000)) }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n").trim()

  if (!text) {
    throw new Error("Gemini returned an empty summary")
  }

  return text
}
```

- [ ] **Step 3: Decide dependency policy before editing [`package.json`](package.json)**

If the implementation uses only built-in `fetch`, `URL`, `crypto`, and existing [`zod`](package.json#L61), keep dependencies unchanged.

If a new dependency is truly necessary, add only that exact package and document why.

- [ ] **Step 4: Verify service adapters compile**

Run: `npm run lint`

Expected: new adapters compile and no missing imports remain.

- [ ] **Step 5: Commit**

```bash
git add lib/supadata.ts lib/gemini.ts package.json
git commit -m "feat: add supadata and gemini service adapters"
```

## Task 4: Implement the start and status route handlers

**Files:**
- Create: [`app/api/summarize/start/route.ts`](app/api/summarize/start/route.ts)
- Create: [`app/api/summarize/status/route.ts`](app/api/summarize/status/route.ts)
- Use: [`lib/errors.ts`](lib/errors.ts)
- Use: [`lib/env.ts`](lib/env.ts)
- Use: [`lib/youtube.ts`](lib/youtube.ts)
- Use: [`lib/supadata.ts`](lib/supadata.ts)
- Use: [`lib/gemini.ts`](lib/gemini.ts)
- Use: [`lib/job-token.ts`](lib/job-token.ts)
- Use: [`lib/summarize-schema.ts`](lib/summarize-schema.ts)

- [ ] **Step 1: Write the start route**

```ts
import { normalizeYouTubeUrl } from "@/lib/youtube"
import { getServerEnv } from "@/lib/env"
import { signJobToken } from "@/lib/job-token"
import { startTranscript } from "@/lib/supadata"
import { summarizeTranscriptInRussian } from "@/lib/gemini"
import { summarizeStartRequestSchema } from "@/lib/summarize-schema"
import { toErrorResponse } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const body = summarizeStartRequestSchema.parse(await request.json())
    const sourceUrl = normalizeYouTubeUrl(body.url)
    const transcript = await startTranscript(sourceUrl)

    if (transcript.kind === "processing") {
      const { appJobTokenSecret } = getServerEnv()
      const jobToken = signJobToken(
        {
          version: 1,
          jobId: transcript.jobId,
          sourceUrl,
          createdAt: new Date().toISOString(),
        },
        appJobTokenSecret,
      )

      return Response.json({
        status: "processing",
        jobToken,
      })
    }

    const summary = await summarizeTranscriptInRussian(transcript.content)

    return Response.json({
      status: "completed",
      summary,
      meta: {
        source: "youtube",
        lang: transcript.lang,
        availableLangs: transcript.availableLangs,
      },
    })
  } catch (error) {
    return Response.json(
      toErrorResponse("INTERNAL_ERROR", error instanceof Error ? error.message : "Failed to start summarization"),
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Improve the start route error mapping before moving on**

Replace the blanket catch with branches such as:

```ts
if (error instanceof ZodError) {
  return Response.json(toErrorResponse("INVALID_URL", "Enter a valid YouTube URL."), { status: 400 })
}

if (error instanceof Error && error.message.includes("environment variable")) {
  return Response.json(toErrorResponse("CONFIGURATION_MISSING", "Server configuration is incomplete."), { status: 500 })
}
```

Also map invalid YouTube parsing to `INVALID_URL` and Supadata access failures to `VIDEO_INACCESSIBLE` or `TRANSCRIPT_UNAVAILABLE` when the HTTP status makes that distinction possible.

- [ ] **Step 3: Write the status route**

```ts
import { getServerEnv } from "@/lib/env"
import { verifyJobToken } from "@/lib/job-token"
import { getTranscriptJob } from "@/lib/supadata"
import { summarizeTranscriptInRussian } from "@/lib/gemini"
import { summarizeStatusRequestSchema } from "@/lib/summarize-schema"
import { toErrorResponse } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const body = summarizeStatusRequestSchema.parse(await request.json())
    const { appJobTokenSecret } = getServerEnv()
    const payload = verifyJobToken(body.jobToken, appJobTokenSecret)
    const transcript = await getTranscriptJob(payload.jobId)

    if (transcript.kind === "processing") {
      return Response.json({ status: "processing" })
    }

    const summary = await summarizeTranscriptInRussian(transcript.content)

    return Response.json({
      status: "completed",
      summary,
      meta: {
        source: "youtube",
        lang: transcript.lang,
        availableLangs: transcript.availableLangs,
      },
    })
  } catch (error) {
    return Response.json(
      toErrorResponse("INTERNAL_ERROR", error instanceof Error ? error.message : "Failed to check summarization status"),
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Harden the status route against invalid tokens and expired flows**

Add explicit branches for malformed tokens:

```ts
if (error instanceof Error && error.message.includes("job token")) {
  return Response.json(toErrorResponse("INVALID_JOB_TOKEN", "The processing token is invalid or expired."), { status: 400 })
}
```

Also reject tokens older than the Supadata one-hour job result window by checking `createdAt` before polling.

- [ ] **Step 5: Verify the routes work locally without frontend changes yet**

Run the dev server and use manual requests:

```bash
curl -X POST http://localhost:3000/api/summarize/start \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=qim8chAy7Mw"}'
```

Expected: either `status=completed` with `summary` or `status=processing` with `jobToken`.

If `processing`, continue with:

```bash
curl -X POST http://localhost:3000/api/summarize/status \
  -H "Content-Type: application/json" \
  -d '{"jobToken":"PASTE_TOKEN_HERE"}'
```

Expected: `processing` until Supadata finishes, then `completed` with a Russian summary.

- [ ] **Step 6: Commit**

```bash
git add app/api/summarize/start/route.ts app/api/summarize/status/route.ts
git commit -m "feat: implement summarize start and status routes"
```

## Task 5: Replace the summary page streaming flow with start-plus-poll UX

**Files:**
- Modify: [`app/summary/page.tsx:1-104`](app/summary/page.tsx#L1)
- Optionally modify: [`app/page.tsx:1-43`](app/page.tsx#L1)

- [ ] **Step 1: Replace the single fetch flow with an explicit state machine**

Use this shape in [`app/summary/page.tsx`](app/summary/page.tsx):

```ts
const [summary, setSummary] = useState("")
const [status, setStatus] = useState<"starting" | "processing" | "completed" | "error">("starting")
const [error, setError] = useState("")
```

- [ ] **Step 2: Add the start request function**

```ts
async function startSummaryFlow(videoUrl: string) {
  const response = await fetch("/api/summarize/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: videoUrl }),
  })

  const data = await response.json()

  if (data.status === "completed") {
    setSummary(data.summary)
    setStatus("completed")
    return
  }

  if (data.status === "processing" && data.jobToken) {
    setStatus("processing")
    await pollSummaryStatus(data.jobToken)
    return
  }

  throw new Error(data.error?.message ?? "Failed to summarize video")
}
```

- [ ] **Step 3: Add the polling loop with a one-second interval**

```ts
async function pollSummaryStatus(jobToken: string) {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const response = await fetch("/api/summarize/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobToken }),
    })

    const data = await response.json()

    if (data.status === "processing") {
      continue
    }

    if (data.status === "completed") {
      setSummary(data.summary)
      setStatus("completed")
      return
    }

    throw new Error(data.error?.message ?? "Failed to summarize video")
  }
}
```

- [ ] **Step 4: Wire the effect and render states**

Use an effect like this:

```ts
useEffect(() => {
  if (!url) {
    router.push("/")
    return
  }

  startSummaryFlow(decodeURIComponent(url)).catch((error: Error) => {
    setError(error.message)
    setStatus("error")
  })
}, [url, router])
```

Render status messages such as:

- `starting`: `Запрашиваем расшифровку видео...`
- `processing`: `Видео обрабатывается. Это может занять до минуты...`
- `completed`: render `summary`
- `error`: render the retry action

- [ ] **Step 5: Manually verify the browser flow**

Run: `npm run dev`

Expected manual result:
- open the app
- paste `https://www.youtube.com/watch?v=qim8chAy7Mw`
- navigate to the summary page
- see either immediate completion or a processing state followed by a Russian summary
- see the retry button on failure

- [ ] **Step 6: Commit**

```bash
git add app/summary/page.tsx app/page.tsx
git commit -m "feat: add frontend polling for video summaries"
```

## Task 6: Add documentation for local setup, API keys, and Vercel project variables

**Files:**
- Create or modify: [`README.md`](README.md)
- Reference: [`.env.example`](.env.example)
- Reference: [`docs/superpowers/specs/2026-03-28-youtube-summary-backend-design.md`](docs/superpowers/specs/2026-03-28-youtube-summary-backend-design.md)

- [ ] **Step 1: Write the API key section exactly**

Document these required keys:

```md
## Required API Keys

Create [`.env.local`](.env.local) in the project root with:

```dotenv
SUPADATA_API_KEY=your_supadata_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
APP_JOB_TOKEN_SECRET=replace_with_a_long_random_secret
```

- `SUPADATA_API_KEY` is used only by server routes to fetch transcripts.
- `GEMINI_API_KEY` is used only by server routes to generate the summary in Russian.
- `APP_JOB_TOKEN_SECRET` is your own random secret used to sign the temporary polling token.

Do not put any of these values in client components or commit them to git.
```

- [ ] **Step 2: Write the Vercel setup section thoroughly**

Use this exact outline in [`README.md`](README.md):

```md
## Vercel Deployment Setup

1. Open your project in the Vercel dashboard.
2. Click **Settings**.
3. In the left sidebar, open **Environment Variables**.
4. Add a variable named `SUPADATA_API_KEY` and paste your Supadata key.
5. Add a variable named `GEMINI_API_KEY` and paste your Gemini key.
6. Add a variable named `APP_JOB_TOKEN_SECRET` and paste a long random string.
7. For each variable, choose the environments where it should be available. At minimum, select **Production**. Select **Preview** too if you want preview deployments to work.
8. Save the variables.
9. Redeploy the project so the new values are available to the server routes.
10. After redeploy, submit a YouTube URL through the app and confirm the summary appears.
```

- [ ] **Step 3: Write the local test instructions**

```md
## Local Testing

1. Create [`.env.local`](.env.local) from [`.env.example`](.env.example).
2. Fill in your real API keys.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.
6. Test with `https://www.youtube.com/watch?v=qim8chAy7Mw`.
```

- [ ] **Step 4: Verify the docs are sufficient for a fresh user**

Read only [`README.md`](README.md) and confirm it answers:
- which API keys are required
- where to place them locally
- where to place them on Vercel
- how to run the app
- how to test the app

If any answer is missing, edit the doc before moving on.

- [ ] **Step 5: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add setup and vercel deployment guide"
```

## Task 7: Run end-to-end validation and record known limits

**Files:**
- Modify: [`README.md`](README.md) if testing reveals caveats

- [ ] **Step 1: Run linting**

Run: `npm run lint`

Expected: PASS with no errors.

- [ ] **Step 2: Run local end-to-end validation with the provided sample URL**

Test URL:

```text
https://www.youtube.com/watch?v=qim8chAy7Mw
```

Expected:
- URL is accepted
- backend returns either `processing` or `completed`
- final summary is in Russian
- the page remains usable during polling

- [ ] **Step 3: Run error-path checks**

Manual checks:
- invalid URL such as `https://example.com`
- malformed polling token
- temporarily unset one env var locally and confirm configuration failure is readable
- inaccessible or unsupported video if available

Expected: each path returns a stable error message and the UI offers retry or reset.

- [ ] **Step 4: Record any discovered implementation limits in [`README.md`](README.md)**

If real testing reveals constraints, document them explicitly, for example:

```md
## Known Limits

- Very long videos may remain in processing state while Supadata completes asynchronous transcription.
- The first version summarizes transcript text only and does not enrich the result with extra metadata.
- Production requires Vercel environment variables even if local [`.env.local`](.env.local) works.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "test: validate summary flow and document limits"
```

## Self-Review Checklist

- The plan covers the new backend routes, service adapters, job token logic, frontend polling, documentation, and testing.
- Every required secret from the approved spec appears in [`.env.example`](.env.example) and [`README.md`](README.md).
- The plan preserves free-tier-friendly Vercel behavior by avoiding persistent state and long-running requests.
- The summary output remains Russian in both immediate and async paths.
- The provided YouTube sample URL is used in validation.

## Execution Handoff

Plan complete and saved to [`plans/2026-03-28-youtube-summary-backend-implementation-plan.md`](plans/2026-03-28-youtube-summary-backend-implementation-plan.md). Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
