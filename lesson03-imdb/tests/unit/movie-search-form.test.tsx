import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MovieSearchForm } from "../../src/components/movie-search-form";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("MovieSearchForm", () => {
  it("submits the title and renders the result card", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          movie: {
            id: "tt0133093",
            title: "The Matrix",
            originalTitle: "The Matrix",
            year: 1999,
            rating: 8.7,
            votes: 2100000,
            plot: "A hacker learns the true nature of reality.",
            url: "https://www.imdb.com/title/tt0133093/"
          },
          recommendation: {
            verdict: "Стоит посмотреть",
            summary: "Высокий рейтинг и культовый сюжет говорят в пользу просмотра."
          }
        }),
        { status: 200 }
      )
    );

    render(createElement(MovieSearchForm));

    await userEvent.type(screen.getByLabelText("Название фильма"), "Матрица");
    await userEvent.click(screen.getByRole("button", { name: "Получить рекомендацию" }));

    await waitFor(() => {
      expect(screen.getByText("Стоит посмотреть")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/recommend", expect.anything());
    expect(screen.getByRole("link", { name: "Открыть на IMDB" })).toHaveAttribute(
      "href",
      "https://www.imdb.com/title/tt0133093/"
    );
  });
});
