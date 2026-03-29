# IMDB Movie Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js web app that accepts a movie title, selects the most relevant popular IMDB title via RapidAPI, sends the chosen movie data to Gemini, and returns a short Russian recommendation with IMDB link.

**Architecture:** A single Next.js App Router app serves both the UI and a server-side `/api/recommend` endpoint. The API route validates input, queries RapidAPI for search/details/rating, ranks candidates deterministically, calls Gemini with a constrained JSON prompt, and returns normalized data to the client.

**Tech Stack:** Next.js, React, TypeScript, Zod, Vitest, Testing Library

---

## File Structure

- `package.json`: npm scripts and project metadata.
- `.gitignore`: ignore Node, Next.js, and local env artifacts.
- `.env.example`: sample server-only environment variables.
- `tsconfig.json`: TypeScript compiler settings and `@/*` alias.
- `next-env.d.ts`: Next.js TypeScript ambient declarations.
- `next.config.ts`: minimal Next.js config.
- `eslint.config.mjs`: lint configuration based on `eslint-config-next`.
- `vitest.config.ts`: test runner config with jsdom and alias support.
- `vitest.setup.ts`: shared testing-library setup.
- `src/app/layout.tsx`: root app shell.
- `src/app/globals.css`: page styling.
- `src/app/page.tsx`: homepage wiring the form and result area.
- `src/app/api/recommend/route.ts`: server API route.
- `src/components/movie-search-form.tsx`: client component for input, submit, loading, and error state.
- `src/components/movie-result-card.tsx`: presentation component for the chosen movie and recommendation.
- `src/lib/types.ts`: shared app-level API response types.
- `src/lib/errors.ts`: typed app errors and helpers for API responses.
- `src/lib/validation.ts`: request validation and query normalization.
- `src/lib/env.ts`: environment variable parsing on the server.
- `src/lib/imdb/types.ts`: IMDB search/detail DTOs and normalized types.
- `src/lib/imdb/ranking.ts`: deterministic candidate scoring.
- `src/lib/imdb/client.ts`: RapidAPI fetch helpers.
- `src/lib/imdb/service.ts`: IMDB search orchestration and normalization.
- `src/lib/gemini/prompt.ts`: JSON-only Gemini prompt builder.
- `src/lib/gemini/client.ts`: Gemini API fetch helper and response parser.
- `src/lib/recommendations/service.ts`: end-to-end orchestration used by the route.
- `tests/unit/validation.test.ts`: validation coverage.
- `tests/unit/imdb-ranking.test.ts`: ranking coverage.
- `tests/unit/gemini-prompt.test.ts`: prompt and parser coverage.
- `tests/unit/movie-search-form.test.tsx`: UI flow coverage.
- `tests/integration/recommend-route.test.ts`: route integration coverage with mocked upstream fetches.
- `README.md`: local setup and run instructions.

### Task 1: Bootstrap the Next.js App and Tooling

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Modify: `package.json`

- [ ] **Step 1: Initialize npm metadata and install dependencies**

Run:

```bash
npm init -y
npm install next@latest react@latest react-dom@latest zod
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `package.json` and `package-lock.json` are created, npm exits with code `0`.

- [ ] **Step 2: Update `package.json` scripts and project metadata**

Run:

```bash
npm pkg set name="lesson03-imdb"
npm pkg set private=true
npm pkg set scripts.dev="next dev"
npm pkg set scripts.build="next build"
npm pkg set scripts.start="next start"
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
```

Expected: `package.json` contains the app name and the six scripts above.

- [ ] **Step 3: Add baseline config files**

Create `.gitignore`:

```gitignore
node_modules
.next
.vercel
.DS_Store
.env.local
coverage
```

Create `.env.example`:

```dotenv
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=imdb236.p.rapidapi.com
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_ID=gemini-3.1-flash-lite-preview
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is managed by Next.js.
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `eslint.config.mjs`:

```js
import nextVitals from "eslint-config-next/core-web-vitals";

export default [...nextVitals];
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create the initial app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMDB Movie Advisor",
  description: "Локальный сервис рекомендаций фильмов на базе IMDB и Gemini."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/globals.css`:

