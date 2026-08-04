import Link from "next/link";
import type { Game } from "@/lib/types";

export default function GamePreviewRail({ games }: { games: Game[] }) {
  return (
    <div className="mini-rail">
      {games.map((game) => (
        <Link key={game.id} className="mini-card" href={`/juegos/${game.id}`}>
          <div className="mini-cover">
            <div className={"cover-bg " + game.cover} />
          </div>
          <div className="mini-meta">
            <div className="mini-title">{game.title}</div>
            <div className="mini-cat">{game.cat}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
