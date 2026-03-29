import { AppError } from "../errors";
import type { NormalizedMovie } from "../imdb/types";

export type GeminiRecommendationPayload = {
  verdict: "Стоит посмотреть" | "Скорее не стоит смотреть";
  summary: string;
};

export type SearchQueryVariantsPayload = {
  queries: string[];
};

function stripCodeFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function buildSearchQueryVariantsPrompt(query: string) {
  return [
    "Ты помогаешь найти фильм в IMDB.",
    "Пользователь может ввести русское название фильма, а IMDB лучше ищет по международному или английскому названию.",
    'Верни JSON без markdown в формате {"queries":["..."]}.',
    "В массиве должно быть от 1 до 4 строк.",
    "Первая строка должна быть самым вероятным названием фильма для поиска в IMDB.",
    "Добавляй только вероятные варианты названия, без пояснений и без лишнего текста.",
    "",
    `Запрос пользователя: ${query}`
  ].join("\n");
}

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

export function parseSearchQueryVariantsPayload(text: string): SearchQueryVariantsPayload {
  try {
    const parsed = JSON.parse(stripCodeFences(text)) as unknown;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("invalid payload");
    }

    const data = parsed as Record<string, unknown>;
    if (!Array.isArray(data.queries)) {
      throw new Error("invalid payload");
    }

    const queries = data.queries
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .filter((item, index, source) => source.indexOf(item) === index)
      .slice(0, 4);

    if (queries.length === 0) {
      throw new Error("invalid payload");
    }

    return { queries };
  } catch {
    throw new AppError("UPSTREAM_GEMINI_ERROR", "Не удалось получить рекомендацию", 502);
  }
}

export function parseGeminiTextPayload(text: string): GeminiRecommendationPayload {
  try {
    const parsed = JSON.parse(stripCodeFences(text)) as unknown;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("invalid payload");
    }

    const data = parsed as Record<string, unknown>;
    const verdict = data.verdict;
    const summary = data.summary;

    if (
      (verdict !== "Стоит посмотреть" && verdict !== "Скорее не стоит смотреть") ||
      typeof summary !== "string" ||
      summary.trim().length === 0
    ) {
      throw new Error("invalid payload");
    }

    return {
      verdict,
      summary: summary.trim()
    };
  } catch {
    throw new AppError("UPSTREAM_GEMINI_ERROR", "Не удалось получить рекомендацию", 502);
  }
}
