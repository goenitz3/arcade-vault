"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveScore } from "@/lib/scores-supabase";
import { useSession } from "@/lib/session";
import type { Game } from "@/lib/types";
import { createEngine, type ArkanoidEngine, type EngineSnapshot } from "./engine";

const INITIAL_SNAPSHOT: EngineSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  state: "playing",
};

const LEVEL_COUNT = 5;

export default function ArkanoidGame({ game }: { game: Game }) {
  const { user } = useSession();

  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? user?.name ?? "INVITADO";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);

  const over = snapshot.state === "gameover" || snapshot.state === "win";

  const restart = () => {
    setPaused(false);
    setSaved(false);
    engineRef.current?.start();
  };

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
              {name}
            </div>
          </div>
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
          <button className="btn magenta" onClick={() => engineRef.current?.forceGameOver()}>
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
            width={800}
            height={600}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
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
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-dim)",
                    marginTop: 18,
                    letterSpacing: "0.16em",
                  }}
                >
                  SALTAR A NIVEL
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
                  {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      className={"chip" + (n === snapshot.level ? " active" : "")}
                      onClick={() => engineRef.current?.jumpToLevel(n)}
                    >
                      {n}
                    </button>
                  ))}
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
            <h2>{snapshot.state === "win" ? "¡COMPLETASTE EL JUEGO!" : "FIN DEL JUEGO"}</h2>
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
                    await saveScore({ gameId: "arkanoid", playerName: name, score: snapshot.score });
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
