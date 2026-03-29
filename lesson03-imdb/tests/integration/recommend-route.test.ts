import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/recommend/route";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  process.env.RAPIDAPI_KEY = "rapid";
  process.env.RAPIDAPI_HOST = "imdb236.p.rapidapi.com";
  process.env.GEMINI_API_KEY = "gemini";
  process.env.GEMINI_MODEL_ID = "gemini-3.1-flash-lite-preview";
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("POST /api/recommend", () => {
  it("returns a normalized recommendation payload for a successful movie lookup", async () => {
    let geminiCallCount = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/imdb/search?")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "tt0133093",
                primaryTitle: "The Matrix",
                originalTitle: "The Matrix",
                type: "movie",
                averageRating: 8.7,
                numVotes: 2100000,
                description: "A hacker learns the true nature of reality."
              }
            ]
          }),
          { status: 200 }
        );
      }

      if (url.endsWith("/api/imdb/tt0133093")) {
        return new Response(
          JSON.stringify({
            id: "tt0133093",
            url: "https://www.imdb.com/title/tt0133093/",
            primaryTitle: "The Matrix",
            originalTitle: "The Matrix",
            description: "A hacker learns the true nature of reality.",
            startYear: 1999,
            genres: ["Action", "Sci-Fi"]
          }),
          { status: 200 }
        );
      }

      if (url.endsWith("/api/imdb/tt0133093/rating")) {
        return new Response(JSON.stringify({ averageRating: 8.7, numVotes: 2100000 }), { status: 200 });
      }

      if (url.includes("generateContent")) {
        geminiCallCount += 1;

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text:
                        geminiCallCount === 1
                          ? JSON.stringify({
                              verdict: "Стоит посмотреть",
                              summary: "Высокий рейтинг и культовый сюжет говорят в пользу просмотра."
                            })
                          : JSON.stringify({
                              verdict: "Стоит посмотреть",
                              summary: "Высокий рейтинг и культовый сюжет говорят в пользу просмотра."
                            })
                    }
                  ]
                }
              }
            ]
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unhandled fetch URL in test: ${url}`);
    });

    const response = await POST(
      new Request("http://localhost:3000/api/recommend", {
        method: "POST",
        body: JSON.stringify({ query: "The Matrix" })
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.movie.title).toBe("The Matrix");
    expect(payload.recommendation.verdict).toBe("Стоит посмотреть");
    expect(payload.movie.url).toBe("https://www.imdb.com/title/tt0133093/");
  });
});