```css
:root {
  color-scheme: light;
  --page-bg: radial-gradient(circle at top, #fff7d6 0%, #f4efe3 35%, #e7e0d4 100%);
  --card-bg: rgba(255, 255, 255, 0.78);
  --card-border: rgba(53, 44, 26, 0.14);
  --text-main: #1f1a12;
  --text-muted: #5c5240;
  --accent: #8b5e1a;
  --accent-strong: #6b460e;
  --danger: #8f3124;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: Georgia, "Times New Roman", serif;
  background: var(--page-bg);
  color: var(--text-main);
}

a {
  color: inherit;
}
```

Create `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main style={{ padding: "48px 20px", maxWidth: 960, margin: "0 auto" }}>
      <section
        style={{
          padding: 32,
          borderRadius: 24,
          background: "rgba(255,255,255,0.76)",
          border: "1px solid rgba(53, 44, 26, 0.14)"
        }}
      >
        <p style={{ margin: 0, color: "#8b5e1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Movie Advisor
        </p>
        <h1 style={{ marginBottom: 12 }}>Спроси, стоит ли смотреть фильм</h1>
        <p style={{ margin: 0, color: "#5c5240" }}>
          Введите название фильма. Сервис найдёт наиболее подходящий популярный фильм из IMDB и
          вернёт краткую рекомендацию на русском языке.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verify the empty shell builds**

Run:

```bash
npm run build
```

Expected: Next.js build succeeds and prints `Compiled successfully` or the current equivalent success message with exit code `0`.

- [ ] **Step 6: Commit the bootstrap**

Run:

```bash
git add .
git commit -m "chore: bootstrap next movie advisor"
```

Expected: one commit is created with the baseline app and tooling.

### Task 2: Add Validation, Shared Types, and Environment Parsing

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/validation.ts`
- Create: `src/lib/env.ts`
- Test: `tests/unit/validation.test.ts`

- [ ] **Step 1: Write the failing validation tests**

Create `tests/unit/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { normalizeMovieQuery, parseMovieQuery } from "@/lib/validation";

describe("normalizeMovieQuery", () => {
  it("collapses spaces and trims", () => {
    expect(normalizeMovieQuery("   The   Matrix   ")).toBe("The Matrix");
  });
});

describe("parseMovieQuery", () => {
  it("accepts a valid query", () => {
    expect(parseMovieQuery({ query: "Матрица" })).toEqual({ query: "Матрица" });
  });

  it("rejects an empty query", () => {
    expect(() => parseMovieQuery({ query: "   " })).toThrowError(AppError);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npm run test -- tests/unit/validation.test.ts
```

Expected: FAIL because `@/lib/errors` and `@/lib/validation` do not exist yet.

- [ ] **Step 3: Implement shared types, app errors, validation, and env parsing**

Create `src/lib/types.ts`:

```ts
export type RecommendationPayload = {
  movie: {
    id: string;
    title: string;
    originalTitle?: string | null;
    year?: number | null;
    rating?: number | null;
    votes?: number | null;
    plot?: string | null;
    url: string;
  };
  recommendation: {
    verdict: string;
    summary: string;
  };
};

export type RecommendationSuccess = RecommendationPayload;

export type RecommendationError = {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "MOVIE_NOT_FOUND"
      | "UPSTREAM_IMDB_ERROR"
      | "UPSTREAM_GEMINI_ERROR"
      | "INTERNAL_ERROR";
    message: string;
  };
};
```

Create `src/lib/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    public readonly code:
      | "VALIDATION_ERROR"
      | "MOVIE_NOT_FOUND"
      | "UPSTREAM_IMDB_ERROR"
      | "UPSTREAM_GEMINI_ERROR"
      | "INTERNAL_ERROR",
    message: string,
    public readonly status = 500
  ) {
    super(message);
  }
}
```

Create `src/lib/validation.ts`:

