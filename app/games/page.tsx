import GameBrowser from "@/components/GameBrowser";
import { getGames } from "@/lib/games";

export default async function Games() {
  const games = await getGames();
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <GameBrowser games={games} />
    </div>
  );
}
