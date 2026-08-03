import type { ScoreRow } from "@/lib/types";

/** Clase de destaque para los tres primeros puestos. */
function topClass(index: number): string {
  if (index === 0) return " top1";
  if (index === 1) return " top2";
  if (index === 2) return " top3";
  return "";
}

export default function Leaderboard({
  rows,
  title = "MEJORES PUNTUACIONES",
}: {
  rows: ScoreRow[];
  title?: string;
}) {
  return (
    <div className="leaderboard">
      <h3>{title}</h3>
      {rows.map((r, i) => (
        <div key={`${r.rank}-${r.name}`} className={"lb-row" + topClass(i)}>
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