```ts
import { z } from "zod";
import { AppError } from "@/lib/errors";

const requestSchema = z.object({
  query: z.string().transform((value) => normalizeMovieQuery(value))
});

export function normalizeMovieQuery(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseMovieQuery(input: unknown) {
  const parsed = requestSchema.safeParse(input);

  if (!parsed.success || parsed.data.query.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Введите название фильма", 400);
  }

  return parsed.data;
}
```

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  RAPIDAPI_KEY: z.string().min(1),
  RAPIDAPI_HOST: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL_ID: z.string().min(1)
});

export function getServerEnv() {
  return envSchema.parse({
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL_ID: process.env.GEMINI_MODEL_ID
  });
}
```

- [ ] **Step 4: Re-run the validation test**

Run:

```bash
npm run test -- tests/unit/validation.test.ts
```

Expected: PASS with three passing assertions.

- [ ] **Step 5: Commit the validation foundation**

Run:

```bash
git add src/lib/types.ts src/lib/errors.ts src/lib/validation.ts src/lib/env.ts tests/unit/validation.test.ts
git commit -m "feat: add request validation and env parsing"
```

Expected: one commit is created for shared validation primitives.

### Task 3: Implement IMDB Candidate Ranking and Fetch Layer

**Files:**
- Create: `src/lib/imdb/types.ts`
- Create: `src/lib/imdb/ranking.ts`
- Create: `src/lib/imdb/client.ts`
- Create: `src/lib/imdb/service.ts`
- Test: `tests/unit/imdb-ranking.test.ts`

- [ ] **Step 1: Write the failing ranking tests**

Create `tests/unit/imdb-ranking.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pickBestCandidate } from "@/lib/imdb/ranking";
import type { ImdbSearchCandidate } from "@/lib/imdb/types";

const candidates: ImdbSearchCandidate[] = [
  {
    id: "tt10838180",
    primaryTitle: "The Matrix Revisited",
    originalTitle: "The Matrix Revisited",
    type: "documentary",
    startYear: 2001,
    averageRating: 7.4,
    numVotes: 1200,
    description: "A documentary about the making of The Matrix."
  },
  {
    id: "tt0133093",
    primaryTitle: "The Matrix",
    originalTitle: "The Matrix",
    type: "movie",
    startYear: 1999,
    averageRating: 8.7,
    numVotes: 2100000,
    description: "A hacker learns what reality really is."
  }
];

describe("pickBestCandidate", () => {
  it("prefers the most relevant popular movie over a documentary", () => {
    const winner = pickBestCandidate("Matrix", candidates);
    expect(winner?.id).toBe("tt0133093");
  });
});
```

- [ ] **Step 2: Run the ranking test and confirm it fails**

Run:

```bash
npm run test -- tests/unit/imdb-ranking.test.ts
```

Expected: FAIL because the IMDB ranking modules do not exist yet.

- [ ] **Step 3: Implement IMDB types, ranking, and API helpers**

Create `src/lib/imdb/types.ts`:

```ts
export type ImdbSearchCandidate = {
  id: string;
  primaryTitle: string;
  originalTitle?: string | null;
  type?: string | null;
  startYear?: number | null;
  averageRating?: number | null;
  numVotes?: number | null;
  description?: string | null;
};

export type ImdbDetails = {
  id: string;
  url: string;
  primaryTitle: string;
  originalTitle?: string | null;
  description?: string | null;
  startYear?: number | null;
  genres?: string[] | null;
  averageRating?: number | null;
  numVotes?: number | null;
};

export type NormalizedMovie = {
  id: string;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  rating?: number | null;
  votes?: number | null;
  plot?: string | null;
  url: string;
  genres: string[];
};
```

Create `src/lib/imdb/ranking.ts`:

```ts
import type { ImdbSearchCandidate } from "@/lib/imdb/types";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function titleScore(query: string, candidate: ImdbSearchCandidate) {
  const normalizedQuery = normalize(query);
  const primary = normalize(candidate.primaryTitle);
  const original = normalize(candidate.originalTitle ?? "");

  if (primary === normalizedQuery || original === normalizedQuery) {
    return 700;
  }

  if (primary.startsWith(normalizedQuery) || original.startsWith(normalizedQuery)) {
    return 520;
  }

  if (primary.includes(normalizedQuery) || original.includes(normalizedQuery)) {
    return 360;
  }

  return 0;
}

