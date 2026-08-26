"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/types";
import { createEngine, type EngineSnapshot, type TetrisEngine } from "./engine";

const INITIAL_SNAPSHOT: EngineSnapshot = {
  score: 0,
  lines: 0,
  level: 1,
  nextPiece: [],
  state: "playing",
};

export default function TetrisGame({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createEngine(canvas);
    engineRef.current = engine;
    const unsubscribe = engine.onChange(setSnapshot);
    engine.start();

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="av-player fade-in">
      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={300}
            height={600}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
