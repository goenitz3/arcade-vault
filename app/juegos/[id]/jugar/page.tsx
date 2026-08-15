import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AsteroidsGame from "@/components/games/asteroids/AsteroidsGame";
import GamePlayer from "@/components/GamePlayer";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return { title: "Juego no encontrado · Arcade Vault" };
  return { title: `Jugando a ${game.title} · Arcade Vault` };
}

export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  if (game.id === "asteroids") return <AsteroidsGame game={game} />;
  return <GamePlayer game={game} />;
}