function typeScore(type?: string | null) {
  switch (type) {
    case "movie":
      return 320;
    case "tvMovie":
      return 120;
    case "documentary":
      return -180;
    case "short":
      return -220;
    case "tvEpisode":
      return -300;
    case "tvSeries":
      return -240;
    default:
      return 0;
  }
}

function popularityScore(candidate: ImdbSearchCandidate) {
  const votes = Math.log10((candidate.numVotes ?? 0) + 1) * 45;
  const rating = (candidate.averageRating ?? 0) * 12;
  return votes + rating;
}

export function scoreCandidate(query: string, candidate: ImdbSearchCandidate) {
  const descriptionPenalty = /documentary|making of|behind the scenes/i.test(candidate.description ?? "")
    ? -140
    : 0;

  return titleScore(query, candidate) + typeScore(candidate.type) + popularityScore(candidate) + descriptionPenalty;
}

export function pickBestCandidate(query: string, candidates: ImdbSearchCandidate[]) {
  return [...candidates]
    .map((candidate) => ({ candidate, score: scoreCandidate(query, candidate) }))
    .sort((left, right) => right.score - left.score)[0]?.candidate ?? null;
}
```

Create `src/lib/imdb/client.ts`:

```ts
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import type { ImdbDetails, ImdbSearchCandidate } from "@/lib/imdb/types";

type RatingResponse = {
  averageRating?: number | null;
  numVotes?: number | null;
};

export function createImdbClient(fetchImpl: typeof fetch = fetch) {
  const env = getServerEnv();
  const baseUrl = `https://${env.RAPIDAPI_HOST}/api/imdb`;

  async function requestJson<T>(url: string): Promise<T> {
    const response = await fetchImpl(url, {
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": env.RAPIDAPI_HOST,
        "x-rapidapi-key": env.RAPIDAPI_KEY
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new AppError("UPSTREAM_IMDB_ERROR", "Сервис временно недоступен", 502);
    }

    return (await response.json()) as T;
  }

  return {
    async search(query: string) {
      const url = `${baseUrl}/search?originalTitle=${encodeURIComponent(query)}&rows=25&sortField=numVotes&sortOrder=DESC`;
      const payload = await requestJson<{ results?: ImdbSearchCandidate[] }>(url);
      return payload.results ?? [];
    },
    async getDetails(imdbId: string) {
      return requestJson<ImdbDetails>(`${baseUrl}/${imdbId}`);
    },
    async getRating(imdbId: string) {
      return requestJson<RatingResponse>(`${baseUrl}/${imdbId}/rating`);
    }
  };
}
```

Create `src/lib/imdb/service.ts`:

```ts
import { AppError } from "@/lib/errors";
import { createImdbClient } from "@/lib/imdb/client";
import { pickBestCandidate } from "@/lib/imdb/ranking";
import type { NormalizedMovie } from "@/lib/imdb/types";

export async function findBestMovie(query: string, fetchImpl: typeof fetch = fetch): Promise<NormalizedMovie> {
  const imdb = createImdbClient(fetchImpl);
  const candidates = await imdb.search(query);
  const best = pickBestCandidate(query, candidates);

  if (!best) {
    throw new AppError("MOVIE_NOT_FOUND", "Фильм не найден", 404);
  }

  const [details, rating] = await Promise.all([imdb.getDetails(best.id), imdb.getRating(best.id)]);

  return {
    id: details.id,
    title: details.primaryTitle,
    originalTitle: details.originalTitle ?? null,
    year: details.startYear ?? null,
    rating: rating.averageRating ?? details.averageRating ?? null,
    votes: rating.numVotes ?? details.numVotes ?? null,
    plot: details.description ?? null,
    url: details.url,
    genres: details.genres ?? []
  };
}
```

- [ ] **Step 4: Re-run the ranking test**

Run:

```bash
npm run test -- tests/unit/imdb-ranking.test.ts
```

Expected: PASS with the movie candidate winning over the documentary candidate.

- [ ] **Step 5: Commit the IMDB search layer**

Run:

```bash
git add src/lib/imdb/types.ts src/lib/imdb/ranking.ts src/lib/imdb/client.ts src/lib/imdb/service.ts tests/unit/imdb-ranking.test.ts
git commit -m "feat: add imdb search and ranking service"
```

Expected: one commit is created for IMDB integration primitives.

### Task 4: Implement Gemini Prompting and Response Parsing

**Files:**
- Create: `src/lib/gemini/prompt.ts`
- Create: `src/lib/gemini/client.ts`
- Test: `tests/unit/gemini-prompt.test.ts`

- [ ] **Step 1: Write the failing Gemini prompt tests**

Create `tests/unit/gemini-prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGeminiPrompt, parseGeminiTextPayload } from "@/lib/gemini/prompt";

