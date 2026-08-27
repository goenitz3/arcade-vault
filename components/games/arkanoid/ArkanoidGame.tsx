"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/types";
import { createEngine, type ArkanoidEngine, type EngineSnapshot } from "./engine";

const INITIAL_SNAPSHOT: EngineSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  state: "playing",
};

export default function ArkanoidGame({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
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
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snapshot.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Vidas</div>
            <div className="v">{snapshot.lives}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snapshot.level).padStart(2, "0")}</div>
          </div>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={800}
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
