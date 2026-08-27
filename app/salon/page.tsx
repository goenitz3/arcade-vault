import SalonHallOfFame from "@/components/SalonHallOfFame";
import { GAMES_WITH_ENGINE } from "@/lib/games-with-engine";
import { getGames } from "@/lib/games";
import { topScores } from "@/lib/scores-supabase-server";
import type { ScoreRow } from "@/lib/types";

export default async function HallOfFamePage() {
  const [games, scoresByGame] = await Promise.all([
    getGames(),
    Promise.all(GAMES_WITH_ENGINE.map((id) => topScores(id, 12))),
  ]);

  const realScores: Record<string, ScoreRow[]> = {};
  GAMES_WITH_ENGINE.forEach((id, i) => {
    realScores[id] = scoresByGame[i];
  });

  return <SalonHallOfFame games={games} realScores={realScores} />;
}
