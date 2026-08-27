export const GAMES_WITH_ENGINE = ["asteroids", "tetris", "arkanoid"] as const;

export type GameWithEngineId = (typeof GAMES_WITH_ENGINE)[number];
