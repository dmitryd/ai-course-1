export type ImdbSearchCandidate = {
  id: string;
  primaryTitle: string;
  originalTitle?: string | null;
  type?: string | null;
  startYear?: number | null;
  averageRating?: number | null;
  numVotes?: number | null;
  description?: string | null;
};

export type ImdbDetails = {
  id: string;
  url?: string | null;
  primaryTitle: string;
  originalTitle?: string | null;
  description?: string | null;
  startYear?: number | null;
  genres?: string[] | null;
  averageRating?: number | null;
  numVotes?: number | null;
};

export type NormalizedMovie = {
  id: string;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  rating?: number | null;
  votes?: number | null;
  plot?: string | null;
  url: string;
  genres: string[];
};
