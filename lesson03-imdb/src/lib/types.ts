export type RecommendationSuccess = {
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
