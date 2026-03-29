import type { RecommendationSuccess } from "../lib/types";

type MovieResultCardProps = {
  payload: RecommendationSuccess;
};

function formatField(value: string | number | null | undefined) {
  return value ?? "нет данных";
}

export function MovieResultCard({ payload }: MovieResultCardProps) {
  const { movie, recommendation } = payload;

  return (
    <article
      style={{
        marginTop: 24,
        padding: 24,
        borderRadius: 28,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,248,236,0.94) 100%)",
        border: "1px solid rgba(92, 82, 64, 0.16)",
        boxShadow: "0 18px 50px rgba(91, 66, 26, 0.12)"
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "baseline" }}>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(139, 94, 26, 0.12)",
            color: "#6b460e",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          Вердикт
        </span>
        <h2 style={{ margin: 0, fontSize: 28 }}>{recommendation.verdict}</h2>
      </div>

      <p style={{ marginTop: 12, color: "#5c5240", lineHeight: 1.6 }}>{recommendation.summary}</p>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          gap: "10px 16px",
          margin: "20px 0 0",
          color: "#1f1a12"
        }}
      >
        <dt style={{ color: "#5c5240" }}>Название</dt>
        <dd style={{ margin: 0 }}>{movie.title}</dd>
        <dt style={{ color: "#5c5240" }}>Оригинал</dt>
        <dd style={{ margin: 0 }}>{formatField(movie.originalTitle)}</dd>
        <dt style={{ color: "#5c5240" }}>Год</dt>
        <dd style={{ margin: 0 }}>{formatField(movie.year)}</dd>
        <dt style={{ color: "#5c5240" }}>Рейтинг IMDB</dt>
        <dd style={{ margin: 0 }}>{formatField(movie.rating)}</dd>
        <dt style={{ color: "#5c5240" }}>Голосов</dt>
        <dd style={{ margin: 0 }}>{formatField(movie.votes)}</dd>
      </dl>

      {movie.plot ? (
        <p style={{ marginTop: 20, color: "#463d2f", lineHeight: 1.6 }}>
          <strong>Описание:</strong> {movie.plot}
        </p>
      ) : null}

      <a
        href={movie.url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          marginTop: 12,
          padding: "12px 16px",
          borderRadius: 999,
          background: "#6b460e",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 700
        }}
      >
        Открыть на IMDB
      </a>
    </article>
  );
}
