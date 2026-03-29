import { describe, expect, it } from "vitest";
import {
  buildGeminiPrompt,
  buildSearchQueryVariantsPrompt,
  parseGeminiTextPayload,
  parseSearchQueryVariantsPayload
} from "../../src/lib/gemini/prompt";

describe("buildGeminiPrompt", () => {
  it("includes the movie title and asks for russian json", () => {
    const prompt = buildGeminiPrompt({
      id: "tt0133093",
      title: "The Matrix",
      originalTitle: "The Matrix",
      year: 1999,
      rating: 8.7,
      votes: 2100000,
      plot: "A hacker learns the true nature of reality.",
      url: "https://www.imdb.com/title/tt0133093/",
      genres: ["Action", "Sci-Fi"]
    });

    expect(prompt).toContain("The Matrix");
    expect(prompt).toContain("русском языке");
    expect(prompt).toContain("\"verdict\"");
  });
});

describe("parseGeminiTextPayload", () => {
  it("extracts verdict and summary from json text", () => {
    const parsed = parseGeminiTextPayload(
      '{"verdict":"Стоит посмотреть","summary":"Высокий рейтинг и культовый сюжет говорят в пользу просмотра."}'
    );
    expect(parsed.verdict).toBe("Стоит посмотреть");
    expect(parsed.summary).toContain("культовый");
  });
});

describe("search query variants prompt helpers", () => {
  it("asks for json variants for imdb search", () => {
    const prompt = buildSearchQueryVariantsPrompt("Матрица");
    expect(prompt).toContain("IMDB");
    expect(prompt).toContain("\"queries\"");
    expect(prompt).toContain("Матрица");
  });

  it("extracts unique query variants from json text", () => {
    const parsed = parseSearchQueryVariantsPayload('{"queries":["The Matrix","Matrix","The Matrix"]}');
    expect(parsed.queries).toEqual(["The Matrix", "Matrix"]);
  });
});
