import { AppError } from "./errors";

export type MovieQueryInput = {
  query?: unknown;
};

export function normalizeMovieQuery(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseMovieQuery(input: unknown) {
  const query = typeof input === "object" && input !== null ? (input as MovieQueryInput).query : undefined;

  if (typeof query !== "string") {
    throw new AppError("VALIDATION_ERROR", "Введите название фильма", 400);
  }

  const normalized = normalizeMovieQuery(query);

  if (normalized.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Введите название фильма", 400);
  }

  return { query: normalized };
}
