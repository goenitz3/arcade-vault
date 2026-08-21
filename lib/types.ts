export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: AccentColor;
  best: number;
  plays: string;
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

/** Sesión simulada: nombre en mayúsculas, máximo 10 caracteres. */
export type SessionUser = {
  name: string;
};

export type SavedScore = {
  game: Game["id"];
  score: number;
  name: string;
  at: number;
};

export type ScoreRecord = {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
};
