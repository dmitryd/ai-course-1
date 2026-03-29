import { describe, expect, it } from "vitest";
import { AppError } from "../../src/lib/errors";
import { normalizeMovieQuery, parseMovieQuery } from "../../src/lib/validation";

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
