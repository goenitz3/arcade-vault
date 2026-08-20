import { createClient } from "@/lib/supabase/server";
import type { ScoreRecord, ScoreRow } from "@/lib/types";

const ASTEROIDS_GAME_ID = "asteroids";

export async function topAsteroidsScores(limit: number): Promise<ScoreRow[]> {
  const supabase = await createClient();
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