describe("buildGeminiPrompt", () => {
  it("includes the movie title and asks for russian json", () => {
    const prompt = buildGeminiPrompt({
      id: "tt0133093",
      title: "The Matrix",
      originalTitle: "The Matrix",
      year: 1999,
      rating: 8.7,
      votes: 2100000,
      plot: "A hacker learns the true nature of reality.",
      url: "https://www.imdb.com/title/tt0133093/",
      genres: ["Action", "Sci-Fi"]
    });

    expect(prompt).toContain("The Matrix");
    expect(prompt).toContain("русском языке");
    expect(prompt).toContain("\"verdict\"");
  });
});

describe("parseGeminiTextPayload", () => {
  it("extracts verdict and summary from json text", () => {
    const parsed = parseGeminiTextPayload('{"verdict":"Стоит посмотреть","summary":"Высокий рейтинг и культовый сюжет говорят в пользу просмотра."}');
    expect(parsed.verdict).toBe("Стоит посмотреть");
    expect(parsed.summary).toContain("культовый");
  });
});
```

- [ ] **Step 2: Run the Gemini prompt test and confirm it fails**

Run:

```bash
npm run test -- tests/unit/gemini-prompt.test.ts
```

Expected: FAIL because the Gemini prompt module does not exist yet.

- [ ] **Step 3: Implement the prompt builder and Gemini client**

Create `src/lib/gemini/prompt.ts`:

```ts
import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { NormalizedMovie } from "@/lib/imdb/types";

const geminiPayloadSchema = z.object({
  verdict: z.string().min(1),
  summary: z.string().min(1)
});

export function buildGeminiPrompt(movie: NormalizedMovie) {
  return [
    "Ты киносоветник.",
    "Отвечай только на русском языке.",
    "Оцени, стоит ли смотреть фильм по переданным данным IMDB.",
    "Не придумывай факты и не используй знания вне входных данных.",
    'Верни JSON без markdown в формате {"verdict":"...","summary":"..."}.',
    'Поле "verdict" должно быть либо "Стоит посмотреть", либо "Скорее не стоит смотреть".',
    'Поле "summary" должно содержать 2-3 коротких предложения.',
    "",
    `Название: ${movie.title}`,
    `Оригинальное название: ${movie.originalTitle ?? "нет данных"}`,
    `Год: ${movie.year ?? "нет данных"}`,
    `Рейтинг IMDB: ${movie.rating ?? "нет данных"}`,
    `Количество голосов: ${movie.votes ?? "нет данных"}`,
    `Жанры: ${movie.genres.join(", ") || "нет данных"}`,
    `Описание: ${movie.plot ?? "нет данных"}`,
    `Ссылка IMDB: ${movie.url}`
  ].join("\n");
}

