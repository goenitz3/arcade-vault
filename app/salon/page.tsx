import SalonHallOfFame from "@/components/SalonHallOfFame";
import { getGames } from "@/lib/games";
import { topAsteroidsScores } from "@/lib/scores-supabase-server";

export default async function HallOfFamePage() {
  const [games, asteroidsScores] = await Promise.all([
    getGames(),
    topAsteroidsScores(12),
  ]);
  return <SalonHallOfFame games={games} asteroidsScores={asteroidsScores} />;
}
