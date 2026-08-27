import type { ComponentType } from "react";
import type { Game } from "@/lib/types";
import AsteroidsGame from "./asteroids/AsteroidsGame";
import TetrisGame from "./tetris/TetrisGame";

export const ENGINE_COMPONENTS: Record<string, ComponentType<{ game: Game }>> = {
  asteroids: AsteroidsGame,
  tetris: TetrisGame,
};