export function parseGeminiTextPayload(text: string) {
  try {
    return geminiPayloadSchema.parse(JSON.parse(text));
  } catch {
    throw new AppError("UPSTREAM_GEMINI_ERROR", "Не удалось получить рекомендацию", 502);
  }
}
```

Create `src/lib/gemini/client.ts`:

```ts
import { AppError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import { buildGeminiPrompt, parseGeminiTextPayload } from "@/lib/gemini/prompt";
import type { NormalizedMovie } from "@/lib/imdb/types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function getGeminiRecommendation(movie: NormalizedMovie, fetchImpl: typeof fetch = fetch) {
  const env = getServerEnv();
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL_ID}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildGeminiPrompt(movie) }]
          }
        ]
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new AppError("UPSTREAM_GEMINI_ERROR", "Не удалось получить рекомендацию", 502);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

  if (!text) {
    throw new AppError("UPSTREAM_GEMINI_ERROR", "Не удалось получить рекомендацию", 502);
  }

  return parseGeminiTextPayload(text);
}
```

- [ ] **Step 4: Re-run the Gemini prompt test**

Run:

```bash
npm run test -- tests/unit/gemini-prompt.test.ts
```

Expected: PASS with the prompt and JSON parser covered.

- [ ] **Step 5: Commit the Gemini layer**

Run:

```bash
git add src/lib/gemini/prompt.ts src/lib/gemini/client.ts tests/unit/gemini-prompt.test.ts
git commit -m "feat: add gemini recommendation client"
```

Expected: one commit is created for Gemini prompt and client logic.

### Task 5: Build the Recommendation Orchestrator and API Route

**Files:**
- Create: `src/lib/recommendations/service.ts`
- Create: `src/app/api/recommend/route.ts`
- Test: `tests/integration/recommend-route.test.ts`

- [ ] **Step 1: Write the failing integration test for the route**

Create `tests/integration/recommend-route.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/recommend/route";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.RAPIDAPI_KEY = "rapid";
  process.env.RAPIDAPI_HOST = "imdb236.p.rapidapi.com";
  process.env.GEMINI_API_KEY = "gemini";
  process.env.GEMINI_MODEL_ID = "gemini-3.1-flash-lite-preview";
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("POST /api/recommend", () => {
  it("returns a normalized recommendation payload", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                id: "tt0133093",
                primaryTitle: "The Matrix",
                originalTitle: "The Matrix",
                type: "movie",
                averageRating: 8.7,
                numVotes: 2100000
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "tt0133093",
            url: "https://www.imdb.com/title/tt0133093/",
            primaryTitle: "The Matrix",
            originalTitle: "The Matrix",
            description: "A hacker learns the true nature of reality.",
            startYear: 1999,
            genres: ["Action", "Sci-Fi"]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ averageRating: 8.7, numVotes: 2100000 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: '{"verdict":"Стоит посмотреть","summary":"Высокий рейтинг и культовый сюжет говорят в пользу просмотра."}'
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const response = await POST(
      new Request("http://localhost:3000/api/recommend", {
        method: "POST",
        body: JSON.stringify({ query: "Матрица" })
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.movie.title).toBe("The Matrix");
    expect(payload.recommendation.verdict).toBe("Стоит посмотреть");
  });
});
```

- [ ] **Step 2: Run the integration test and confirm it fails**

Run:

```bash
npm run test -- tests/integration/recommend-route.test.ts
```

Expected: FAIL because the route and recommendation orchestrator do not exist yet.

- [ ] **Step 3: Implement the orchestration service and route handler**

Create `src/lib/recommendations/service.ts`:

```ts
import { getGeminiRecommendation } from "@/lib/gemini/client";
import { findBestMovie } from "@/lib/imdb/service";

export async function getMovieRecommendation(query: string, fetchImpl: typeof fetch = fetch) {
  const movie = await findBestMovie(query, fetchImpl);
  const recommendation = await getGeminiRecommendation(movie, fetchImpl);

  return {
    movie: {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.year,
      rating: movie.rating,
      votes: movie.votes,
      plot: movie.plot,
      url: movie.url
    },
    recommendation
  };
}
```

Create `src/app/api/recommend/route.ts`:

```ts
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getMovieRecommendation } from "@/lib/recommendations/service";
import { parseMovieQuery } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = parseMovieQuery(body);
    const payload = await getMovieRecommendation(query);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: error.status }
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Произошла внутренняя ошибка"
        }
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Re-run the integration test**

