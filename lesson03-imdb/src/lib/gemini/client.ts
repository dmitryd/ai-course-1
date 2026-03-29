import { AppError } from "../errors";
import { getServerEnv } from "../env";
import {
  buildGeminiPrompt,
  buildSearchQueryVariantsPrompt,
  parseGeminiTextPayload,
  parseSearchQueryVariantsPayload
} from "./prompt";
import type { NormalizedMovie } from "../imdb/types";

type FetchLike = typeof fetch;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

async function generateGeminiText(prompt: string, fetchImpl: FetchLike = fetch) {
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
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "MINIMAL"
          }
        }
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

  return text;
}

export async function getSearchQueryVariants(query: string, fetchImpl: FetchLike = fetch) {
  const text = await generateGeminiText(buildSearchQueryVariantsPrompt(query), fetchImpl);
  return parseSearchQueryVariantsPayload(text).queries;
}

export async function getGeminiRecommendation(movie: NormalizedMovie, fetchImpl: FetchLike = fetch) {
  const text = await generateGeminiText(buildGeminiPrompt(movie), fetchImpl);
  return parseGeminiTextPayload(text);
}
