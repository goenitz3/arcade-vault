import { createClient } from "@/lib/supabase/client";

const ASTEROIDS_GAME_ID = "asteroids";

export async function saveAsteroidsScore(entry: {
  playerName: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_id: ASTEROIDS_GAME_ID,
    player_name: entry.playerName,
    score: entry.score,
  });
  if (error) throw error;
}