Run:

```bash
npm run test -- tests/integration/recommend-route.test.ts
```

Expected: PASS with a `200` response and the normalized payload.

- [ ] **Step 5: Commit the route implementation**

Run:

```bash
git add src/lib/recommendations/service.ts src/app/api/recommend/route.ts tests/integration/recommend-route.test.ts
git commit -m "feat: add recommendation api route"
```

Expected: one commit is created for the end-to-end server flow.

### Task 6: Build the Russian UI and Client Fetch Flow

**Files:**
- Create: `src/components/movie-search-form.tsx`
- Create: `src/components/movie-result-card.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/unit/movie-search-form.test.tsx`

- [ ] **Step 1: Write the failing UI test**

Create `tests/unit/movie-search-form.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MovieSearchForm } from "@/components/movie-search-form";

describe("MovieSearchForm", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("submits the title and renders the result card", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          movie: {
            id: "tt0133093",
            title: "The Matrix",
            originalTitle: "The Matrix",
            year: 1999,
            rating: 8.7,
            votes: 2100000,
            plot: "A hacker learns the true nature of reality.",
            url: "https://www.imdb.com/title/tt0133093/"
          },
          recommendation: {
            verdict: "Стоит посмотреть",
            summary: "Высокий рейтинг и культовый сюжет говорят в пользу просмотра."
          }
        }),
        { status: 200 }
      )
    );

    render(<MovieSearchForm />);

    await userEvent.type(screen.getByLabelText("Название фильма"), "Матрица");
    await userEvent.click(screen.getByRole("button", { name: "Получить рекомендацию" }));

    await waitFor(() => {
      expect(screen.getByText("Стоит посмотреть")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/recommend", expect.anything());
    expect(screen.getByRole("link", { name: "Открыть на IMDB" })).toHaveAttribute(
      "href",
      "https://www.imdb.com/title/tt0133093/"
    );
  });
});
```

- [ ] **Step 2: Run the UI test and confirm it fails**

Run:

```bash
npm run test -- tests/unit/movie-search-form.test.tsx
```

Expected: FAIL because the UI components do not exist yet.

- [ ] **Step 3: Implement the form component, result card, and page wiring**

Create `src/components/movie-result-card.tsx`:

```tsx
import type { RecommendationSuccess } from "@/lib/types";

export function MovieResultCard({ payload }: { payload: RecommendationSuccess }) {
  const { movie, recommendation } = payload;

  return (
    <article
      style={{
        marginTop: 24,
        padding: 24,
        borderRadius: 24,
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(53, 44, 26, 0.14)"
      }}
    >
      <p style={{ margin: 0, color: "#8b5e1a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Вердикт
      </p>
      <h2 style={{ marginTop: 8 }}>{recommendation.verdict}</h2>
      <p>{recommendation.summary}</p>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: 8 }}>
        <dt>Название</dt>
        <dd>{movie.title}</dd>
        <dt>Оригинал</dt>
        <dd>{movie.originalTitle ?? "нет данных"}</dd>
        <dt>Год</dt>
        <dd>{movie.year ?? "нет данных"}</dd>
        <dt>Рейтинг IMDB</dt>
        <dd>{movie.rating ?? "нет данных"}</dd>
      </dl>
      <a href={movie.url} target="_blank" rel="noreferrer">
        Открыть на IMDB
      </a>
    </article>
  );
}
```

