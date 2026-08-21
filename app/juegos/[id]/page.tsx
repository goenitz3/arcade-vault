import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";
import { getGame, getGames } from "@/lib/games";
import { detailScores } from "@/lib/scores";
import { topAsteroidsScores } from "@/lib/scores-supabase-server";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/juegos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return { title: "Juego no encontrado · Arcade Vault" };
  return {
    title: `${game.title} · Arcade Vault`,
    description: game.short,
  };
}

export default async function GameDetailPage({
  params,
}: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const scores =
    game.id === "asteroids" ? await topAsteroidsScores(10) : detailScores(game.id);

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn xl pulse" href={`/juegos/${game.id}/jugar`}>
              ▶ JUGAR AHORA
            </Link>
            <Link className="btn ghost lg" href="/games">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        {game.id === "asteroids" && scores.length === 0 ? (
          <div className="leaderboard">
            <h3>MEJORES PUNTUACIONES</h3>
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div
                className="pixel"
                style={{ fontSize: 12, color: "var(--magenta)", marginBottom: 10 }}
              >
                AÚN SIN PUNTUACIONES
              </div>
              <div>Sé el primero en aparecer aquí.</div>
            </div>
          </div>
        ) : (
          <Leaderboard rows={scores} />
        )}
      </aside>
    </div>
  );
}
