import { createClient } from "@/lib/supabase/client";

export async function saveScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_id: entry.gameId,
    player_name: entry.playerName,
    score: entry.score,
  });
  if (error) throw error;
}
