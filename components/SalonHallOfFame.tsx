"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GAMES_WITH_ENGINE } from "@/lib/games-with-engine";
import { hallScores } from "@/lib/scores";
import { useSession } from "@/lib/session";
import type { Game, ScoreRow } from "@/lib/types";

/** Clase de destaque para los tres primeros puestos. */
function topClass(index: number): string {
  if (index === 0) return " top1";
  if (index === 1) return " top2";
  if (index === 2) return " top3";
  return "";
}

export default function SalonHallOfFame({
  games,
  realScores,
}: {
  games: Game[];
  realScores: Record<string, ScoreRow[]>;
}) {
  const { user } = useSession();
  const [tab, setTab] = useState(games[0].id);

  const hasEngine = (GAMES_WITH_ENGINE as readonly string[]).includes(tab);
  const simulatedRows = useMemo(() => hallScores(tab), [tab]);
  const rows = hasEngine ? realScores[tab] : simulatedRows;
  const game = games.find((g) => g.id === tab)!;
  const empty = hasEngine && rows.length === 0;

  // Marca decorativa del jugador: la spec deja fuera integrar av_scores aquí.
  const youRank = 8 + (tab.length % 4);
  const youScore = rows.length > 5 ? rows[5].score - 2400 : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="hall-empty" style={{ textAlign: "center", padding: 80 }}>
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            AÚN SIN PUNTUACIONES
          </div>
          <div>Sé el primero en aparecer aquí.</div>
        </div>
      ) : (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            {rows[0] && (
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
                >
                  CAMPEÓN
                </div>
                <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                  01
                </div>
                <div className="name">{rows[0].name}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {rows[0].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[0].date}</div>
              </div>
            )}
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${r.rank}-${r.name}`}
                className={"tr" + topClass(i)}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {user && youScore !== null && (
              <>
                <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(youRank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {user.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {youScore.toLocaleString("es-ES")}
                  </div>
                  <div className="dt">11/05/2026</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/games">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
