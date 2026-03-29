import { MovieSearchForm } from "../components/movie-search-form";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 20px 72px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.65), transparent 35%), radial-gradient(circle at 80% 10%, rgba(139,94,26,0.12), transparent 28%)"
        }}
      />
      <section
        style={{
          position: "relative",
          maxWidth: 960,
          margin: "0 auto",
          padding: 0
        }}
      >
        <div
          style={{
            padding: "28px 32px",
            borderRadius: 32,
            border: "1px solid rgba(92, 82, 64, 0.16)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,249,240,0.78) 100%)",
            boxShadow: "0 24px 60px rgba(91, 66, 26, 0.12)"
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8b5e1a",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: 12,
              fontWeight: 700
            }}
          >
            IMDB Movie Advisor
          </p>
          <h1 style={{ margin: "12px 0 12px", fontSize: 44, lineHeight: 1.05 }}>
            Спроси, стоит ли смотреть фильм
          </h1>
          <p style={{ margin: 0, color: "#5c5240", fontSize: 18, lineHeight: 1.6 }}>
            Введите название фильма. Сервис найдёт наиболее подходящий популярный фильм из IMDB,
            отправит данные в Gemini и вернёт короткий совет на русском языке.
          </p>
          <MovieSearchForm />
        </div>
      </section>
    </main>
  );
}
