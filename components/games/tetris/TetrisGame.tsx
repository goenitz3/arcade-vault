"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveScore } from "@/lib/scores-supabase";
import { useSession } from "@/lib/session";
import type { Game } from "@/lib/types";
import { COLORS, createEngine, type EngineSnapshot, type TetrisEngine, type TetrisTheme } from "./engine";

const THEME_STORAGE_KEY = "tetris-theme";

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
  const { user } = useSession();

  // El nombre editado por el jugador tiene prioridad; si no ha tocado el campo
  // se usa la sesión, que aparece tras hidratar.
  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? user?.name ?? "INVITADO";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<TetrisTheme>("dark");

  const over = snapshot.state === "gameover";

  const restart = () => {
    setPaused(false);
    setSaved(false);
    engineRef.current?.start();
  };

  const toggleTheme = () => {
    const next: TetrisTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    engineRef.current?.setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createEngine(canvas);
    engineRef.current = engine;
    const unsubscribe = engine.onChange(setSnapshot);

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme: TetrisTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    engine.setTheme(initialTheme);

    engine.start();

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className={"av-player fade-in" + (theme === "light" ? " tetris-light" : "")}>
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
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
          <button className="btn ghost" onClick={toggleTheme}>
            {theme === "light" ? "☀ DARK" : "☾ LIGHT"}
          </button>
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

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{snapshot.score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setEditedName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Nombre para la puntuación"
                />
                <button
                  className="btn yellow"
                  onClick={async () => {
                    await saveScore({ gameId: "tetris", playerName: name, score: snapshot.score });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link className="btn magenta" href="/games">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
