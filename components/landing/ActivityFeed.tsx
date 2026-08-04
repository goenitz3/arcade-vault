import Link from "next/link";
import type { ActivityRow } from "@/lib/scores";
import type { ScoreRow } from "@/lib/types";

export default function ActivityFeed({
  activity,
  topPlayers,
}: {
  activity: ActivityRow[];
  topPlayers: ScoreRow[];
}) {
  return (
    <div className="activity-grid">
      <div className="activity-card">
        <div className="ac-head">
          <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
          <div className="live-led">
            <span />
            EN VIVO
          </div>
        </div>
        <div className="ticker">
          {activity.map((row, i) => (
            <div
              key={i}
              className="tick-row"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={`tk-p neon-${row.color}`}>{row.player}</span>
              <span className="tk-mid">▸ {row.game}</span>
              <span className="tk-s">+{row.score.toLocaleString("es-ES")}</span>
              <span className="tk-t">hace {row.minutesAgo} min</span>
            </div>
          ))}
        </div>
      </div>

      <div className="activity-card">
        <div className="ac-head">
          <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES · HOY</div>
          <Link className="lb-link" href="/salon">
            VER SALÓN →
          </Link>
        </div>
        <div className="top-list">
          {topPlayers.map((row, i) => (
            <div
              key={row.rank}
              className={
                "top-row" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
            >
              <span className="tp-rk">#{String(row.rank).padStart(2, "0")}</span>
              <span className="tp-p">{row.name}</span>
              <span className="tp-s">{row.score.toLocaleString("es-ES")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
