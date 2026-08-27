export const GAMES_WITH_ENGINE = ["asteroids", "tetris"] as const;

export type GameWithEngineId = (typeof GAMES_WITH_ENGINE)[number];
