export const GAMES_WITH_ENGINE = ["asteroids", "tetris", "arkanoid", "snake"] as const;

export type GameWithEngineId = (typeof GAMES_WITH_ENGINE)[number];
