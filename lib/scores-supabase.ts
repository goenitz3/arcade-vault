import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { ScoreRecord, ScoreRow } from "@/lib/types";

const ASTEROIDS_GAME_ID = "asteroids";

export async function saveAsteroidsScore(entry: {
  playerName: string;
  score: number;
}): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.from("scores").insert({
    game_id: ASTEROIDS_GAME_ID,
    player_name: entry.playerName,
    score: entry.score,
  });
  if (error) throw error;
}

export async function topAsteroidsScores(limit: number): Promise<ScoreRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", ASTEROIDS_GAME_ID)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data as ScoreRecord[]).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));
}
