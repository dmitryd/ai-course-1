"use client";

import { useState } from "react";
import { MovieResultCard } from "./movie-result-card";
import type { RecommendationError, RecommendationSuccess } from "../lib/types";
import type { FormEvent } from "react";

export function MovieSearchForm() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationSuccess | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setError("Введите название фильма");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: trimmed })
      });

      const payload = (await response.json()) as RecommendationSuccess | RecommendationError;

      if (!response.ok) {
        setResult(null);
        setError("error" in payload ? payload.error.message : "Произошла внутренняя ошибка");
        return;
      }

      setResult(payload as RecommendationSuccess);
      setError(null);
    } catch {
      setResult(null);
      setError("Сервис временно недоступен");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 24,
          display: "grid",
          gap: 12,
          padding: 24,
          borderRadius: 28,
          background: "rgba(255,255,255,0.84)",
          border: "1px solid rgba(92, 82, 64, 0.16)",
          boxShadow: "0 18px 50px rgba(91, 66, 26, 0.08)"
        }}
      >
        <label htmlFor="movie-title" style={{ fontWeight: 700 }}>
          Название фильма
        </label>
        <input
          id="movie-title"
          name="movie-title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например, Матрица"
          autoComplete="off"
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            border: "1px solid rgba(92, 82, 64, 0.22)",
            background: "#fffdf8",
            color: "#1f1a12",
            fontSize: 16
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "14px 18px",
            borderRadius: 999,
            border: "none",
            background: isLoading ? "#8b8b8b" : "linear-gradient(135deg, #6b460e 0%, #8b5e1a 100%)",
            color: "white",
            cursor: isLoading ? "wait" : "pointer",
            fontWeight: 700,
            boxShadow: "0 10px 20px rgba(107, 70, 14, 0.22)"
          }}
        >
          {isLoading ? "Ищем фильм..." : "Получить рекомендацию"}
        </button>
      </form>

      {error ? (
        <p role="alert" style={{ color: "#8f3124", marginTop: 16, fontWeight: 700 }}>
          {error}
        </p>
      ) : null}

      {result ? <MovieResultCard payload={result} /> : null}
    </>
  );
}
