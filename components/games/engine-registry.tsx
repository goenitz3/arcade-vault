import type { ComponentType } from "react";
import type { Game } from "@/lib/types";
import AsteroidsGame from "./asteroids/AsteroidsGame";
import ArkanoidGame from "./arkanoid/ArkanoidGame";
import SnakeGame from "./snake/SnakeGame";
import TetrisGame from "./tetris/TetrisGame";

export const ENGINE_COMPONENTS: Record<string, ComponentType<{ game: Game }>> = {
  asteroids: AsteroidsGame,
  tetris: TetrisGame,
  arkanoid: ArkanoidGame,
  snake: SnakeGame,
};
