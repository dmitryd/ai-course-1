import { describe, expect, it } from "vitest";
import { pickBestCandidate } from "../../src/lib/imdb/ranking";
import type { ImdbSearchCandidate } from "../../src/lib/imdb/types";

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
