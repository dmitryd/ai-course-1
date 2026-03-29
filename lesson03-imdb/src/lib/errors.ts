export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "MOVIE_NOT_FOUND"
  | "UPSTREAM_IMDB_ERROR"
  | "UPSTREAM_GEMINI_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}