Create `src/components/movie-search-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MovieResultCard } from "@/components/movie-result-card";
import type { RecommendationError, RecommendationSuccess } from "@/lib/types";

export function MovieSearchForm() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationSuccess | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length === 0) {
      setError("Введите название фильма");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      });

      const payload = (await response.json()) as RecommendationSuccess | RecommendationError;

      if (!response.ok) {
        setResult(null);
        setError("error" in payload ? payload.error.message : "Произошла внутренняя ошибка");
        return;
      }

      setResult(payload as RecommendationSuccess);
    } catch {
      setResult(null);
      setError("Сервис временно недоступен");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 24,
          display: "grid",
          gap: 12,
          padding: 24,
          borderRadius: 24,
          background: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(53, 44, 26, 0.14)"
        }}
      >
        <label htmlFor="movie-title">Название фильма</label>
        <input
          id="movie-title"
          name="movie-title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например, Матрица"
          style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(53, 44, 26, 0.18)" }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "14px 18px",
            borderRadius: 999,
            border: "none",
            background: "#6b460e",
            color: "white",
            cursor: "pointer"
          }}
        >
          {isLoading ? "Ищем фильм..." : "Получить рекомендацию"}
        </button>
      </form>

      {error ? (
        <p role="alert" style={{ color: "#8f3124", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {result ? <MovieResultCard payload={result} /> : null}
    </>
  );
}
```

Modify `src/app/page.tsx`:

```tsx
import { MovieSearchForm } from "@/components/movie-search-form";

export default function HomePage() {
  return (
    <main style={{ padding: "48px 20px", maxWidth: 960, margin: "0 auto" }}>
      <section
        style={{
          padding: 32,
          borderRadius: 24,
          background: "rgba(255,255,255,0.76)",
          border: "1px solid rgba(53, 44, 26, 0.14)"
        }}
      >
        <p style={{ margin: 0, color: "#8b5e1a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Movie Advisor
        </p>
        <h1 style={{ marginBottom: 12 }}>Спроси, стоит ли смотреть фильм</h1>
        <p style={{ margin: 0, color: "#5c5240" }}>
          Введите название фильма. Сервис найдёт наиболее подходящий популярный фильм из IMDB и
          вернёт краткую рекомендацию на русском языке.
        </p>
        <MovieSearchForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Re-run the UI test**

Run:

```bash
npm run test -- tests/unit/movie-search-form.test.tsx
```

Expected: PASS with the form rendering the result card after a mocked request.

- [ ] **Step 5: Commit the UI**

Run:

```bash
git add src/components/movie-search-form.tsx src/components/movie-result-card.tsx src/app/page.tsx tests/unit/movie-search-form.test.tsx
git commit -m "feat: add russian movie advisor ui"
```

Expected: one commit is created for the homepage UI.

### Task 7: Add Local Run Documentation and Full Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the local setup guide**

Create `README.md`:

````md
# IMDB Movie Advisor

Локальный сервис на Next.js, который ищет фильм в IMDB через RapidAPI и выдаёт краткую рекомендацию на русском языке через Gemini.

## Запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env.local` на основе `.env.example` и заполните ключи.

3. Запустите проект:

```bash
npm run dev
```

4. Откройте `http://localhost:3000`.

## Проверки

```bash
npm run lint
npm run test
npm run build
```
````

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected: lint, all unit and integration tests, and the production build all pass with exit code `0`.

- [ ] **Step 3: Perform the manual smoke check**

Run:

```bash
npm run dev
```

Expected: local server starts on `http://localhost:3000`. In the browser, searching for a known film title shows a result card, a Russian recommendation, and a working IMDB link.

- [ ] **Step 4: Commit the final docs and verification**

Run:

```bash
git add README.md
git commit -m "docs: add local setup instructions"
```

Expected: one commit is created for the final setup guide.

## Self-Review

- Spec coverage:
  - Local Next.js app: Task 1 and Task 6.
  - Single-field Russian UI: Task 6.
  - RapidAPI IMDB search, detail, and rating flow: Task 3 and Task 5.
  - Deterministic “most relevant popular movie” selection: Task 3.
  - Gemini `gemini-3.1-flash-lite-preview` recommendation in Russian: Task 4 and Task 5.
  - Error handling and normalized API responses: Task 2 and Task 5.
  - Local run instructions and verification: Task 7.
- Placeholder scan: no `TODO`, `TBD`, or deferred “handle later” instructions remain.
- Type consistency: `RecommendationSuccess`, `AppError`, `NormalizedMovie`, and the `/api/recommend` payload shape are defined once and reused across tasks.
