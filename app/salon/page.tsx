import SalonHallOfFame from "@/components/SalonHallOfFame";
import { getGames } from "@/lib/games";

export default async function HallOfFamePage() {
  const games = await getGames();
  return <SalonHallOfFame games={games} />;
}
