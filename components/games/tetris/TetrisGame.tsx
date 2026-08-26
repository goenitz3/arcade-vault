"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/types";
import { COLORS, createEngine, type EngineSnapshot, type TetrisEngine } from "./engine";

const INITIAL_SNAPSHOT: EngineSnapshot = {
  score: 0,
  lines: 0,
  level: 1,
  nextPiece: [],
  state: "playing",
};

function NextPiecePreview({ shape }: { shape: number[][] }) {
  const size = shape.length;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size || 1}, 20px)`,
        gridTemplateRows: `repeat(${size || 1}, 20px)`,
        gap: 2,
      }}
    >
      {shape.flatMap((row, r) =>
        row.map((value, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: 20,
              height: 20,
              background: value ? COLORS[value] : "transparent",
              borderRadius: 2,
            }}
          />
        ))
      )}
    </div>
  );
}

export default function TetrisGame({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT);
  const [paused, setPaused] = useState(false);

  const over = snapshot.state === "gameover";

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
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              INVITADO
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snapshot.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Líneas</div>
            <div className="v">{snapshot.lines}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snapshot.level).padStart(2, "0")}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Siguiente</div>
            <NextPiecePreview shape={snapshot.nextPiece} />
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={() => {
              const engine = engineRef.current;
              if (!engine) return;
              if (paused) {
                engine.resume();
                setPaused(false);
              } else {
                engine.pause();
                setPaused(true);
              }
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            onClick={() => engineRef.current?.forceGameOver()}
          >
            FIN
          </button>
          <Link className="btn ghost" href={`/juegos/${game.id}`}>
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={300}
            height={600}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
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
