import { AppError } from "../errors";
import { getServerEnv } from "../env";
import type { ImdbDetails, ImdbSearchCandidate } from "./types";

type FetchLike = typeof fetch;

type SearchSource = {
  results?: unknown;
  data?: {
    results?: unknown;
  };
  titles?: unknown;
  items?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildHeaders(env = getServerEnv()) {
  return {
    "Content-Type": "application/json",
    accept: "application/json",
    "x-rapidapi-host": env.RAPIDAPI_HOST,
    "x-rapidapi-key": env.RAPIDAPI_KEY
  };
}

function normalizeCandidate(candidate: unknown): ImdbSearchCandidate | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const item = candidate as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : typeof item.tconst === "string" ? item.tconst : "";
  const primaryTitle =
    typeof item.primaryTitle === "string"
      ? item.primaryTitle
      : typeof item.title === "string"
        ? item.title
        : typeof item.name === "string"
          ? item.name
          : "";

  if (!id || !primaryTitle) {
    return null;
  }

  return {
    id,
    primaryTitle,
    originalTitle:
      typeof item.originalTitle === "string"
        ? item.originalTitle
        : typeof item.original_title === "string"
          ? item.original_title
          : null,
    type: typeof item.type === "string" ? item.type : typeof item.titleType === "string" ? item.titleType : null,
    startYear:
      typeof item.startYear === "number"
        ? item.startYear
        : typeof item.year === "number"
          ? item.year
          : null,
    averageRating:
      typeof item.averageRating === "number"
        ? item.averageRating
        : typeof item.rating === "number"
          ? item.rating
          : null,
    numVotes:
      typeof item.numVotes === "number"
        ? item.numVotes
        : typeof item.votes === "number"
          ? item.votes
          : null,
    description:
      typeof item.description === "string"
        ? item.description
        : typeof item.plot === "string"
          ? item.plot
          : null
  };
}

function parseSearchResults(payload: unknown): ImdbSearchCandidate[] {
  const source = isRecord(payload) ? (payload as SearchSource) : null;

  const candidates: unknown[] =
    (source && Array.isArray(source.results) && (source.results as unknown[])) ||
    (source && Array.isArray(source.data?.results) && (source.data?.results as unknown[])) ||
    (source && Array.isArray(source.titles) && (source.titles as unknown[])) ||
    (source && Array.isArray(source.items) && (source.items as unknown[])) ||
    (Array.isArray(payload) ? payload : []);

  return candidates.reduce<ImdbSearchCandidate[]>((accumulator, candidate) => {
    const normalized = normalizeCandidate(candidate);

    if (normalized) {
      accumulator.push(normalized);
    }

    return accumulator;
  }, []);
}

function parseRating(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { averageRating: null, numVotes: null };
  }

  const data = payload as Record<string, unknown>;
  return {
    averageRating:
      typeof data.averageRating === "number"
        ? data.averageRating
        : typeof data.rating === "number"
          ? data.rating
          : null,
    numVotes:
      typeof data.numVotes === "number" ? data.numVotes : typeof data.votes === "number" ? data.votes : null
  };
}

function normalizeDetails(payload: unknown, imdbId: string): ImdbDetails {
  if (!payload || typeof payload !== "object") {
    throw new AppError("UPSTREAM_IMDB_ERROR", "Сервис временно недоступен", 502);
  }

  const data = payload as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : imdbId;
  const primaryTitle =
    typeof data.primaryTitle === "string"
      ? data.primaryTitle
      : typeof data.title === "string"
        ? data.title
        : "";

  if (!primaryTitle) {
    throw new AppError("UPSTREAM_IMDB_ERROR", "Сервис временно недоступен", 502);
  }

  const url = typeof data.url === "string" && data.url.length > 0 ? data.url : `https://www.imdb.com/title/${id}/`;

  const genres = Array.isArray(data.genres) ? data.genres.filter((genre): genre is string => typeof genre === "string") : null;

  return {
    id,
    url,
    primaryTitle,
    originalTitle: typeof data.originalTitle === "string" ? data.originalTitle : null,
    description:
      typeof data.description === "string"
        ? data.description
        : typeof data.plot === "string"
          ? data.plot
          : null,
    startYear:
      typeof data.startYear === "number"
        ? data.startYear
        : typeof data.year === "number"
          ? data.year
          : null,
    genres,
    averageRating:
      typeof data.averageRating === "number"
        ? data.averageRating
        : typeof data.rating === "number"
          ? data.rating
          : null,
    numVotes:
      typeof data.numVotes === "number"
        ? data.numVotes
        : typeof data.votes === "number"
          ? data.votes
          : null
  };
}

export function createImdbClient(fetchImpl: FetchLike = fetch) {
  const env = getServerEnv();
  const baseUrl = `https://${env.RAPIDAPI_HOST}/api/imdb`;

  async function requestJson<T>(url: string): Promise<T> {
    const response = await fetchImpl(url, {
      headers: buildHeaders(env),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new AppError("UPSTREAM_IMDB_ERROR", "Сервис временно недоступен", 502);
    }

    return (await response.json()) as T;
  }

  async function searchByParam(query: string, paramName: "originalTitle" | "primaryTitle") {
    const url = `${baseUrl}/search?${paramName}=${encodeURIComponent(query)}&rows=25&sortField=numVotes&sortOrder=DESC`;
    const payload = await requestJson<unknown>(url);
    return parseSearchResults(payload);
  }

  return {
    async search(query: string) {
      const searchResults = await Promise.allSettled([
        searchByParam(query, "originalTitle"),
        searchByParam(query, "primaryTitle")
      ]);

      const fulfilled = searchResults
        .filter((result): result is PromiseFulfilledResult<ImdbSearchCandidate[]> => result.status === "fulfilled")
        .flatMap((result) => result.value);

      const hasFulfilledRequest = searchResults.some((result) => result.status === "fulfilled");

      if (!hasFulfilledRequest) {
        throw new AppError("UPSTREAM_IMDB_ERROR", "Сервис временно недоступен", 502);
      }

      const deduped = new Map<string, ImdbSearchCandidate>();
      for (const candidate of fulfilled) {
        if (!deduped.has(candidate.id)) {
          deduped.set(candidate.id, candidate);
        }
      }

      return [...deduped.values()];
    },
    async getDetails(imdbId: string) {
      const payload = await requestJson<unknown>(`${baseUrl}/${imdbId}`);
      return normalizeDetails(payload, imdbId);
    },
    async getRating(imdbId: string) {
      const payload = await requestJson<unknown>(`${baseUrl}/${imdbId}/rating`);
      return parseRating(payload);
    }
  };
}
