import { AppError } from "../errors";
import { createImdbClient } from "./client";
import { pickBestCandidate } from "./ranking";
import type { NormalizedMovie } from "./types";

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
    year: details.startYear ?? best.startYear ?? null,
    rating: rating.averageRating ?? details.averageRating ?? best.averageRating ?? null,
    votes: rating.numVotes ?? details.numVotes ?? best.numVotes ?? null,
    plot: details.description ?? best.description ?? null,
    url: details.url ?? `https://www.imdb.com/title/${details.id}/`,
    genres: details.genres ?? []
  };
}
