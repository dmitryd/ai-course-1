import type { ImdbSearchCandidate } from "./types";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textMatchScore(query: string, candidate: ImdbSearchCandidate) {
  const normalizedQuery = normalizeText(query);
  const primary = normalizeText(candidate.primaryTitle);
  const original = normalizeText(candidate.originalTitle ?? "");

  if (primary === normalizedQuery || original === normalizedQuery) {
    return 1000;
  }

  if (primary.startsWith(normalizedQuery) || original.startsWith(normalizedQuery)) {
    return 700;
  }

  if (primary.includes(normalizedQuery) || original.includes(normalizedQuery)) {
    return 400;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => primary.includes(token) || original.includes(token))) {
    return 250;
  }

  return 0;
}

function typeScore(type?: string | null) {
  switch (type) {
    case "movie":
      return 350;
    case "tvMovie":
      return 120;
    case "documentary":
      return -220;
    case "short":
      return -260;
    case "tvEpisode":
      return -320;
    case "tvSeries":
      return -280;
    default:
      return 0;
  }
}

function popularityScore(candidate: ImdbSearchCandidate) {
  const votes = Math.log10((candidate.numVotes ?? 0) + 1) * 48;
  const rating = (candidate.averageRating ?? 0) * 14;
  const year = candidate.startYear ? Math.max(0, candidate.startYear - 1900) / 10 : 0;
  return votes + rating + year;
}

function formatPenalty(candidate: ImdbSearchCandidate) {
  const description = candidate.description ?? "";
  if (/documentary|making of|behind the scenes|tv series|episode/i.test(description)) {
    return -180;
  }
  return 0;
}

export function scoreCandidate(query: string, candidate: ImdbSearchCandidate) {
  return (
    textMatchScore(query, candidate) +
    typeScore(candidate.type) +
    popularityScore(candidate) +
    formatPenalty(candidate)
  );
}

export function pickBestCandidate(query: string, candidates: ImdbSearchCandidate[]) {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates]
    .map((candidate) => ({ candidate, score: scoreCandidate(query, candidate) }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightVotes = right.candidate.numVotes ?? 0;
      const leftVotes = left.candidate.numVotes ?? 0;
      if (rightVotes !== leftVotes) {
        return rightVotes - leftVotes;
      }

      const rightRating = right.candidate.averageRating ?? 0;
      const leftRating = left.candidate.averageRating ?? 0;
      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      const rightYear = right.candidate.startYear ?? 0;
      const leftYear = left.candidate.startYear ?? 0;
      if (rightYear !== leftYear) {
        return rightYear - leftYear;
      }

      return left.candidate.id.localeCompare(right.candidate.id);
    })[0].candidate;
}
