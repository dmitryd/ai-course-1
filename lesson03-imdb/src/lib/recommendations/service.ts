import { AppError } from "../errors";
import { getGeminiRecommendation, getSearchQueryVariants } from "../gemini/client";
import { findBestMovie } from "../imdb/service";

async function findMovieWithFallback(query: string, fetchImpl: typeof fetch = fetch) {
  try {
    return await findBestMovie(query, fetchImpl);
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== "MOVIE_NOT_FOUND") {
      throw error;
    }

    let variants: string[] = [];

    try {
      variants = await getSearchQueryVariants(query, fetchImpl);
    } catch {
      throw error;
    }

    for (const variant of variants) {
      if (variant.toLowerCase() === query.toLowerCase()) {
        continue;
      }

      try {
        return await findBestMovie(variant, fetchImpl);
      } catch (variantError) {
        if (variantError instanceof AppError && variantError.code === "MOVIE_NOT_FOUND") {
          continue;
        }

        throw variantError;
      }
    }

    throw error;
  }
}

export async function getMovieRecommendation(query: string, fetchImpl: typeof fetch = fetch) {
  const movie = await findMovieWithFallback(query, fetchImpl);
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
